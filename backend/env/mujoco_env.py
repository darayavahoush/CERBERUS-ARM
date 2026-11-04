"""MuJoCo 3D Physics Simulation Wrapper for CERBERUS 3-DOF Robotic Manipulator."""

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
    """MuJoCo-backed 3D physics environment for CERBERUS 3-DOF manipulator."""

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

        # Resolve addresses from the model. Free joints later in the XML add
        # seven qpos values each, so relying on array positions is fragile.
        self.joint_ids = {
            name: mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_JOINT, name)
            for name in ("joint1", "joint2", "joint3", "joint_finger_left", "joint_finger_right")
        }
        self.body_ids = {
            name: mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_BODY, name)
            for name in ("link1", "link2", "link3", "end_effector", "micro_module_cube", "quartz_focusing_lens", "dispersive_prism", "fiducial_sensor_star")
        }
        self.object_bodies = ("micro_module_cube", "quartz_focusing_lens", "dispersive_prism", "fiducial_sensor_star")
        self.ee_site_id = mujoco.mj_name2id(self.model, mujoco.mjtObj.mjOBJ_SITE, "ee_site")

    def _joint_value(self, name: str, value: float) -> None:
        joint_id = self.joint_ids.get(name, -1)
        if joint_id >= 0:
            address = int(self.model.jnt_qposadr[joint_id])
            self.data.qpos[address] = value

    def set_joints(
        self,
        theta1: float,
        theta2: float,
        theta3: float = 0.0,
        gripper_closed: bool = False,
        objects: Optional[List[Dict[str, Any]]] = None,
    ):
        """Set joint positions directly in MuJoCo data structure."""
        if not self.available:
            return

        self._joint_value("joint1", theta1)
        self._joint_value("joint2", theta2)
        self._joint_value("joint3", theta3)
        # Both opposing jaws travel symmetrically; closed means a narrow gap.
        finger_pos = 0.004 if gripper_closed else 0.025
        self._joint_value("joint_finger_left", finger_pos)
        self._joint_value("joint_finger_right", -finger_pos)

        # Keep the four detailed MJCF component bodies aligned to the active
        # task's current object positions instead of leaving them as decoration.
        for name, obj in zip(self.object_bodies, objects or []):
            body_id = self.body_ids.get(name, -1)
            if body_id < 0:
                continue
            joint_id = int(self.model.body_jntadr[body_id])
            if joint_id < 0:
                continue
            qadr = int(self.model.jnt_qposadr[joint_id])
            self.data.qpos[qadr:qadr + 3] = (float(obj["x"]), float(obj["y"]), 0.05)
            self.data.qpos[qadr + 3:qadr + 7] = (1.0, 0.0, 0.0, 0.0)

        mujoco.mj_forward(self.model, self.data)

    def step_physics(
        self,
        ctrl_j1: float,
        ctrl_j2: float,
        ctrl_j3: float = 0.0,
        gripper_cmd: float = 0.0,
    ):
        """Step physics with torque/motor control inputs."""
        if not self.available:
            return

        self.data.ctrl[0] = ctrl_j1
        self.data.ctrl[1] = ctrl_j2
        if len(self.data.ctrl) > 2:
            self.data.ctrl[2] = ctrl_j3
        if len(self.data.ctrl) > 3:
            self.data.ctrl[3] = gripper_cmd

        mujoco.mj_step(self.model, self.data)

    def get_3d_state(self) -> Dict[str, Any]:
        """Extract full 3D spatial transforms and dynamics from MuJoCo."""
        if not self.available:
            return {
                "available": False,
                "qpos": {"joint1": 0.0, "joint2": 0.0, "joint3": 0.0},
                "ee_3d": [1.0, 0.5, 0.1],
                "contacts": 0,
            }

        ee_pos = self.data.site_xpos[self.ee_site_id].tolist() if self.ee_site_id >= 0 else [1.0, 0.5, 0.1]
        qpos = {}
        qvel = {}
        for name in ("joint1", "joint2", "joint3", "joint_finger_left", "joint_finger_right"):
            joint_id = self.joint_ids.get(name, -1)
            if joint_id >= 0:
                qadr = int(self.model.jnt_qposadr[joint_id])
                dadr = int(self.model.jnt_dofadr[joint_id])
                qpos[name] = round(float(self.data.qpos[qadr]), 4)
                qvel[name] = round(float(self.data.qvel[dadr]), 4)
        links = {}
        for name, body_id in self.body_ids.items():
            if body_id >= 0:
                links[name] = [round(float(v), 4) for v in self.data.xpos[body_id]]
        object_positions = {
            name: [round(float(v), 4) for v in self.data.xpos[self.body_ids[name]]]
            for name in self.object_bodies if self.body_ids.get(name, -1) >= 0
        }

        return {
            "available": True,
            "qpos": qpos,
            "qvel": qvel,
            "ee_3d": [round(p, 4) for p in ee_pos],
            "links_3d": links,
            "object_positions_3d": object_positions,
            "n_contacts": int(self.data.ncon),
            "actuator_forces": [round(float(f), 3) for f in self.data.actuator_force[:3]],
            "kinetic_energy": round(float(self.data.energy[0]), 4) if hasattr(self.data, "energy") else 0.0,
        }
