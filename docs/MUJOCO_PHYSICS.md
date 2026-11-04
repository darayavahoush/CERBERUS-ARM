# CERBERUS-ARM: MuJoCo 3.17 Physics Digital Twin & 3D Visualization

This document details the multi-body dynamics, contact mechanics, and interactive WebGL 3D digital twin synchronization powering CERBERUS-ARM.

---

## 🏛️ 1. Multi-Joint Dynamics & MJCF Specification

The articulated physical model is defined in `backend/env/cerberus_arm.xml` compliant with **MuJoCo 3.17**:

### Kinematic Tree
- **Worldbody**: Global ground plane with high-contrast laboratory grid textures, overhead spotlights, and three circular sorting bays.
- **Base Pedestal**: Fixed heavy cylindrical mounting pedestal anchored at $(0, 0, 0)$.
- **Shoulder Joint (`shoulder_joint`)**: Revolute hinge with rotation along local Z-axis ($\text{axis} = [0, 0, 1]$), limited to $\theta_1 \in [-0.785, 3.665]\text{ rad}$.
- **Upper Arm Link (`upper_arm`)**: Length $L_1 = 1.0\text{ m}$, mass $2.4\text{ kg}$, with anisotropic damping $b = 0.8\text{ N}\cdot\text{s/m}$.
- **Elbow Joint (`elbow_joint`)**: Revolute hinge along local Z-axis, limited to $\theta_2 \in [0.087, 2.880]\text{ rad}$.
- **Forearm Link (`forearm`)**: Length $L_2 = 0.8\text{ m}$, mass $1.6\text{ kg}$, damping $b = 0.5\text{ N}\cdot\text{s/m}$.
- **End-Effector & Parallel Gripper (`left_finger`, `right_finger`)**: Sliding prismatic joints driven by position actuators with tactile friction pads.

---

## ⚙️ 2. Physics Integrator & Numerical Stability

The simulation runs MuJoCo's 4th-Order Runge-Kutta (**RK4**) numerical integrator:

$$\begin{aligned}
k_1 &= f(t_n, y_n) \\
k_2 &= f\left(t_n + \frac{h}{2}, y_n + \frac{h}{2} k_1\right) \\
k_3 &= f\left(t_n + \frac{h}{2}, y_n + \frac{h}{2} k_2\right) \\
k_4 &= f(t_n + h, y_n + h k_3) \\
y_{n+1} &= y_n + \frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)
\end{aligned}$$

With integration step $h = 0.002\text{ s}$ ($500\text{ Hz}$ update frequency), RK4 yields high numerical stability and accurate energy conservation during rapid joint accelerations and contact impacts.

---

## 🔄 3. State Synchronization Bridge (`CerberusMuJoCoEnv`)

The backend Python wrapper `backend/env/mujoco_env.py` manages bidirectional synchronization:

```python
# Synchronize joint state from high-level RL policy
mujoco_env.set_joints(theta1, theta2, gripper_closed)

# Extract forward dynamics and multi-body contact telemetry
state_3d = mujoco_env.get_3d_state()
# Returns:
# - qpos: [theta1, theta2] (generalized positions)
# - qvel: [dtheta1, dtheta2] (generalized velocities)
# - ee_3d: [x, y, z] (Cartesian end-effector coordinate in 3D world space)
# - n_contacts: int (active contact manifolds)
# - actuator_forces: [f_shoulder, f_elbow]
# - kinetic_energy: 0.5 * qvel^T * M(qpos) * qvel
```

---

## 🎮 4. Three.js PBR 3D Digital Twin

The browser renders a real-time 60 FPS 3D digital twin (`frontend/src/components/MuJoCoStage3D.jsx`) using Three.js and WebGL 2.0:

### Visual & Interactive Features
1. **PBR Industrial Materials**:
   - Metallic anodized cobalt aluminum (`#1B2F8E`, metalness $0.85$, roughness $0.25$).
   - Polished brass joint bearings with realistic environment reflections.
   - Signal-yellow warning stripes on the gripper jaws and hazard pillar.
2. **Camera Presets**:
   - **Perspective (Default)**: Elevated angle $(0, -2.6, 2.2)$ showcasing workspace depth and 3D shadows.
   - **Top-Down**: Orthographic camera $(0, 0, 3.4)$ matching the 2D planar observation view.
   - **Side Profile**: Low elevation $(2.6, 0, 0.9)$ highlighting link clearances and joint elevation.
3. **Ghost Trajectory Ribbon**:
   - Renders the end-effector's historical 3D path with fading glow particles and line vertices.
4. **Interactive Callouts**:
   - Floating spatial badges displaying real-time joint angles $(\theta_1, \theta_2)$, end-effector coordinates $(x_{ee}, y_{ee})$, and active target lock pins.
