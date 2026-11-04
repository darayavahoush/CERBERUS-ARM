# CERBERUS-ARM MuJoCo digital twin

## What runs today

`backend/env/cerberus_arm.xml` defines the 3-DOF articulated arm, opposing gripper jaws, four detailed component bodies, three destination bays, inspection spindle, materials, and lighting. `backend/env/mujoco_env.py` loads the MJCF model and resolves joint and body addresses by name.

After each discrete action, the backend synchronizes the task environment's three joint angles, gripper state, and four object positions into MuJoCo, calls `mj_forward`, and reports the resulting named joint positions, joint velocities, link transforms, end-effector site position, object positions, and contact count. The wrapper also supports `mj_step` torque inputs, but the current DQN task controller does not use those inputs.

The control task remains a planar, discrete kinematic environment. Collision penalties and task success are computed by that environment. MuJoCo currently supplies synchronized forward kinematics and model contact telemetry; it does not drive the policy with torque-based contact dynamics. The UI and `/api/status` identify this as a synchronized digital twin.

## State synchronization

```python
mujoco_env.set_joints(
    obs["theta1"], obs["theta2"], obs["theta3"],
    obs["gripper_closed"], obs["objects"],
)
state = mujoco_env.get_3d_state()
```

Joint and free-joint qpos offsets come from MuJoCo's model address tables rather than hard-coded array indices. Both gripper jaws move symmetrically. Scene object coordinates are copied to the four detailed MJCF free bodies before forwarding the model.

The 3D console is rendered in Three.js with light materials, detailed component geometry, shadows, labels, and orbit controls. It consumes the synchronized MuJoCo joint angles and object positions. This browser renderer is a Three.js digital twin, not a MuJoCo offscreen render.

## Extending to physics-driven control

A next step for a physics-driven controller is to add bounded position or torque targets for the arm joints, advance the MJCF for a fixed number of substeps per policy action, and feed MuJoCo state/contact outcomes back into the observation and reward. That requires revalidating action timing, grasp behavior, collision semantics, and policy training; it is not implied by the current synchronized-state implementation.

See [WORKCELL_OBJECTS.md](WORKCELL_OBJECTS.md) for the component and workcell specifications, and [TRAINING_RUN.md](TRAINING_RUN.md) for training and held-out evaluation results.
