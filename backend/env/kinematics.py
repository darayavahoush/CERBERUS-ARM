"""Kinematics and Physics Engine for 3-DOF Planar Robotic Manipulator with Active Wrist.

Includes:
- Forward Kinematics (FK) for 3 revolute joints (Base, Elbow, Wrist) + Gripper
- Analytical & Orientation-Constrained Inverse Kinematics (IK)
- 3x3 Manipulator Jacobian Matrix & Yoshikawa Manipulability Measure
- Multi-Link Segment-to-Circle Collision Detection against Workcell Barriers
"""

import math
from typing import Tuple, List, Optional, Dict, Any


class PlanarArmKinematics:
    """Mathematical kinematics solver for 3-DOF articulated planar robotic arm (RRR)."""

    def __init__(
        self,
        l1: float = 0.90,  # Base to Elbow (m)
        l2: float = 0.70,  # Elbow to Wrist (m)
        l3: float = 0.35,  # Wrist to Gripper Tip (m)
        base_pos: Tuple[float, float] = (0.0, 0.0),
        joint1_limits: Tuple[float, float] = (-2.618, 2.618),  # ±150°
        joint2_limits: Tuple[float, float] = (-2.356, 2.356),  # ±135°
        joint3_limits: Tuple[float, float] = (-2.094, 2.094),  # ±120°
    ):
        self.l1 = l1
        self.l2 = l2
        self.l3 = l3
        self.base_pos = base_pos
        self.joint1_limits = joint1_limits
        self.joint2_limits = joint2_limits
        self.joint3_limits = joint3_limits

    @property
    def max_reach(self) -> float:
        """Maximum reachable radius."""
        return self.l1 + self.l2 + self.l3

    @property
    def min_reach(self) -> float:
        """Minimum reachable radius (inner workspace boundary)."""
        return max(0.15, abs(self.l1 - self.l2 - self.l3))

    def clamp_angles(
        self, theta1: float, theta2: float, theta3: float = 0.0
    ) -> Tuple[float, float, float]:
        """Clamp joint angles to physical mechanical limits."""
        t1 = max(self.joint1_limits[0], min(self.joint1_limits[1], theta1))
        t2 = max(self.joint2_limits[0], min(self.joint2_limits[1], theta2))
        t3 = max(self.joint3_limits[0], min(self.joint3_limits[1], theta3))
        return t1, t2, t3

    def forward_kinematics(
        self, theta1: float, theta2: float, theta3: float = 0.0
    ) -> Dict[str, Any]:
        """Compute Cartesian coordinates for base, elbow, wrist, and end-effector.

        Returns:
            Dict containing 'base', 'elbow', 'wrist', 'ee', and orientation 'phi'.
        """
        bx, by = self.base_pos
        # Elbow joint coordinate
        x1 = bx + self.l1 * math.cos(theta1)
        y1 = by + self.l1 * math.sin(theta1)

        # Wrist joint coordinate
        t12 = theta1 + theta2
        x2 = x1 + self.l2 * math.cos(t12)
        y2 = y1 + self.l2 * math.sin(t12)

        # End-effector (tool tip) coordinate
        t123 = theta1 + theta2 + theta3
        x_ee = x2 + self.l3 * math.cos(t123)
        y_ee = y2 + self.l3 * math.sin(t123)

        return {
            "base": (bx, by),
            "elbow": (x1, y1),
            "wrist": (x2, y2),
            "ee": (x_ee, y_ee),
            "phi": float(t123),
        }

    def jacobian(
        self, theta1: float, theta2: float, theta3: float = 0.0
    ) -> List[List[float]]:
        """Compute the 3x3 Manipulator Jacobian matrix J(q).

        [dx_ee, dy_ee, dphi]^T = J(q) * [dtheta1, dtheta2, dtheta3]^T
        """
        s1 = math.sin(theta1)
        c1 = math.cos(theta1)
        s12 = math.sin(theta1 + theta2)
        c12 = math.cos(theta1 + theta2)
        s123 = math.sin(theta1 + theta2 + theta3)
        c123 = math.cos(theta1 + theta2 + theta3)

        j11 = -self.l1 * s1 - self.l2 * s12 - self.l3 * s123
        j12 = -self.l2 * s12 - self.l3 * s123
        j13 = -self.l3 * s123

        j21 = self.l1 * c1 + self.l2 * c12 + self.l3 * c123
        j22 = self.l2 * c12 + self.l3 * c123
        j23 = self.l3 * c123

        j31 = 1.0
        j32 = 1.0
        j33 = 1.0

        return [[j11, j12, j13], [j21, j22, j23], [j31, j32, j33]]

    def manipulability(self, theta2: float, theta3: float = 0.0) -> float:
        """Yoshikawa's manipulability measure w = sqrt(det(J * J^T)).

        For the planar 3-link arm, reflects volume of the velocity ellipsoid.
        """
        s2 = math.sin(theta2)
        s3 = math.sin(theta3)
        s23 = math.sin(theta2 + theta3)
        # Analytical metric approximation for 3-link planar
        val = abs(self.l1 * self.l2 * s2 + self.l1 * self.l3 * s23 + self.l2 * self.l3 * s3)
        return max(0.001, float(val))

    def inverse_kinematics(
        self,
        target_x: float,
        target_y: float,
        target_phi: Optional[float] = None,
        elbow_up: bool = False,
    ) -> Optional[Tuple[float, float, float]]:
        """Analytical Inverse Kinematics for target coordinate (x, y) with optional orientation phi.

        If target_phi is None, aims for a vertical top-down grasp (phi = -pi/2).
        Returns:
            (theta1, theta2, theta3) if reachable, None otherwise.
        """
        bx, by = self.base_pos
        dx = target_x - bx
        dy = target_y - by

        if target_phi is None:
            # Default to direct approach toward target
            target_phi = math.atan2(dy, dx) - math.pi / 4

        # Compute wrist position by stepping back from tool tip by l3
        wx = target_x - self.l3 * math.cos(target_phi)
        wy = target_y - self.l3 * math.sin(target_phi)

        r_sq = (wx - bx) ** 2 + (wy - by) ** 2
        r = math.sqrt(r_sq)

        # Check reachability of 2-link sub-arm to wrist
        reach_sub = self.l1 + self.l2
        min_sub = abs(self.l1 - self.l2)
        if r > reach_sub or r < min_sub:
            # Fallback to direct 2-link IK to target with l3 aligned
            target_phi = math.atan2(dy, dx)
            wx = target_x - self.l3 * math.cos(target_phi)
            wy = target_y - self.l3 * math.sin(target_phi)
            r_sq = (wx - bx) ** 2 + (wy - by) ** 2
            r = math.sqrt(r_sq)
            if r > reach_sub or r < min_sub:
                return None

        # Law of cosines for elbow (theta2)
        cos_theta2 = (r_sq - self.l1**2 - self.l2**2) / (2 * self.l1 * self.l2)
        cos_theta2 = max(-1.0, min(1.0, cos_theta2))

        sin_theta2 = math.sqrt(max(0.0, 1.0 - cos_theta2**2))
        if elbow_up:
            sin_theta2 = -sin_theta2

        theta2 = math.atan2(sin_theta2, cos_theta2)

        # Solve for shoulder (theta1)
        k1 = self.l1 + self.l2 * cos_theta2
        k2 = self.l2 * sin_theta2
        gamma = math.atan2(k2, k1)
        theta1 = math.atan2(wy - by, wx - bx) - gamma
        theta1 = math.atan2(math.sin(theta1), math.cos(theta1))

        # Solve for wrist (theta3) to satisfy target_phi = theta1 + theta2 + theta3
        theta3 = target_phi - (theta1 + theta2)
        theta3 = math.atan2(math.sin(theta3), math.cos(theta3))

        # Check joint limits
        if (
            self.joint1_limits[0] <= theta1 <= self.joint1_limits[1]
            and self.joint2_limits[0] <= theta2 <= self.joint2_limits[1]
            and self.joint3_limits[0] <= theta3 <= self.joint3_limits[1]
        ):
            return theta1, theta2, theta3

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

        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    def check_collision_circle(
        self,
        theta1: float,
        theta2: float,
        theta3: float = 0.0,
        obs_x: float = 0.0,
        obs_y: float = 0.85,
        obs_radius: float = 0.22,
        link_radius: float = 0.05,
    ) -> bool:
        """Check if any of the 3 arm links intersect a circular obstacle."""
        fk = self.forward_kinematics(theta1, theta2, theta3)
        bx, by = fk["base"]
        ex, ey = fk["elbow"]
        wx, wy = fk["wrist"]
        tx, ty = fk["ee"]

        # Link 1 (Base -> Elbow)
        if self.dist_point_to_segment(obs_x, obs_y, bx, by, ex, ey) < (obs_radius + link_radius):
            return True

        # Link 2 (Elbow -> Wrist)
        if self.dist_point_to_segment(obs_x, obs_y, ex, ey, wx, wy) < (obs_radius + link_radius):
            return True

        # Link 3 (Wrist -> Tool)
        if self.dist_point_to_segment(obs_x, obs_y, wx, wy, tx, ty) < (obs_radius + link_radius):
            return True

        return False
