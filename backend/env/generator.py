"""Synthetic Visual Workspace Renderer and Dataset Generator for CNN Perception.

Renders 2D workspace scenes into RGB images with:
- Robotic arm links, joints, and gripper.
- Objects with distinct geometries (cube, sphere, triangle, star) and colors.
- Destination receptacles and obstacles.
- Ground truth annotations: bounding boxes, centroid coordinates, shape/color labels.
"""

import math
import random
from typing import Dict, Any, List, Tuple
import numpy as np
from PIL import Image, ImageDraw


# RGB Color Constants
COLOR_RGB = {
    "crimson": (239, 68, 68),
    "cobalt": (59, 130, 246),
    "emerald": (16, 185, 129),
    "amber": (245, 158, 11),
}
SHAPE_CLASSES = ["cube", "sphere", "triangle", "star"]
COLOR_CLASSES = ["crimson", "cobalt", "emerald", "amber"]


class WorkspaceRenderer:
    """Renders 2D workspace simulation into high-contrast synthetic camera frames."""

    def __init__(self, width: int = 256, height: int = 256):
        self.width = width
        self.height = height
        # Coordinate mapping: World [-2.2, 2.2] x [-0.4, 2.2] -> Pixels [0, W] x [H, 0]
        self.x_min, self.x_max = -2.2, 2.2
        self.y_min, self.y_max = -0.4, 2.2

    def world_to_pixel(self, wx: float, wy: float) -> Tuple[int, int]:
        """Convert world coordinates (meters) to pixel coordinates."""
        px = int((wx - self.x_min) / (self.x_max - self.x_min) * self.width)
        # Flip Y for standard graphics screen coords
        py = int((self.y_max - wy) / (self.y_max - self.y_min) * self.height)
        return max(0, min(self.width - 1, px)), max(0, min(self.height - 1, py))

    def pixel_to_world(self, px: int, py: int) -> Tuple[float, float]:
        """Convert pixel coordinates to world coordinates (meters)."""
        wx = self.x_min + (px / self.width) * (self.x_max - self.x_min)
        wy = self.y_max - (py / self.height) * (self.y_max - self.y_min)
        return wx, wy

    def render_scene(
        self,
        fk: Dict[str, Tuple[float, float]],
        objects: List[Dict[str, Any]],
        obstacles: List[Dict[str, Any]],
        receptacles: Dict[str, Any],
        gripper_closed: bool = False,
    ) -> Image.Image:
        """Render complete simulation frame as a PIL Image."""
        # Dark industrial slate background
        img = Image.new("RGB", (self.width, self.height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        # Draw grid lines
        for gx in np.linspace(self.x_min, self.x_max, 11):
            p1 = self.world_to_pixel(gx, self.y_min)
            p2 = self.world_to_pixel(gx, self.y_max)
            draw.line([p1, p2], fill=(30, 41, 59), width=1)
        for gy in np.linspace(self.y_min, self.y_max, 11):
            p1 = self.world_to_pixel(self.x_min, gy)
            p2 = self.world_to_pixel(self.x_max, gy)
            draw.line([p1, p2], fill=(30, 41, 59), width=1)

        # Draw Receptacles / Bins
        for key, rec in receptacles.items():
            cx, cy = self.world_to_pixel(rec["pos"][0], rec["pos"][1])
            rad_px = int(rec["radius"] / (self.x_max - self.x_min) * self.width)
            col = COLOR_RGB.get(rec["color"], (148, 163, 184))
            draw.ellipse(
                [cx - rad_px, cy - rad_px, cx + rad_px, cy + rad_px],
                fill=(col[0] // 4, col[1] // 4, col[2] // 4),
                outline=col,
                width=2,
            )

        # Draw Obstacles (Hazard Pillars)
        for obs in obstacles:
            ox, oy = self.world_to_pixel(obs["x"], obs["y"])
            rad_px = int(obs["radius"] / (self.x_max - self.x_min) * self.width)
            draw.ellipse(
                [ox - rad_px, oy - rad_px, ox + rad_px, oy + rad_px],
                fill=(69, 10, 10),
                outline=(239, 68, 68),
                width=2,
            )

        # Draw Objects
        for obj in objects:
            ox, oy = self.world_to_pixel(obj["x"], obj["y"])
            rad_px = max(6, int(obj["radius"] / (self.x_max - self.x_min) * self.width))
            col = COLOR_RGB.get(obj["color"], (255, 255, 255))
            shape = obj.get("shape", "cube")

            if shape == "cube":
                draw.rectangle(
                    [ox - rad_px, oy - rad_px, ox + rad_px, oy + rad_px],
                    fill=col,
                    outline=(255, 255, 255),
                    width=1,
                )
            elif shape == "sphere":
                draw.ellipse(
                    [ox - rad_px, oy - rad_px, ox + rad_px, oy + rad_px],
                    fill=col,
                    outline=(255, 255, 255),
                    width=1,
                )
            elif shape == "triangle":
                pts = [
                    (ox, oy - rad_px),
                    (ox - rad_px, oy + rad_px),
                    (ox + rad_px, oy + rad_px),
                ]
                draw.polygon(pts, fill=col, outline=(255, 255, 255))
            elif shape == "star":
                pts = [
                    (ox, oy - rad_px - 2),
                    (ox + rad_px // 2, oy - rad_px // 2),
                    (ox + rad_px + 2, oy),
                    (ox + rad_px // 2, oy + rad_px // 2),
                    (ox, oy + rad_px + 2),
                    (ox - rad_px // 2, oy + rad_px // 2),
                    (ox - rad_px - 2, oy),
                    (ox - rad_px // 2, oy - rad_px // 2),
                ]
                draw.polygon(pts, fill=col, outline=(255, 255, 255))

        # Draw Robotic Arm Links & Joints
        bx, by = self.world_to_pixel(fk["base"][0], fk["base"][1])
        ex, ey = self.world_to_pixel(fk["elbow"][0], fk["elbow"][1])
        tx, ty = self.world_to_pixel(fk["ee"][0], fk["ee"][1])

        # Link 1
        draw.line([bx, by, ex, ey], fill=(56, 189, 248), width=6)
        # Link 2
        draw.line([ex, ey, tx, ty], fill=(6, 182, 212), width=5)

        # Joints
        draw.ellipse([bx - 8, by - 8, bx + 8, by + 8], fill=(14, 165, 233), outline=(255, 255, 255), width=2)
        draw.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=(56, 189, 248), outline=(255, 255, 255), width=2)

        # Gripper
        grip_col = (244, 63, 94) if gripper_closed else (16, 185, 129)
        draw.ellipse([tx - 5, ty - 5, tx + 5, ty + 5], fill=grip_col, outline=(255, 255, 255), width=1)

        return img

    def generate_synthetic_dataset(
        self, num_samples: int = 300
    ) -> List[Dict[str, Any]]:
        """Generate labeled dataset for training the CoordConv Multi-Task CNN."""
        dataset = []
        for _ in range(num_samples):
            # Sample random object position in upper reachable region
            ox = random.uniform(-1.5, 1.5)
            oy = random.uniform(0.3, 1.8)
            shape = random.choice(SHAPE_CLASSES)
            color = random.choice(COLOR_CLASSES)

            # Dummy base/elbow/ee
            fk = {
                "base": (0.0, 0.0),
                "elbow": (0.5, 0.8),
                "ee": (1.0, 1.2),
            }
            objects = [{"x": ox, "y": oy, "radius": 0.08, "shape": shape, "color": color}]
            obstacles = [{"x": 0.0, "y": 0.85, "radius": 0.22}]
            receptacles = {
                "b1": {"pos": (-1.2, 0.45), "color": "crimson", "radius": 0.22},
                "b2": {"pos": (1.2, 0.45), "color": "cobalt", "radius": 0.22},
            }

            img = self.render_scene(fk, objects, obstacles, receptacles)
            px, py = self.world_to_pixel(ox, oy)
            # Normalized coordinates [0, 1]
            norm_x = px / self.width
            norm_y = py / self.height

            dataset.append(
                {
                    "image": np.array(img, dtype=np.uint8),
                    "shape_label": SHAPE_CLASSES.index(shape),
                    "color_label": COLOR_CLASSES.index(color),
                    "coords": np.array([norm_x, norm_y], dtype=np.float32),
                }
            )

        return dataset
