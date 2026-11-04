# CERBERUS-ARM: Kinematics, Jacobian & Singularity Avoidance

This document outlines the mathematical foundation governing the motion, differential geometry, and singularity avoidance mechanics of the 2-DOF articulated planar manipulator in CERBERUS-ARM.

---

## 📐 1. Manipulator Geometry & Forward Kinematics (FK)

The manipulator consists of two revolute joints ($RR$) operating in a 2D horizontal plane:
- **Base Joint ($\theta_1$)**: Anchored at origin $(0, 0)$.
- **Elbow Joint ($\theta_2$)**: Connects Link 1 to Link 2.
- **Link Lengths**: $L_1 = 1.0\text{ m}$, $L_2 = 0.8\text{ m}$.
- **Maximum Reachable Envelope**: $R_{max} = L_1 + L_2 = 1.8\text{ m}$.
- **Minimum Inner Envelope**: $R_{min} = |L_1 - L_2| = 0.2\text{ m}$.

### Forward Kinematics Equations
Given joint coordinates $q = (\theta_1, \theta_2)^T$:

$$\begin{aligned}
x_{elbow} &= L_1 \cos(\theta_1) \\
y_{elbow} &= L_1 \sin(\theta_1) \\
x_{ee} &= L_1 \cos(\theta_1) + L_2 \cos(\theta_1 + \theta_2) \\
y_{ee} &= L_1 \sin(\theta_1) + L_2 \sin(\theta_1 + \theta_2)
\end{aligned}$$

---

## 🔄 2. Analytical Inverse Kinematics (IK)

Given a target end-effector coordinate $(x, y) \in \mathbb{R}^2$ within the workspace:

### Distance from Base
$$D = \sqrt{x^2 + y^2}$$

Target reachability requires $R_{min} \le D \le R_{max}$.

### Elbow Joint Angle ($\theta_2$)
By the Law of Cosines:
$$\cos(\theta_2) = \frac{x^2 + y^2 - L_1^2 - L_2^2}{2 L_1 L_2}$$

For physically reachable coordinates:
$$\theta_2 = \text{atan2}\left(\pm \sqrt{1 - \cos^2(\theta_2)},\, \cos(\theta_2)\right)$$

Where positive sign yields the **elbow-down** configuration and negative sign yields the **elbow-up** configuration.

### Shoulder Joint Angle ($\theta_1$)
$$\theta_1 = \text{atan2}(y, x) - \text{atan2}\left(L_2 \sin(\theta_2),\, L_1 + L_2 \cos(\theta_2)\right)$$

---

## ⚡ 3. Differential Kinematics & The Jacobian Matrix

The manipulator Jacobian $J(q) \in \mathbb{R}^{2 \times 2}$ maps joint angular velocities $\dot{q} = (\dot{\theta}_1, \dot{\theta}_2)^T$ to Cartesian end-effector velocities $\dot{x}_{ee} = (\dot{x}, \dot{y})^T$:

$$\dot{x}_{ee} = J(q) \dot{q}$$

$$J(q) = \begin{bmatrix}
\frac{\partial x_{ee}}{\partial \theta_1} & \frac{\partial x_{ee}}{\partial \theta_2} \\
\frac{\partial y_{ee}}{\partial \theta_1} & \frac{\partial y_{ee}}{\partial \theta_2}
\end{bmatrix} = \begin{bmatrix}
-L_1 \sin(\theta_1) - L_2 \sin(\theta_1 + \theta_2) & -L_2 \sin(\theta_1 + \theta_2) \\
L_1 \cos(\theta_1) + L_2 \cos(\theta_1 + \theta_2) & L_2 \cos(\theta_1 + \theta_2)
\end{bmatrix}$$

---

## 🎯 4. Yoshikawa Manipulability & Singularity Analysis

### Manipulability Measure
Tsuneo Yoshikawa's scalar manipulability index $w(q)$ characterizes the volume of the velocity ellipsoid in Cartesian space:

$$w(q) = \sqrt{\det\left(J(q) J(q)^T\right)}$$

For our 2-DOF planar geometry, the determinant simplifies analytically to:

$$\det(J) = -L_1 L_2 \sin(\theta_1)\cos(\theta_1 + \theta_2) + L_1 L_2 \cos(\theta_1)\sin(\theta_1 + \theta_2) = L_1 L_2 \sin(\theta_2)$$

$$w(q) = |L_1 L_2 \sin(\theta_2)|$$

### Singularity Configurations
The manipulator loses one degree of freedom when $\det(J) = 0$, occurring under two geometric conditions:

1. **Boundary Singularity ($\theta_2 = 0^\circ$ or $0\text{ rad}$)**:
   - Arm is fully extended ($D = 1.8\text{ m}$).
   - Radial velocity is impossible; the Jacobian is rank-deficient ($\text{rank}(J) = 1$).
2. **Folded Singularity ($\theta_2 = 180^\circ$ or $\pi\text{ rad}$)**:
   - Arm is fully folded onto itself ($D = 0.2\text{ m}$).

### DRL Singularity Penalty
In CERBERUS-ARM, the reinforcement learning reward function penalizes proximity to singular configurations:
$$R_{singularity} = \begin{cases} -1.0 & \text{if } w(q) < 0.05 \\ 0 & \text{otherwise} \end{cases}$$

This incentives the policy to maintain joint postures with high kinematic flexibility.

---

## 🛡️ 5. Line-Segment Hazard Collision Testing

The workspace features a cylindrical hazard pillar centered at $(x_c, y_c)$ with radius $R_{obs} = 0.22\text{ m}$.

To check whether a link segment from $P_1$ to $P_2$ intersects the pillar:
1. Parametrize the link: $P(t) = P_1 + t (P_2 - P_1)$ for $t \in [0, 1]$.
2. The projection parameter $t^*$ of the obstacle center $C$ onto the segment is:
   $$t^* = \text{clamp}\left(\frac{(C - P_1) \cdot (P_2 - P_1)}{\|P_2 - P_1\|^2},\, 0,\, 1\right)$$
3. The minimum Euclidean distance from the obstacle center to the link is:
   $$d_{min} = \|C - P(t^*)\|$$
4. Collision occurs if $d_{min} \le R_{obs} + \delta$, where $\delta$ is the link structural cross-section radius ($0.04\text{ m}$).
