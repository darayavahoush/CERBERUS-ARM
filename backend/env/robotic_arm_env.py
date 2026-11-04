"""Gymnasium-Compatible Robotic Arm Environment for Precision Component Sorting.

Real-World Industrial Cleanroom Workcell:
- 3-DOF Articulated Planar Manipulator (Shoulder, Elbow, Wrist + Gripper)
- Optical Component & Micro-Module Workcell Taxonomy
- 3 Specialized Industrial Bays:
  * Bay A (Crimson): SMT Assembly Staging
  * Bay B (Cobalt): Automated Optical Inspection (AOI)
  * Bay C (Emerald): Cleanroom QA Pass-Through Chamber
- Central Obstacle: Optical Laser Inspection Spindle & Safety Curtain
- Dynamic Random Sample Space Generator with 4-6 non-overlapping components
"""

import math
import random
from typing import Dict, Any, Tuple, List, Optional
import numpy as np

from backend.env.kinematics import PlanarArmKinematics


# Real-World Industrial Component Taxonomies
SHAPES = ["cube", "sphere", "triangle", "star"]
SHAPE_DESCRIPTIONS = {
    "cube": "Micro-Module (Relay / IC)",
    "sphere": "Quartz Lens / Battery Cell",
    "triangle": "Dispersive Prism / Wedge",
    "star": "Fiducial Sensor Hub",
}

COLORS = {
    "crimson": (239, 68, 68),
    "cobalt": (59, 130, 246),
    "emerald": (16, 185, 129),
    "amber": (245, 158, 11),
}
COLOR_NAMES = list(COLORS.keys())

# Industrial Workcell Receptacles
RECEPTACLES = {
    "red_bin": {
        "pos": (-1.25, 0.45),
        "color": "crimson",
        "radius": 0.22,
        "name": "Bay A · SMT Staging",
        "desc": "Surface-Mount Technology Infeed & Assembly",
    },
    "blue_bin": {
        "pos": (1.25, 0.45),
        "color": "cobalt",
        "radius": 0.22,
        "name": "Bay B · AOI Inspection",
        "desc": "Automated Optical Quality & Alignment Verification",
    },
    "green_bin": {
        "pos": (0.0, 1.60),
        "color": "emerald",
        "radius": 0.22,
        "name": "Bay C · Cleanroom QA",
        "desc": "Certified Cleanroom Pass-Through Chamber",
    },
}


class RoboticArmEnv:
    """Continuous 3-DOF Planar Robotic Arm Environment with Discrete Control Primitives."""

    def __init__(
        self,
        l1: float = 0.90,
        l2: float = 0.70,
        l3: float = 0.35,
        delta_theta: float = math.radians(5.0),  # 5° per micro-step
        max_steps: int = 80,
        seed: Optional[int] = 42,
    ):
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        self.kinematics = PlanarArmKinematics(l1=l1, l2=l2, l3=l3)
        self.delta_theta = delta_theta
        self.max_steps = max_steps

        # 3-DOF Joint states (radians)
        self.theta1: float = math.pi / 4       # Base / Shoulder
        self.theta2: float = math.pi / 3       # Elbow
        self.theta3: float = -math.pi / 6      # Active Wrist Pitch
        self.prev_theta1: float = self.theta1
        self.prev_theta2: float = self.theta2
        self.prev_theta3: float = self.theta3
        self.gripper_closed: bool = False
        self.grasped_object_idx: Optional[int] = None

        # Objects in workspace
        self.objects: List[Dict[str, Any]] = []

        # Central Optical Inspection Spindle & Safety Light Curtain
        self.obstacles: List[Dict[str, Any]] = [
            {
                "x": 0.0,
                "y": 0.85,
                "radius": 0.20,
                "type": "laser_spindle",
                "name": "Optical Inspection Spindle",
            }
        ]

        # Active Goal Specification
        self.target_object_idx: int = 0
        self.target_receptacle_key: str = "blue_bin"
        self.goal_pos: Tuple[float, float] = RECEPTACLES["blue_bin"]["pos"]

        # Supervisory dynamic weights (modulated by LLM / Neuro-Symbolic)
        self.supervisory_weights = {
            "collision_penalty": 30.0,
            "jerk_penalty": 1.5,
            "step_penalty": 0.1,
            "efficiency_multiplier": 1.0,
        }

        self.current_step = 0
        self.trajectory_history: List[Dict[str, Any]] = []
        self.reset()

    @property
    def action_space_size(self) -> int:
        """9 Discrete Actions for 3-DOF Arm + End-Effector:
        0: Joint 1 (Shoulder) +dtheta
        1: Joint 1 (Shoulder) -dtheta
        2: Joint 2 (Elbow)    +dtheta
        3: Joint 2 (Elbow)    -dtheta
        4: Joint 3 (Wrist)    +dtheta
        5: Joint 3 (Wrist)    -dtheta
        6: Toggle Gripper     (Grasp / Release)
        7: Micro-Align        (Coordinated 3-joint descent)
        8: Hold / Idle
        """
        return 9

    def generate_random_sample_space(
        self,
        count: int = 5,
        target_shape: Optional[str] = None,
        target_color: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate a randomized, non-overlapping sample space of industrial components."""
        objects = []
        occupied = []
        obs = self.obstacles[0]

        colors_pool = list(COLORS.keys()) * 2
        shapes_pool = list(SHAPES) * 2
        random.shuffle(colors_pool)
        random.shuffle(shapes_pool)

        # Guaranteed first component matches requested target if specified
        if target_shape or target_color:
            shapes_pool[0] = target_shape or shapes_pool[0]
            colors_pool[0] = target_color or colors_pool[0]

        for i in range(count):
            placed = False
            for attempt in range(80):
                # Sample within reachable annular workspace: r in [0.70, 1.60], angle in [20°, 160°]
                r = random.uniform(0.72, 1.55)
                angle = random.uniform(math.pi * 0.12, math.pi * 0.88)
                ox = round(r * math.cos(angle), 3)
                oy = round(r * math.sin(angle), 3)

                # Clearance from central laser obstacle (keep-out radius 0.20 + 0.16)
                if math.hypot(ox - obs["x"], oy - obs["y"]) < (obs["radius"] + 0.16):
                    continue

                # Clearance from sorting bays
                if any(math.hypot(ox - b["pos"][0], oy - b["pos"][1]) < 0.28 for b in RECEPTACLES.values()):
                    continue

                # Clearance from already placed components
                if any(math.hypot(ox - px, oy - py) < 0.24 for px, py in occupied):
                    continue

                occupied.append((ox, oy))
                shape = shapes_pool[i % len(shapes_pool)]
                color = colors_pool[i % len(colors_pool)]

                objects.append({
                    "id": f"comp_{i + 1}",
                    "shape": shape,
                    "color": color,
                    "desc": SHAPE_DESCRIPTIONS.get(shape, shape),
                    "x": ox,
                    "y": oy,
                    "radius": 0.075,
                    "rotation": round(random.uniform(-math.pi, math.pi), 2),
                    "is_grasped": False,
                })
                placed = True
                break

            if not placed:
                # Deterministic fallback coordinate along clean arc
                fallback_ang = math.pi * 0.25 + i * 0.30
                ox = round(1.0 * math.cos(fallback_ang), 3)
                oy = round(1.0 * math.sin(fallback_ang), 3)
                shape = shapes_pool[i % len(shapes_pool)]
                color = colors_pool[i % len(colors_pool)]
                objects.append({
                    "id": f"comp_{i + 1}",
                    "shape": shape,
                    "color": color,
                    "desc": SHAPE_DESCRIPTIONS.get(shape, shape),
                    "x": ox,
                    "y": oy,
                    "radius": 0.075,
                    "rotation": 0.0,
                    "is_grasped": False,
                })

        return objects

    def reset(
        self,
        task_id: int = 1,
        target_shape: Optional[str] = None,
        target_color: Optional[str] = None,
        target_bin: Optional[str] = None,
        num_components: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Reset workcell with a randomized component sample space and active goal."""
        self.current_step = 0
        self.gripper_closed = False
        self.grasped_object_idx = None
        self.trajectory_history = []

        # Home position for 3-DOF arm
        self.theta1 = math.pi / 4       # 45°
        self.theta2 = math.pi / 3       # 60°
        self.theta3 = -math.pi / 4      # -45° (aligned approach)
        self.prev_theta1 = self.theta1
        self.prev_theta2 = self.theta2
        self.prev_theta3 = self.theta3

        # Spawn 4 to 6 randomized components
        count = num_components if num_components is not None else random.randint(4, 5)
        self.objects = self.generate_random_sample_space(
            count=count, target_shape=target_shape, target_color=target_color
        )

        # Match target component
        if target_shape or target_color:
            match_idx = None
            for idx, obj in enumerate(self.objects):
                shape_match = (target_shape is None) or (obj["shape"] == target_shape)
                color_match = (target_color is None) or (obj["color"] == target_color)
                if shape_match and color_match:
                    match_idx = idx
                    break
            self.target_object_idx = match_idx if match_idx is not None else 0
        else:
            self.target_object_idx = random.randint(0, len(self.objects) - 1)

        # Receptacle Destination Bay
        if target_bin and target_bin in RECEPTACLES:
            self.target_receptacle_key = target_bin
        else:
            if task_id == 1:
                self.target_receptacle_key = "blue_bin"
            elif task_id == 2:
                self.target_receptacle_key = "red_bin"
            else:
                self.target_receptacle_key = "green_bin"

        self.goal_pos = RECEPTACLES[self.target_receptacle_key]["pos"]

        return self.get_observation()

    def get_observation(self) -> Dict[str, Any]:
        """Return full structured state observation for 3-DOF workcell."""
        if not self.objects:
            self.reset()

        fk = self.kinematics.forward_kinematics(self.theta1, self.theta2, self.theta3)
        ee_x, ee_y = fk["ee"]
        phi = fk["phi"]
        w = self.kinematics.manipulability(self.theta2, self.theta3)

        target_obj = self.objects[self.target_object_idx]
        obj_x, obj_y = target_obj["x"], target_obj["y"]
        gx, gy = self.goal_pos

        dist_ee_obj = math.hypot(ee_x - obj_x, ee_y - obj_y)
        dist_obj_goal = math.hypot(obj_x - gx, obj_y - gy)

        # 18-Dimensional Numerical Vector Representation for DRL Policy
        vector_state = np.array(
            [
                self.theta1 / math.pi,
                self.theta2 / math.pi,
                self.theta3 / math.pi,
                (self.theta1 - self.prev_theta1) / self.delta_theta,
                (self.theta2 - self.prev_theta2) / self.delta_theta,
                (self.theta3 - self.prev_theta3) / self.delta_theta,
                ee_x / self.kinematics.max_reach,
                ee_y / self.kinematics.max_reach,
                phi / math.pi,
                1.0 if self.gripper_closed else 0.0,
                1.0 if self.grasped_object_idx is not None else 0.0,
                obj_x / self.kinematics.max_reach,
                obj_y / self.kinematics.max_reach,
                gx / self.kinematics.max_reach,
                gy / self.kinematics.max_reach,
                min(dist_ee_obj, 3.0),
                min(dist_obj_goal, 3.0),
                w,
            ],
            dtype=np.float32,
        )

        return {
            "vector": vector_state.tolist(),
            "fk": fk,
            "theta1": float(self.theta1),
            "theta2": float(self.theta2),
            "theta3": float(self.theta3),
            "phi": float(phi),
            "manipulability": float(w),
            "gripper_closed": self.gripper_closed,
            "grasped_idx": self.grasped_object_idx,
            "target_idx": self.target_object_idx,
            "target_object": dict(target_obj),
            "objects": [dict(o) for o in self.objects],
            "goal_pos": [float(p) for p in self.goal_pos],
            "goal_key": self.target_receptacle_key,
            "goal_name": RECEPTACLES[self.target_receptacle_key]["name"],
            "dist_ee_obj": float(dist_ee_obj),
            "dist_obj_goal": float(dist_obj_goal),
            "step": self.current_step,
            "max_steps": self.max_steps,
        }

    def step(self, action: int) -> Tuple[Dict[str, Any], float, bool, bool, Dict[str, Any]]:
        """Execute one discrete action in the 3-DOF workcell."""
        self.current_step += 1
        self.prev_theta1 = self.theta1
        self.prev_theta2 = self.theta2
        self.prev_theta3 = self.theta3

        fk_before = self.kinematics.forward_kinematics(self.theta1, self.theta2, self.theta3)
        target_obj = self.objects[self.target_object_idx]
        prev_dist_ee_obj = math.hypot(
            fk_before["ee"][0] - target_obj["x"], fk_before["ee"][1] - target_obj["y"]
        )
        prev_dist_obj_goal = math.hypot(
            target_obj["x"] - self.goal_pos[0], target_obj["y"] - self.goal_pos[1]
        )

        invalid_grasp_attempt = False

        # Apply 3-DOF Discrete Action
        if action == 0:
            self.theta1 += self.delta_theta
        elif action == 1:
            self.theta1 -= self.delta_theta
        elif action == 2:
            self.theta2 += self.delta_theta
        elif action == 3:
            self.theta2 -= self.delta_theta
        elif action == 4:
            self.theta3 += self.delta_theta
        elif action == 5:
            self.theta3 -= self.delta_theta
        elif action == 6:
            # Toggle Gripper
            self.gripper_closed = not self.gripper_closed
            if self.gripper_closed and self.grasped_object_idx is None:
                ee_x, ee_y = fk_before["ee"]
                for idx, obj in enumerate(self.objects):
                    if math.hypot(ee_x - obj["x"], ee_y - obj["y"]) < 0.16:
                        self.grasped_object_idx = idx
                        obj["is_grasped"] = True
                        break
                else:
                    invalid_grasp_attempt = True
            elif not self.gripper_closed and self.grasped_object_idx is not None:
                self.objects[self.grasped_object_idx]["is_grasped"] = False
                self.grasped_object_idx = None
        elif action == 7:
            # Micro-Align Action (coordinated 3-joint align)
            self.theta1 += self.delta_theta * 0.4
            self.theta2 -= self.delta_theta * 0.4
            self.theta3 += self.delta_theta * 0.2
        elif action == 8:
            # Hold / Idle
            pass

        # Clamp joint angles
        self.theta1, self.theta2, self.theta3 = self.kinematics.clamp_angles(
            self.theta1, self.theta2, self.theta3
        )

        fk_after = self.kinematics.forward_kinematics(self.theta1, self.theta2, self.theta3)
        ee_x, ee_y = fk_after["ee"]

        # Synchronize grasped object coordinates
        if self.grasped_object_idx is not None:
            self.objects[self.grasped_object_idx]["x"] = round(ee_x, 3)
            self.objects[self.grasped_object_idx]["y"] = round(ee_y, 3)

        # Check collision with central laser inspection spindle
        obs = self.obstacles[0]
        collision = self.kinematics.check_collision_circle(
            self.theta1, self.theta2, self.theta3, obs["x"], obs["y"], obs["radius"]
        )

        curr_dist_ee_obj = math.hypot(ee_x - target_obj["x"], ee_y - target_obj["y"])
        curr_dist_obj_goal = math.hypot(
            target_obj["x"] - self.goal_pos[0], target_obj["y"] - self.goal_pos[1]
        )

        # --- MULTI-OBJECTIVE REWARD SHAPING ---
        reward = 0.0

        # Step penalty
        reward -= self.supervisory_weights["step_penalty"]

        # Jerk / acceleration penalty across all 3 joints
        d_th1 = self.theta1 - self.prev_theta1
        d_th2 = self.theta2 - self.prev_theta2
        d_th3 = self.theta3 - self.prev_theta3
        jerk = (d_th1**2 + d_th2**2 + d_th3**2) * 5.0
        reward -= self.supervisory_weights["jerk_penalty"] * jerk

        # Distance shaping
        if self.grasped_object_idx is None:
            dist_delta = prev_dist_ee_obj - curr_dist_ee_obj
            reward += dist_delta * 14.0
            reward += math.exp(-3.0 * curr_dist_ee_obj) * 0.6
        else:
            reward += 1.2  # Transport hold bonus
            dist_goal_delta = prev_dist_obj_goal - curr_dist_obj_goal
            reward += dist_goal_delta * 20.0
            reward += math.exp(-3.0 * curr_dist_obj_goal) * 1.2

        if invalid_grasp_attempt:
            reward -= 2.5

        w = self.kinematics.manipulability(self.theta2, self.theta3)
        if w < 0.04:
            reward -= 1.0

        if collision:
            reward -= self.supervisory_weights["collision_penalty"]

        # Destination check
        target_receptacle = RECEPTACLES[self.target_receptacle_key]
        placed_in_goal = (
            curr_dist_obj_goal < target_receptacle["radius"]
            and self.grasped_object_idx is None
            and self.current_step > 5
        )

        success = False
        terminated = False
        if placed_in_goal:
            reward += 75.0
            success = True
            terminated = True
        elif collision:
            terminated = True

        truncated = self.current_step >= self.max_steps

        telemetry = {
            "step": self.current_step,
            "action": action,
            "ee": (round(ee_x, 3), round(ee_y, 3)),
            "thetas": (round(self.theta1, 3), round(self.theta2, 3), round(self.theta3, 3)),
            "reward": round(reward, 3),
            "collision": collision,
            "success": success,
            "is_grasped": self.grasped_object_idx is not None,
            "dist_goal": round(curr_dist_obj_goal, 3),
        }
        self.trajectory_history.append(telemetry)

        info = {
            "is_success": bool(success),
            "is_collision": bool(collision),
            "jerk": round(float(jerk), 4),
            "manipulability": round(float(w), 4),
            "dist_to_goal": round(float(curr_dist_obj_goal), 4),
        }

        return self.get_observation(), reward, terminated, truncated, info

    def compute_her_reward(
        self, achieved_pos: Tuple[float, float], desired_pos: Tuple[float, float]
    ) -> float:
        """Hindsight goal-conditioned reward for HER."""
        d = math.hypot(achieved_pos[0] - desired_pos[0], achieved_pos[1] - desired_pos[1])
        if d < 0.18:
            return 1.0
        return -0.05 * d
