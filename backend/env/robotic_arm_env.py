"""Gymnasium-Compatible 2D Robotic Arm Environment for Pick-and-Place Manipulation.

Supports:
- Forward/Inverse Kinematics with 2-DOF planar arm.
- Multiple multi-color, multi-shape objects.
- Multiple destination receptacles/bins.
- Circular obstacle zones (hazard areas).
- Magnetic/mechanical gripper with state tracking.
- Goal-conditioned states and HER reward computation.
- Synthetic camera rendering for CNN perception.
"""

import math
import random
from typing import Dict, Any, Tuple, List, Optional
import numpy as np

from backend.env.kinematics import PlanarArmKinematics


# Shape & Color Taxonomies
SHAPES = ["cube", "sphere", "triangle", "star"]
COLORS = {
    "crimson": (239, 68, 68),
    "cobalt": (59, 130, 246),
    "emerald": (16, 185, 129),
    "amber": (245, 158, 11),
}
COLOR_NAMES = list(COLORS.keys())

# Default Workspace Receptacles
RECEPTACLES = {
    "red_bin": {"pos": (-1.2, 0.45), "color": "crimson", "radius": 0.22},
    "blue_bin": {"pos": (1.2, 0.45), "color": "cobalt", "radius": 0.22},
    "green_bin": {"pos": (0.0, 1.55), "color": "emerald", "radius": 0.22},
}


class RoboticArmEnv:
    """Continuous 2D Planar Robotic Arm Environment with Discrete Control Primitives."""

    def __init__(
        self,
        l1: float = 1.0,
        l2: float = 0.8,
        delta_theta: float = math.radians(5.0),  # 5 degrees per micro-step
        max_steps: int = 80,
        seed: Optional[int] = 42,
    ):
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        self.kinematics = PlanarArmKinematics(l1=l1, l2=l2)
        self.delta_theta = delta_theta
        self.max_steps = max_steps

        # Joint states
        self.theta1: float = math.pi / 4
        self.theta2: float = math.pi / 2
        self.prev_theta1: float = self.theta1
        self.prev_theta2: float = self.theta2
        self.gripper_closed: bool = False
        self.grasped_object_idx: Optional[int] = None

        # Objects in workspace
        self.objects: List[Dict[str, Any]] = []
        # Obstacles
        self.obstacles: List[Dict[str, Any]] = [
            {"x": 0.0, "y": 0.85, "radius": 0.22, "type": "hazard_pillar"}
        ]
        # Active Goal Specification
        self.target_object_idx: int = 0
        self.target_receptacle_key: str = "blue_bin"
        self.goal_pos: Tuple[float, float] = RECEPTACLES["blue_bin"]["pos"]

        # Supervisory dynamic weights (modifiable by LLM)
        self.supervisory_weights = {
            "collision_penalty": 25.0,
            "jerk_penalty": 1.5,
            "step_penalty": 0.1,
            "efficiency_multiplier": 1.0,
        }

        self.current_step = 0
        self.trajectory_history: List[Dict[str, Any]] = []
        self.reset()

    @property
    def action_space_size(self) -> int:
        """7 Discrete Actions:
        0: Joint 1 +dtheta
        1: Joint 1 -dtheta
        2: Joint 2 +dtheta
        3: Joint 2 -dtheta
        4: Toggle Gripper
        5: Micro-Align (Joint 1 +dtheta/2, Joint 2 -dtheta/2)
        6: Hold / Idle
        """
        return 7

    def reset(
        self,
        task_id: int = 1,
        target_shape: Optional[str] = None,
        target_color: Optional[str] = None,
        target_bin: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Reset environment with a fresh set of randomized objects and goals."""
        self.current_step = 0
        self.gripper_closed = False
        self.grasped_object_idx = None
        self.trajectory_history = []

        # Reset joints to home position
        self.theta1 = math.pi / 3  # 60 degrees
        self.theta2 = math.pi / 3  # 60 degrees
        self.prev_theta1 = self.theta1
        self.prev_theta2 = self.theta2

        # Spawn 3 distinct objects within reachable workspace
        # Reachable workspace radius is roughly [0.4, 1.7] with y > 0.2
        self.objects = []
        occupied_positions = []

        colors_to_use = list(COLORS.keys())
        random.shuffle(colors_to_use)
        shapes_to_use = list(SHAPES)
        random.shuffle(shapes_to_use)

        for i in range(3):
            # Find a non-overlapping reachable spawn coordinate
            for _ in range(50):
                r = random.uniform(0.65, 1.45)
                angle = random.uniform(math.pi * 0.15, math.pi * 0.85)
                ox = r * math.cos(angle)
                oy = r * math.sin(angle)

                # Ensure not colliding with obstacle
                obs = self.obstacles[0]
                if math.hypot(ox - obs["x"], oy - obs["y"]) < (obs["radius"] + 0.18):
                    continue

                # Ensure not overlapping with existing objects
                if any(math.hypot(ox - px, oy - py) < 0.28 for px, py in occupied_positions):
                    continue

                occupied_positions.append((ox, oy))
                break
            else:
                # Fallback fixed position
                ox, oy = ((-0.7 + i * 0.7), 0.7)

            self.objects.append(
                {
                    "id": f"obj_{i}",
                    "shape": shapes_to_use[i % len(shapes_to_use)],
                    "color": colors_to_use[i % len(colors_to_use)],
                    "x": ox,
                    "y": oy,
                    "radius": 0.08,
                    "is_grasped": False,
                }
            )

        # Apply specific target constraints if passed, or default to task
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
            self.target_object_idx = 0

        if target_bin and target_bin in RECEPTACLES:
            self.target_receptacle_key = target_bin
        else:
            # Task presets
            if task_id == 1:
                self.target_receptacle_key = "blue_bin"
            elif task_id == 2:
                self.target_receptacle_key = "red_bin"
            else:
                self.target_receptacle_key = "green_bin"

        self.goal_pos = RECEPTACLES[self.target_receptacle_key]["pos"]

        return self.get_observation()

    def get_observation(self) -> Dict[str, Any]:
        """Return full structured state observation."""
        if not self.objects:
            self.reset()
        fk = self.kinematics.forward_kinematics(self.theta1, self.theta2)
        ee_x, ee_y = fk["ee"]
        w = self.kinematics.manipulability(self.theta2)

        target_obj = self.objects[self.target_object_idx]
        obj_x, obj_y = target_obj["x"], target_obj["y"]
        gx, gy = self.goal_pos

        dist_ee_obj = math.hypot(ee_x - obj_x, ee_y - obj_y)
        dist_obj_goal = math.hypot(obj_x - gx, obj_y - gy)

        # Numerical vector representation for DRL
        vector_state = np.array(
            [
                self.theta1 / math.pi,
                self.theta2 / math.pi,
                (self.theta1 - self.prev_theta1) / self.delta_theta,
                (self.theta2 - self.prev_theta2) / self.delta_theta,
                ee_x / self.kinematics.max_reach,
                ee_y / self.kinematics.max_reach,
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
            "manipulability": float(w),
            "gripper_closed": self.gripper_closed,
            "grasped_idx": self.grasped_object_idx,
            "target_idx": self.target_object_idx,
            "objects": [dict(o) for o in self.objects],
            "goal_pos": [float(p) for p in self.goal_pos],
            "goal_key": self.target_receptacle_key,
            "dist_ee_obj": float(dist_ee_obj),
            "dist_obj_goal": float(dist_obj_goal),
            "step": self.current_step,
        }

    def step(self, action: int) -> Tuple[Dict[str, Any], float, bool, bool, Dict[str, Any]]:
        """Execute one discrete action in the environment.

        Returns:
            (observation, reward, terminated, truncated, info)
        """
        self.current_step += 1
        self.prev_theta1 = self.theta1
        self.prev_theta2 = self.theta2

        fk_before = self.kinematics.forward_kinematics(self.theta1, self.theta2)
        target_obj = self.objects[self.target_object_idx]
        prev_dist_ee_obj = math.hypot(
            fk_before["ee"][0] - target_obj["x"], fk_before["ee"][1] - target_obj["y"]
        )
        prev_dist_obj_goal = math.hypot(
            target_obj["x"] - self.goal_pos[0], target_obj["y"] - self.goal_pos[1]
        )

        # Apply action
        invalid_grasp_attempt = False
        if action == 0:
            self.theta1 += self.delta_theta
        elif action == 1:
            self.theta1 -= self.delta_theta
        elif action == 2:
            self.theta2 += self.delta_theta
        elif action == 3:
            self.theta2 -= self.delta_theta
        elif action == 4:
            # Toggle gripper
            self.gripper_closed = not self.gripper_closed
            if self.gripper_closed and self.grasped_object_idx is None:
                # Try to grasp target object or nearby object
                ee_x, ee_y = fk_before["ee"]
                for idx, obj in enumerate(self.objects):
                    if math.hypot(ee_x - obj["x"], ee_y - obj["y"]) < 0.16:
                        self.grasped_object_idx = idx
                        obj["is_grasped"] = True
                        break
                else:
                    invalid_grasp_attempt = True
            elif not self.gripper_closed and self.grasped_object_idx is not None:
                # Release grasped object
                self.objects[self.grasped_object_idx]["is_grasped"] = False
                self.grasped_object_idx = None
        elif action == 5:
            # Micro-align action
            self.theta1 += self.delta_theta * 0.5
            self.theta2 -= self.delta_theta * 0.5
        elif action == 6:
            # Idle / Hold
            pass

        # Clamp joint angles to mechanical physical limits
        self.theta1, self.theta2 = self.kinematics.clamp_angles(self.theta1, self.theta2)

        # New forward kinematics
        fk_after = self.kinematics.forward_kinematics(self.theta1, self.theta2)
        ee_x, ee_y = fk_after["ee"]

        # If object is grasped, move it synchronously with end-effector
        if self.grasped_object_idx is not None:
            self.objects[self.grasped_object_idx]["x"] = ee_x
            self.objects[self.grasped_object_idx]["y"] = ee_y

        # Check collision with obstacle
        obs = self.obstacles[0]
        collision = self.kinematics.check_collision_circle(
            self.theta1, self.theta2, obs["x"], obs["y"], obs["radius"]
        )

        # Updated distances
        curr_dist_ee_obj = math.hypot(ee_x - target_obj["x"], ee_y - target_obj["y"])
        curr_dist_obj_goal = math.hypot(
            target_obj["x"] - self.goal_pos[0], target_obj["y"] - self.goal_pos[1]
        )

        # --- RESEARCH-GRADE MULTI-OBJECTIVE REWARD SHAPING ---
        reward = 0.0

        # 1. Step time penalty (promotes efficient shortest paths)
        reward -= self.supervisory_weights["step_penalty"]

        # 2. Angular jerk / torque acceleration penalty
        d_theta1 = self.theta1 - self.prev_theta1
        d_theta2 = self.theta2 - self.prev_theta2
        jerk = (d_theta1**2 + d_theta2**2) * 5.0
        reward -= self.supervisory_weights["jerk_penalty"] * jerk

        # 3. Dense distance shaping
        if self.grasped_object_idx is None:
            # Pre-grasp phase: minimize distance from end-effector to object
            dist_delta = prev_dist_ee_obj - curr_dist_ee_obj
            reward += dist_delta * 12.0
            # Small proximity reward
            reward += math.exp(-3.0 * curr_dist_ee_obj) * 0.5
        else:
            # Post-grasp transport phase: reward moving grasped object to goal
            reward += 1.0  # Holding bonus
            dist_goal_delta = prev_dist_obj_goal - curr_dist_obj_goal
            reward += dist_goal_delta * 18.0
            reward += math.exp(-3.0 * curr_dist_obj_goal) * 1.0

        # 4. Invalid grasp penalty
        if invalid_grasp_attempt:
            reward -= 2.5

        # 5. Singularity avoidance penalty
        w = self.kinematics.manipulability(self.theta2)
        if w < 0.05:
            reward -= 1.0

        # 6. Obstacle collision penalty
        if collision:
            reward -= self.supervisory_weights["collision_penalty"]

        # 7. Success check
        target_receptacle = RECEPTACLES[self.target_receptacle_key]
        placed_in_goal = (
            curr_dist_obj_goal < target_receptacle["radius"]
            and self.grasped_object_idx is None
            and self.current_step > 5
        )

        success = False
        terminated = False
        if placed_in_goal:
            reward += 60.0
            success = True
            terminated = True
        elif collision:
            terminated = True

        truncated = self.current_step >= self.max_steps

        # Log telemetry record
        telemetry = {
            "step": self.current_step,
            "action": action,
            "ee": (ee_x, ee_y),
            "thetas": (self.theta1, self.theta2),
            "reward": reward,
            "collision": collision,
            "success": success,
            "is_grasped": self.grasped_object_idx is not None,
            "dist_goal": curr_dist_obj_goal,
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
        """Sparse/Dense Goal-conditioned reward for Hindsight Experience Replay."""
        d = math.hypot(achieved_pos[0] - desired_pos[0], achieved_pos[1] - desired_pos[1])
        if d < 0.18:
            return 1.0  # Success under retroactively assigned goal
        return -0.05 * d
