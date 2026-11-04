# CERBERUS-ARM: Head 2 — DRL via Dueling Double-DQN & Hindsight Experience Replay (HER)

This document formalizes the reinforcement learning formulation powering **Head 2 (The Muscle)** in CERBERUS-ARM, detailing the state/action spaces, dueling value decomposition, double-Q target evaluation, and hindsight goal relabeling.

---

## 🌐 1. Markov Decision Process (MDP) Definition

The robotic manipulation problem is formulated as a Goal-Conditioned Markov Decision Process $\langle \mathcal{S}, \mathcal{A}, \mathcal{P}, \mathcal{R}, \gamma, \mathcal{G} \rangle$:

### State Space $\mathcal{S} \subset \mathbb{R}^{18}$ (3-DOF Articulated Manipulator)
At each timestep $t$, the state vector $s_t$ encapsulates 3-DOF kinematics, orientation, dynamics, and environmental geometry:

| Index | Feature | Range | Description |
| :---: | :--- | :---: | :--- |
| `0` | $\theta_1 / \pi$ | $[-0.25, 1.17]$ | Shoulder joint angle normalized by $\pi$ |
| `1` | $\theta_2 / \pi$ | $[0.03, 0.92]$ | Elbow joint angle normalized by $\pi$ |
| `2` | $\theta_3 / \pi$ | $[-0.67, 0.67]$ | Wrist joint pitch normalized by $\pi$ |
| `3` | $(\theta_1 - \theta_{1, prev}) / \Delta\theta$ | $[-1.0, 1.0]$ | Shoulder joint angular velocity |
| `4` | $(\theta_2 - \theta_{2, prev}) / \Delta\theta$ | $[-1.0, 1.0]$ | Elbow joint angular velocity |
| `5` | $(\theta_3 - \theta_{3, prev}) / \Delta\theta$ | $[-1.0, 1.0]$ | Wrist joint angular velocity |
| `6` | $x_{ee} / R_{max}$ | $[-1.0, 1.0]$ | End-effector Cartesian X |
| `7` | $y_{ee} / R_{max}$ | $[-1.0, 1.0]$ | End-effector Cartesian Y |
| `8` | $\phi / \pi = (\theta_1 + \theta_2 + \theta_3) / \pi$ | $[-1.0, 1.0]$ | End-effector tool heading orientation |
| `9` | $g_{state}$ | $\{0, 1\}$ | Gripper status (1: closed, 0: open) |
| `10` | $g_{has\_obj}$ | $\{0, 1\}$ | Object grasped indicator |
| `11` | $x_{obj} / R_{max}$ | $[-1.0, 1.0]$ | Target object Cartesian X |
| `12` | $y_{obj} / R_{max}$ | $[-1.0, 1.0]$ | Target object Cartesian Y |
| `13` | $x_{goal} / R_{max}$ | $[-1.0, 1.0]$ | Receptacle destination X |
| `14` | $y_{goal} / R_{max}$ | $[-1.0, 1.0]$ | Receptacle destination Y |
| `15` | $\min(d(ee, obj), 3.0)$ | $[0.0, 3.0]$ | Euclidean distance: End-effector to object |
| `16` | $\min(d(obj, goal), 3.0)$| $[0.0, 3.0]$ | Euclidean distance: Object to goal receptacle |
| `17` | $w(q) = \sqrt{\det(J J^T)}$ | $[0.0, 1.2]$ | Yoshikawa manipulability metric |

### Action Space $\mathcal{A} = \{0, 1, 2, 3, 4, 5, 6, 7, 8\}$ (9 Discrete Primitives)
- `0`: $\theta_1 \leftarrow \theta_1 + \Delta\theta$ (Shoulder +Yaw)
- `1`: $\theta_1 \leftarrow \theta_1 - \Delta\theta$ (Shoulder -Yaw)
- `2`: $\theta_2 \leftarrow \theta_2 + \Delta\theta$ (Elbow +Pitch)
- `3`: $\theta_2 \leftarrow \theta_2 - \Delta\theta$ (Elbow -Pitch)
- `4`: $\theta_3 \leftarrow \theta_3 + \Delta\theta$ (Wrist +Pitch)
- `5`: $\theta_3 \leftarrow \theta_3 - \Delta\theta$ (Wrist -Pitch)
- `6`: Toggle Gripper (Parallel Clamping Jaws)
- `7`: Micro-Align ($\theta_1 + 0.4\Delta\theta, \theta_2 - 0.4\Delta\theta, \theta_3 - 0.2\Delta\theta$)
- `8`: Hold / Idle

Step magnitude: $\Delta\theta = 4.0^\circ \approx 0.070\text{ rad}$.

---

## ⚡ 2. Dueling Architecture (Wang et al., ICML 2016)

Instead of directly outputting Q-values $Q(s, a)$, the network decouples state value representation $V(s)$ from the action advantage stream $A(s, a)$:

```
State Vector s_t [18]
         │
         ▼
Linear(18 → 256) + LayerNorm + ReLU
         │
         ▼
Linear(256 → 256) + ReLU
    ┌────┴────┐
    ▼         ▼
[Value Stream V(s)]     [Advantage Stream A(s, a)]
Linear(256 → 128)       Linear(256 → 128)
Linear(128 → 1)         Linear(128 → 9)
```
Linear(128 → 1)         Linear(128 → 7)
    └────┬────┘
         ▼
Aggregation: Q(s, a) = V(s) + [A(s, a) - mean_a'(A(s, a'))]
```

### Advantage Centering Formulation
Identifiability is preserved by subtracting the mean advantage across all actions:

$$Q(s, a; \theta, \alpha, \beta) = V(s; \theta, \beta) + \left( A(s, a; \theta, \alpha) - \frac{1}{|\mathcal{A}|} \sum_{a' \in \mathcal{A}} A(s, a'; \theta, \alpha) \right)$$

---

## 🎯 3. Double-DQN Target Computation (van Hasselt et al., AAAI 2016)

Standard DQN overestimates action-values due to the $\max$ operator. Double-DQN decouples **action selection** (performed by online network $\theta$) from **action evaluation** (performed by target network $\theta^-$):

$$a^* = \arg\max_{a' \in \mathcal{A}} Q(s_{t+1}, a'; \theta)$$

$$y_t = r_t + \gamma (1 - d_t) Q(s_{t+1}, a^*; \theta^-)$$

Where target weights are updated via soft Polyak averaging ($\tau = 0.005$):
$$\theta^- \leftarrow \tau \theta + (1 - \tau) \theta^-$$

---

## 🔄 4. Hindsight Experience Replay (HER, Andrychowicz et al., NeurIPS 2017)

Robotic pick-and-place tasks with sparse binary rewards suffer from extreme sample inefficiency: the agent rarely reaches the receptacle by random chance.

HER solves this by storing every completed episode with two complementary perspectives:
1. **Original Goal Transition**: Evaluated against the intended destination bin.
2. **Hindsight Virtual Goals**: Selects $k=4$ states achieved later in the same trajectory ($s_{t'}$ for $t' > t$) and substitutes them as the retroactive goal $g'$. 

Under the hindsight goal, the agent's failure to reach the target bin becomes an **intentional success** at reaching an intermediate waypoint:

$$r_{HER}(s_t, a_t, g') = \begin{cases} +1.0 & \text{if } \|x_{ee} - g'\|_2 < 0.18\text{ m} \\ -0.05 \|x_{ee} - g'\|_2 & \text{otherwise} \end{cases}$$

This guarantees a steady stream of positive reinforcement, accelerating policy convergence by over $10\times$.
