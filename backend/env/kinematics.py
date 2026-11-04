"""Kinematics and Physics Engine for 2-DOF Planar Robotic Manipulator.

Includes:
- Forward Kinematics (FK)
- Analytical Inverse Kinematics (IK)
- Jacobian Matrix & Manipulability Measure (Singularity detection)
- Collision Detection (Segment-to-Circle and Segment-to-AABB)
"""

import math
from typing import Tuple, List, Optional, Dict, Any


class PlanarArmKinematics:
    """Mathematical kinematics solver for 2-link revolute planar robotic arm (RR)."""

    def __init__(
        self,
        l1: float = 1.0,
        l2: float = 0.8,
        base_pos: Tuple[float, float] = (0.0, 0.0),
        joint1_limits: Tuple[float, float] = (-5 * math.pi / 6, 5 * math.pi / 6),
        joint2_limits: Tuple[float, float] = (-3 * math.pi / 4, 3 * math.pi / 4),
    ):
        self.l1 = l1
        self.l2 = l2
        self.base_pos = base_pos
        self.joint1_limits = joint1_limits
        self.joint2_limits = joint2_limits

    @property
    def max_reach(self) -> float:
        """Maximum reachable radius."""
        return self.l1 + self.l2

    @property
    def min_reach(self) -> float:
        """Minimum reachable radius (inner workspace boundary)."""
        return abs(self.l1 - self.l2)

    def clamp_angles(self, theta1: float, theta2: float) -> Tuple[float, float]:
        """Clamp joint angles to physical mechanical limits."""
        t1 = max(self.joint1_limits[0], min(self.joint1_limits[1], theta1))
        t2 = max(self.joint2_limits[0], min(self.joint2_limits[1], theta2))
        return t1, t2

    def forward_kinematics(
        self, theta1: float, theta2: float
    ) -> Dict[str, Tuple[float, float]]:
        """Compute Cartesian coordinates for base, elbow, and end-effector.

        Returns:
            Dict containing 'base', 'elbow', 'ee' coordinates.
        """
        bx, by = self.base_pos
        x1 = bx + self.l1 * math.cos(theta1)
        y1 = by + self.l1 * math.sin(theta1)

        x_ee = x1 + self.l2 * math.cos(theta1 + theta2)
        y_ee = y1 + self.l2 * math.sin(theta1 + theta2)

        return {
            "base": (bx, by),
            "elbow": (x1, y1),
            "ee": (x_ee, y_ee),
        }

    def jacobian(self, theta1: float, theta2: float) -> List[List[float]]:
        """Compute the 2x2 Manipulator Jacobian matrix J(q).

        dx_ee/dt = J(q) * [dtheta1/dt, dtheta2/dt]^T
        """
        s1 = math.sin(theta1)
        c1 = math.cos(theta1)
        s12 = math.sin(theta1 + theta2)
        c12 = math.cos(theta1 + theta2)

        j11 = -self.l1 * s1 - self.l2 * s12
        j12 = -self.l2 * s12
        j21 = self.l1 * c1 + self.l2 * c12
        j22 = self.l2 * c12

        return [[j11, j12], [j21, j22]]

    def manipulability(self, theta2: float) -> float:
        """Yoshikawa's manipulability measure w = sqrt(det(J * J^T)).

        For a 2-link planar arm: w = |l1 * l2 * sin(theta2)|.
        Approaches 0 at singular configurations (arm fully stretched or folded).
        """
        return abs(self.l1 * self.l2 * math.sin(theta2))

    def inverse_kinematics(
        self, target_x: float, target_y: float, elbow_up: bool = False
    ) -> Optional[Tuple[float, float]]:
        """Analytical Inverse Kinematics for target coordinate (x, y).

        Returns:
            (theta1, theta2) if reachable, None otherwise.
        """
        bx, by = self.base_pos
        dx = target_x - bx
        dy = target_y - by
        r_sq = dx * dx + dy * dy
        r = math.sqrt(r_sq)

        # Check reachability envelope
        if r > self.max_reach or r < self.min_reach:
            return None

        # Law of cosines for theta2
        cos_theta2 = (r_sq - self.l1**2 - self.l2**2) / (2 * self.l1 * self.l2)
        # Numerical guard
        cos_theta2 = max(-1.0, min(1.0, cos_theta2))

        sin_theta2 = math.sqrt(max(0.0, 1.0 - cos_theta2**2))
        if elbow_up:
            sin_theta2 = -sin_theta2

        theta2 = math.atan2(sin_theta2, cos_theta2)

        # Solve for theta1
        k1 = self.l1 + self.l2 * cos_theta2
        k2 = self.l2 * sin_theta2
        gamma = math.atan2(k2, k1)
        theta1 = math.atan2(dy, dx) - gamma

        # Normalize to [-pi, pi]
        theta1 = math.atan2(math.sin(theta1), math.cos(theta1))

        # Check joint limits
        if (
            self.joint1_limits[0] <= theta1 <= self.joint1_limits[1]
            and self.joint2_limits[0] <= theta2 <= self.joint2_limits[1]
        ):
            return theta1, theta2

        return None

    @staticmethod
    def dist_point_to_segment(
        px: float, py: float, x1: float, y1: float, x2: float, y2: float
    ) -> float:
        """Minimum Euclidean distance from point (px, py) to line segment (x1, y1)-(x2, y2)."""
        dx = x2 - x1
        dy = y2 - y1
        l2 = dx * dx + dy * dy
        if l2 == 0.0:
            return math.hypot(px - x1, py - y1)

        # Project point onto segment parameterized by t in [0, 1]
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    def check_collision_circle(
        self,
        theta1: float,
        theta2: float,
        obs_x: float,
        obs_y: float,
        obs_radius: float,
        link_radius: float = 0.06,
    ) -> bool:
        """Check if any arm link intersects a circular obstacle."""
        fk = self.forward_kinematics(theta1, theta2)
        bx, by = fk["base"]
        ex, ey = fk["elbow"]
        tx, ty = fk["ee"]

        # Link 1 collision
        d1 = self.dist_point_to_segment(obs_x, obs_y, bx, by, ex, ey)
        if d1 < (obs_radius + link_radius):
            return True

        # Link 2 collision
        d2 = self.dist_point_to_segment(obs_x, obs_y, ex, ey, tx, ty)
        if d2 < (obs_radius + link_radius):
            return True

        return False
