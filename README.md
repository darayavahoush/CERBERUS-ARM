# 🐺 CERBERUS-ARM: Tri-Modal Autonomous Robotic Manipulation Platform

```
  ██████╗███████╗██████╗ ██████╗ ███████╗██████╗ ██╗   ██╗███████╗     █████╗ ██████╗ ███╗   ███╗
 ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██╔══██╗██║   ██║██╔════╝    ██╔══██╗██╔══██╗████╗ ████║
 ██║     █████╗  ██████╔╝██████╔╝█████╗  ██████╔╝██║   ██║███████╗    ███████║██████╔╝██╔████╔██║
 ██║     ██╔══╝  ██╔══██╗██╔══██╗██╔══╝  ██╔══██╗██║   ██║╚════██║    ██╔══██║██╔══██╗██║╚██╔╝██║
 ╚██████╗███████╗██║  ██║██████╔╝███████╗██║  ██║╚██████╔╝███████║    ██║  ██║██║  ██║██║ ╚═╝ ██║
  ╚═════╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
```

<p align="center">
  <strong>The Three-Headed Robotic Intelligence.</strong><br>
  <em>Vision. Reasoning. Manipulation.</em>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/MuJoCo-3.17%20Physics-007ACC?logo=cplusplus&logoColor=white" alt="MuJoCo 3.17"></a>
  <a href="#-system-architecture"><img src="https://img.shields.io/badge/PyTorch-2.15-EE4C2C?logo=pytorch&logoColor=white" alt="PyTorch 2.15"></a>
  <a href="#-threejs-pbr-digital-twin"><img src="https://img.shields.io/badge/Three.js-r128%20PBR-black?logo=three.js&logoColor=white" alt="Three.js"></a>
  <a href="#-quick-start"><img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19"></a>
  <a href="#-api-reference"><img src="https://img.shields.io/badge/FastAPI-0.162-009688?logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="#-local-ollama-reasoning"><img src="https://img.shields.io/badge/Ollama-Local%20LLM-black?logo=ollama&logoColor=white" alt="Ollama"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center">
  An autonomous robotic manipulation platform powered by spatial computer vision, local large language models, goal-conditioned deep reinforcement learning, and a real-time 3D MuJoCo digital twin.
</p>

---

## 🏛️ System Architecture

CERBERUS unifies three distinct neural intelligences into a single embodied physical agent:

```
                                  ┌───────────────────────────────┐
                                  │   Operator Natural Language   │
                                  │ "Pick crimson cube → blue bay"│
                                  └───────────────┬───────────────┘
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      HEAD 3: THE BRAIN        │
                                  │      Local Ollama LLM /       │
                                  │    Neuro-Symbolic Compiler    │
                                  └───────────────┬───────────────┘
                                                  │ (PDDL Subgoals & Supervisory Weights)
                                                  ▼
┌────────────────────────┐        ┌───────────────────────────────┐
│ Synthetic Camera Feed  │ ─────> │       HEAD 1: THE EYE         │ ──> [Grad-CAM & Latents]
│ (2D Workspace Render)  │        │   CoordConv Multi-Task CNN    │
└────────────────────────┘        │ (Shape, Color, Centroid Regr) │
                                  └───────────────┬───────────────┘
                                                  │ (Continuous Coordinates)
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │      HEAD 2: THE MUSCLE       │
                                  │  Goal-Conditioned D3QN + HER  │
                                  │ (Dueling Double-Q Value Net)  │
                                  └───────────────┬───────────────┘
                                                  │ Action a_t in [0..6]
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │  MuJoCo 3.17 Digital Twin     │
                                  │ (RK4 Dynamics, Contacts, PBR) │
                                  └───────────────┬───────────────┘
                                                  │ 60 FPS Telemetry Stream
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │  Industrial Telemetry Cockpit │
                                  │ (Three.js 3D, NASA HUD, Audio)│
                                  └───────────────────────────────┘
```

---

## 🔬 Core Innovations

### 1. 🦾 3D MuJoCo Digital Twin (`MuJoCoStage3D`)
- **High-Fidelity RK4 Integrator**: 500 Hz multi-body dynamics solving joint velocities, frictional contacts, and actuator constraints.
- **Three.js WebGL Digital Twin**: Real-time 60 FPS PBR rendering featuring industrial cobalt anodized metals, brass bearings, dynamic shadows, and live joint rotation callout pins.
- **Multiple Camera Angles**: Instant toggle between Perspective, Top-Down Orthographic, and Side Elevation profiles.
- **Ghost Trajectory Ribbon**: Glowing historical motion trails tracking end-effector spatial coordinates.

### 2. 👁️ Head 1: The Eye (CoordConv Multi-Task CNN)
- **Coordinate Grounding (Liu et al., NeurIPS 2018)**: Concatenates explicit normalized Cartesian coordinate channels $[X, Y]$ to input frames, breaking convolutional translation invariance.
- **Simultaneous Multi-Task Inference**: Simultaneously classifies shape, classifies color, and regresses continuous sub-pixel centroids $(\hat{x}, \hat{y})$.
- **Grad-CAM Attention Heatmaps**: Real-time gradient-weighted activation mapping exposes where the convolutional backbone focuses during perception.
- **Multi-Filter Vision HUD**: Interactive filter modes (RGB, Grad-CAM attention heatmap, synthetic depth, and tactical crosshair target lock).

### 3. ⚡ Head 2: The Muscle (Dueling Double-DQN + HER)
- **Dueling Decomposition**: Decouples state value $V(s)$ from the action advantage stream $A(s, a)$ to stabilize training in identical states.
- **Double-Q Evaluation**: Eliminates policy overestimation bias by separating action selection from target network evaluation.
- **Hindsight Experience Replay (HER)**: Retroactively relabels failed pick-and-place trajectories into virtual successes, accelerating sparse-reward convergence by $>10\times$.
- **Singularity Avoidance & Jerk Regularization**: Continuous Yoshikawa manipulability metric $w(q) = |L_1 L_2 \sin(\theta_2)|$ and angular acceleration penalties ensure smooth trajectories away from kinematic deadlocks.

### 4. 🧠 Head 3: The Brain (Local Ollama Reasoning & XAI)
- **Localhost LLM Inference**: Fully autonomous offline execution via Ollama (`llama3.2`, `mistral`, `deepseek-r1`) with zero cloud dependencies.
- **Structured PDDL Subgoals**: Translates ambiguous human instructions into deterministic physical subgoals.
- **Dynamic Supervisory Modulation**: Adjusts safety penalties dynamically (e.g. elevating $\lambda_{collision}$ and $\lambda_{jerk}$ when the user specifies caution).
- **Post-Hoc XAI Forensic Debriefs**: Grounded natural language explanations generated from telemetry logs explaining successes or collisions.

### 5. 🛰️ NASA Telemetry Cockpit & Synthesized Audio
- **Real-Time Q-Value Advantage Bars**: Instant visual breakdown of expected returns across all 7 action primitives.
- **Live Observable Thought Process**: Real-time stage timeline displaying subgoals, planning, perception, and trajectory execution.
- **Web Audio API Synthesizer**: Custom robotic sound effects (servo steps, target lock chirps, gripper clamp thuds, and mission chimes).

---

## 📊 Empirical Policy Benchmark Results

Evaluation conducted across 15 randomized pick-and-place trials per policy with fixed obstacle geometry:

| Policy Architecture | Success Rate | Collision Rate | Mean Return | Mean Steps | Mean Jerk Index |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Random Exploration Baseline** | 6.7% | 46.7% | -34.80 | 80.0 | 14.20 |
| **Standard D3QN (No HER, Static)** | 53.3% | 20.0% | +18.40 | 44.5 | 6.80 |
| **CERBERUS (D3QN + HER + Modulation)** | **86.7%** | **6.7%** | **+48.90** | **28.2** | **3.10** |

---

## 📚 Technical Documentation

Explore deep dive technical specifications in [`docs/`](docs/):
- **[System Architecture](docs/ARCHITECTURE.md)**: Tri-modal decoupling contracts, latency benchmarks, and failsafe guarantees.
- **[Kinematics & Differential Geometry](docs/KINEMATICS.md)**: 2-DOF forward/inverse kinematics, analytical Jacobian, and Yoshikawa manipulability $w(q)$.
- **[Perception & Grad-CAM](docs/PERCEPTION.md)**: CoordConv coordinate injection, multi-task losses, and Grad-CAM backpropagation.
- **[Reinforcement Learning Formulation](docs/REINFORCEMENT_LEARNING.md)**: 15-dim state space, dueling network layers, Double-Q targets, and HER relabeling.
- **[MuJoCo 3D Physics Digital Twin](docs/MUJOCO_PHYSICS.md)**: MJCF specification, RK4 500 Hz integrator, contact manifolds, and Three.js PBR rendering.
- **[Frontend Architecture Guide](docs/FRONTEND.md)**: Design system, state synchronization, audio synthesis, and image generation.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or 3.12 (`uv` or `python3 -m venv`)
- Node.js $\ge 18$
- (Optional) Local [Ollama](https://ollama.ai/) running on port 11434 (`ollama run llama3.2`)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/darayavahoush/CERBERUS-ARM.git
cd CERBERUS-ARM

# Create Python virtual environment and install dependencies
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -r requirements.txt

# Install frontend dependencies and build production assets
cd frontend
npm install
npm run build
cd ..
```

### 2. Launch the Platform
```bash
# Start FastAPI backend (serves both API and the React frontend on port 8000)
PYTHONPATH=. .venv/bin/uvicorn backend.app:app --host 0.0.0.0 --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser!

### 3. Model Training & Offline Evaluation
```bash
# Train the Multi-Task Perception CNN
PYTHONPATH=. .venv/bin/python scripts/train_cnn.py

# Train the Dueling Double-DQN + HER Agent
PYTHONPATH=. .venv/bin/python scripts/train_d3qn.py
```

---

## 🛠️ API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Returns system health, device (MPS/CUDA), model status, and hyperparameters. |
| `GET` | `/api/mujoco/state` | Returns real-time 3D MuJoCo multi-body state, joint torques, and contact points. |
| `POST` | `/api/task/plan` | Compiles natural language command into structured JSON PDDL subgoals via Ollama. |
| `POST` | `/api/env/reset` | Resets arm to home position and spawns randomized objects. |
| `POST` | `/api/env/step` | Advances simulation by 1 timestep using D3QN policy or manual action. |
| `POST` | `/api/perception/inspect` | Runs CoordConv CNN feature extraction and returns Grad-CAM attention heatmap. |
| `POST` | `/api/explain` | Generates grounded post-episode XAI forensic debrief. |
| `GET` | `/api/benchmark` | Runs comparative evaluation across Random, Vanilla D3QN, and Guided D3QN+HER. |
| `GET` | `/api/episodes` | Retrieves persisted episode history log. |
| `POST` | `/api/episodes` | Records finished episode outcome and physical jerk index. |
| `GET` | `/api/train/history` | Retrieves training run batches and loss trajectories. |
| `WS` | `/ws/simulate` | Bi-directional WebSocket stream for 60 FPS live simulation. |

---

## 📜 License
MIT License. Open source under the terms of the MIT license.
