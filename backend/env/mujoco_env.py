"""MuJoCo 3D Physics Simulation Wrapper for CERBERUS Robotic Manipulator."""

import os
import math
from typing import Dict, Any, Tuple, List, Optional
import numpy as np

try:
    import mujoco
    MUJOCO_AVAILABLE = True
except ImportError:
    MUJOCO_AVAILABLE = False


class CerberusMuJoCoEnv:
    """MuJoCo-backed 3D physics environment for CERBERUS manipulator."""

    def __init__(self, xml_path: Optional[str] = None):
        self.available = MUJOCO_AVAILABLE
        if not self.available:
            print("[!] MuJoCo not available, falling back to analytical kinematics.")
            return

        if xml_path is None:
            xml_path = os.path.join(os.path.dirname(__file__), "cerberus_arm.xml")

        self.xml_path = xml_path
        self.model = mujoco.MjModel.from_xml_path(xml_path)
        self.data = mujoco.MjData(self.model)

        # Joint IDs
        self.j1_id = mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_JOINT, "joint1")
        self.j2_id = mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_JOINT, "joint2")
        self.ee_site_id = mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_SITE, "ee_site")

    def set_joints(self, theta1: float, theta2: float, gripper_closed: bool = False):
        """Set joint positions directly in MuJoCo data structure."""
        if not self.available:
            return

        self.data.qpos[0] = theta1
        self.data.qpos[1] = theta2
        # Gripper fingers
        finger_pos = 0.025 if gripper_closed else 0.0
        if len(self.data.qpos) > 2:
            self.data.qpos[2] = finger_pos

        mujoco.mj_forward(self.model, self.data)

    def step_physics(self, ctrl_j1: float, ctrl_j2: float, gripper_cmd: float = 0.0):
        """Step physics with torque/motor control inputs."""
        if not self.available:
            return

        self.data.ctrl[0] = ctrl_j1
        self.data.ctrl[1] = ctrl_j2
        if len(self.data.ctrl) > 2:
            self.data.ctrl[2] = gripper_cmd

        mujoco.mj_step(self.model, self.data)

    def get_3d_state(self) -> Dict[str, Any]:
        """Extract full 3D spatial transforms and dynamics from MuJoCo."""
        if not self.available:
            return {
                "available": False,
                "qpos": [0.0, 0.0],
                "ee_3d": [1.0, 0.5, 0.1],
                "contacts": 0,
            }

        ee_pos = self.data.site_xpos[self.ee_site_id].tolist()
        qpos = self.data.qpos[:2].tolist()
        qvel = self.data.qvel[:2].tolist()

        return {
            "available": True,
            "qpos": [round(q, 4) for q in qpos],
            "qvel": [round(v, 4) for v in qvel],
            "ee_3d": [round(p, 4) for p in ee_pos],
            "n_contacts": int(self.data.ncon),
            "actuator_forces": [round(float(f), 3) for f in self.data.actuator_force[:2]],
            "kinetic_energy": round(float(self.data.energy[0]), 4) if hasattr(self.data, "energy") else 0.0,
        }
