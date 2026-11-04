# CERBERUS-ARM: System Architecture & Tri-Modal Decoupling

CERBERUS-ARM is structured around a three-tier decoupled autonomy paradigm inspired by the legendary three-headed guardian. Traditional embodied AI systems often suffer from catastrophic entanglement: when vision fails, the controller crashes; when language hallucinates, actuators execute hazardous ungrounded trajectories. 

CERBERUS resolves this vulnerability by establishing strict formal contracts between **Perception (The Eye)**, **Control (The Muscle)**, and **Reasoning (The Brain)**, connected via an asynchronous telemetry bus and coordinated through a real-time **MuJoCo 3D physics digital twin**.

---

## 🏛️ High-Level System Topology

```mermaid
flowchart TD
    User["Operator Natural Language Prompt\n'Pick red cube into blue bin carefully'"] --> Head3["HEAD 3: THE BRAIN\nLocal Ollama (Llama 3.2) / Neuro-Symbolic Compiler"]
    
    subgraph BrainOutput ["Symbolic Specification & Modulation"]
        PDDL["PDDL Subgoals:\n(Target: crimson cube, Dest: blue_bin)"]
        Weights["Supervisory Reward Weights:\nlambda_collision=35.0, lambda_jerk=2.5"]
    end
    Head3 --> PDDL
    Head3 --> Weights

    Sensors["Simulated Workspace Camera / Sensors"] --> Head1["HEAD 1: THE EYE\nCoordConv Multi-Task CNN\n(1-Channel + CoordConv Layers)"]
    
    subgraph VisionOutput ["Perception Latents & Telemetry"]
        ClassPred["Classification Logits:\nShape & Color Probabilities"]
        Centroids["Continuous Normalized Coordinates:\n(x_hat, y_hat)"]
        GradCAM["Grad-CAM Attention Heatmaps\n(32x32 Downsampled Tensor)"]
    end
    Head1 --> ClassPred
    Head1 --> Centroids
    Head1 --> GradCAM

    PDDL --> Head2
    Weights --> MuJoCo
    Centroids --> Head2

    subgraph Manipulation ["HEAD 2: THE MUSCLE"]
        Head2["Goal-Conditioned Dueling Double-DQN + HER\nValue Network V(s) & Advantage Stream A(s, a)"]
        Policy["Selected Discrete Action Primitive a_t in [0..8]"]
        Head2 --> Policy
    end

    Policy --> MuJoCo["PHYSICS & ACTUATION\nMuJoCo 3.17 + RK4 Integrator\nPlanar 3-DOF RRR Articulated Arm"]
    MuJoCo --> State["State Vector s_{t+1} in R^18\nJoints (theta1, theta2, theta3), Tool, Torques"]
    State --> Sensors

    State --> Dashboard["HIGH-DPI COCKPIT\nThree.js 3D PBR Digital Twin\nNASA Telemetry & Q-Bars\nWeb Audio Sound Synthesizer"]
    GradCAM --> Dashboard
    State --> Debrief["POST-HOC XAI FORENSICS\nOllama Grounded Debrief Generator"]
```

---

## 🐺 The Three Heads

### Head 1: The Eye (Spatial Perception)
- **Role**: Extracts semantic identity (shape and color) and continuous Cartesian centroids $(\hat{x}, \hat{y})$ from RGB workspace captures.
- **Backbone**: CoordConv architecture (Liu et al., NeurIPS 2018) that injects explicit spatial grid coordinates $(i, j)$ into feature maps, resolving convolutional translation invariance.
- **Interpretability**: Real-time gradient-weighted class activation mapping (Grad-CAM) exposes the convolutional filters' visual attention directly in the HUD.
- **Detailed Reference**: See [docs/PERCEPTION.md](file:///Users/ananyasridhar/Desktop/projects/avi-ana/docs/PERCEPTION.md).

### Head 2: The Muscle (Closed-Loop Manipulation)
- **Role**: Maps continuous state vectors $s_t \in \mathbb{R}^{18}$ to optimal discrete joint actuation primitives $a_t \in \mathcal{A}$ (9 primitives).
- **Algorithm**: Dueling Double-DQN (D3QN) with Hindsight Experience Replay (HER).
- **Kinematic Constraints**: 3-DOF articulated kinematics ($L_1 = 0.90\text{ m}, L_2 = 0.70\text{ m}, L_3 = 0.35\text{ m}$), Yoshikawa manipulability $w(q) = \sqrt{\det(J(q) J(q)^T)}$ singularity avoidance, and angular jerk regularization.
- **Detailed Reference**: See [docs/REINFORCEMENT_LEARNING.md](file:///Users/ananyasridhar/Desktop/projects/avi-ana/docs/REINFORCEMENT_LEARNING.md) and [docs/KINEMATICS.md](file:///Users/ananyasridhar/Desktop/projects/avi-ana/docs/KINEMATICS.md).

### Head 3: The Brain (Symbolic Reasoning & Forensic XAI)
- **Role**: Converts high-level human intent into structured PDDL-style subgoals and dynamic supervisory weights; performs post-episode forensic debriefs.
- **Runtime**: Localhost Ollama inference (e.g. `llama3.2`, `mistral`, `deepseek-r1`) with a deterministic neuro-symbolic grammar fallback.
- **Key Guarantee**: Complete isolation between reasoning and real-time joint actuation. If the LLM generates an invalid goal or hallucinates a non-existent object, the neuro-symbolic validator intercepts the directive before the physical arm is actuated.

---

## ⚡ Latency & Telemetry Pipeline

| Subsystem | Frequency | Target Latency | Compute Platform |
| :--- | :--- | :--- | :--- |
| **MuJoCo RK4 Integrator** | 500 Hz | $< 0.5 \text{ ms}$ | CPU / C-extension |
| **D3QN Action Selector** | 60 Hz | $< 4.0 \text{ ms}$ | PyTorch (MPS / CUDA / CPU) |
| **CoordConv Multi-Task CNN** | 20 Hz (on-demand) | $< 18.0 \text{ ms}$ | PyTorch |
| **Grad-CAM Extraction** | 10 Hz (on inspect) | $< 25.0 \text{ ms}$ | PyTorch Autograd |
| **Three.js Digital Twin** | 60 FPS | $16.6 \text{ ms / frame}$ | WebGL 2.0 (Client GPU) |
| **Ollama PDDL Compiler** | Asynchronous | $400 - 1200 \text{ ms}$ | Localhost Ollama |
| **Ollama XAI Debrief** | Post-Episode | $800 - 1500 \text{ ms}$ | Localhost Ollama |

---

## 🛡️ Failsafe & Zero-Collision Architecture

1. **Analytical Boundary Clamping**: Joint angles are bounded by mechanical limits $\theta_1 \in [-45^\circ, 210^\circ]$, $\theta_2 \in [5^\circ, 165^\circ]$ before being passed to MuJoCo.
2. **Hazard Envelope Detection**: Line-segment circle collision tests continuously check link 1, link 2, and the end-effector against the central hazard pillar.
3. **Dynamic Supervisory Modulation**: When operator language includes tokens like `"carefully"`, `"hazard"`, or `"fragile"`, Head 3 scales $\lambda_{collision}$ from $25.0 \to 50.0$ and $\lambda_{jerk}$ from $1.5 \to 3.5$, biasing the DRL Q-network toward safe paths.
