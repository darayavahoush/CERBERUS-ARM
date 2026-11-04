"""Generates bespoke, research-grade organic illustrations for CERBERUS-ARM.

Creates:
1. head-eye.png (1200x900) - Macro robot workspace, colored objects, teal rim lighting
2. head-muscle.png (1200x900) - Robotic arm gripper gripping cube, violet lighting
3. head-brain.png (1200x900) - Blueprint sentence turning into PDDL graph, cobalt/yellow
4. architecture.png (1200x900) - Clean modular architecture schematic
5. console-screenshot.png (1600x1000) - High-res UI overview
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np


OUTPUT_DIR = "frontend/public/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def create_radial_gradient(width, height, center_x, center_y, color_center, color_edge):
    """Creates a smooth radial glow gradient array."""
    y, x = np.ogrid[:height, :width]
    dist_from_center = np.sqrt(((x - center_x) / width) ** 2 + ((y - center_y) / height) ** 2)
    dist_from_center = np.clip(dist_from_center * 1.5, 0, 1)

    r = color_center[0] * (1 - dist_from_center) + color_edge[0] * dist_from_center
    g = color_center[1] * (1 - dist_from_center) + color_edge[1] * dist_from_center
    b = color_center[2] * (1 - dist_from_center) + color_edge[2] * dist_from_center

    return np.dstack([r, g, b]).astype(np.uint8)


def generate_head_eye():
    """1. head-eye.png: Overhead macro photo of a robot arm workspace, small coloured cubes,

    spheres and stars on a matte grey table, soft teal rim light, shallow depth of field.
    """
    W, H = 1200, 900
    base = create_radial_gradient(W, H, W * 0.45, H * 0.5, (20, 35, 45), (10, 14, 20))
    img = Image.fromarray(base)
    draw = ImageDraw.Draw(img)

    # Soft ambient grid lines
    for x in range(0, W, 80):
        draw.line([(x, 0), (x, H)], fill=(25, 45, 55), width=1)
    for y in range(0, H, 80):
        draw.line([(0, y), (W, y)], fill=(25, 45, 55), width=1)

    # Teal sensor scan cone
    scan_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(scan_layer)
    s_draw.polygon([(W * 0.1, H * 0.1), (W * 0.85, H * 0.35), (W * 0.7, H * 0.85), (W * 0.05, H * 0.5)], fill=(13, 148, 136, 40))
    s_draw.ellipse([W * 0.35, H * 0.3, W * 0.75, H * 0.7], outline=(20, 184, 166, 120), width=2)
    scan_layer = scan_layer.filter(ImageFilter.GaussianBlur(8))
    img.paste(scan_layer, (0, 0), scan_layer)

    # Draw Macro Workspace Objects with depth, specular highlights, and colored glow
    # Crimson Cube
    cx, cy, s = 480, 420, 65
    draw.rectangle([cx - s, cy - s, cx + s, cy + s], fill=(225, 29, 72), outline=(251, 113, 133), width=2)
    draw.rectangle([cx - s + 6, cy - s + 6, cx - s + 24, cy - s + 24], fill=(254, 205, 211))  # Specular

    # Cobalt Sphere
    sx, sy, sr = 680, 360, 55
    draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(30, 64, 175), outline=(96, 165, 250), width=2)
    draw.ellipse([sx - 18, sy - 28, sx + 6, sy - 4], fill=(191, 219, 254))  # Specular

    # Emerald Triangle
    tx, ty, tr = 580, 580, 60
    draw.polygon([(tx, ty - tr), (tx - tr, ty + tr), (tx + tr, ty + tr)], fill=(5, 150, 105), outline=(52, 211, 153))
    draw.ellipse([tx - 8, ty - 20, tx + 8, ty - 4], fill=(167, 243, 208))

    # Amber Star
    ax, ay, ar = 320, 540, 50
    pts = []
    for i in range(10):
        r = ar if i % 2 == 0 else ar * 0.45
        ang = i * math.pi / 5 - math.pi / 2
        pts.append((ax + r * math.cos(ang), ay + r * math.sin(ang)))
    draw.polygon(pts, fill=(217, 119, 6), outline=(251, 191, 36))

    # Subtle Depth-of-field blur on peripheral objects
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=3))
    img.save(f"{OUTPUT_DIR}/head-eye.png", quality=95)
    print(f"[+] Generated {OUTPUT_DIR}/head-eye.png")


def generate_head_muscle():
    """2. head-muscle.png: Close-up of a two-joint industrial robot arm gripping a small cube,

    dramatic violet side light, dark background, clean product photography.
    """
    W, H = 1200, 900
    base = create_radial_gradient(W, H, W * 0.55, H * 0.45, (35, 20, 55), (10, 8, 16))
    img = Image.fromarray(base)
    draw = ImageDraw.Draw(img)

    # Violet light gradient bar on right
    v_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    v_draw = ImageDraw.Draw(v_layer)
    v_draw.ellipse([W * 0.5, H * 0.1, W * 1.1, H * 0.9], fill=(139, 92, 246, 50))
    v_layer = v_layer.filter(ImageFilter.GaussianBlur(35))
    img.paste(v_layer, (0, 0), v_layer)

    # Industrial Metallic Link 1 & Link 2
    # Base Joint Turntable
    bx, by = 260, 680
    draw.ellipse([bx - 90, by - 40, bx + 90, by + 40], fill=(24, 24, 27), outline=(161, 161, 170), width=3)
    draw.ellipse([bx - 60, by - 25, bx + 60, by + 25], fill=(39, 39, 42))

    # Upper Link (Brushed Titanium with violet specular)
    ex, ey = 560, 380
    draw.line([(bx, by - 20), (ex, ey)], fill=(63, 63, 70), width=48)
    draw.line([(bx, by - 20), (ex, ey)], fill=(168, 85, 247), width=6)  # Violet rim

    # Elbow Rotary Actuator
    draw.ellipse([ex - 45, ey - 45, ex + 45, ey + 45], fill=(24, 24, 27), outline=(212, 212, 216), width=3)
    draw.ellipse([ex - 22, ey - 22, ex + 22, ey + 22], fill=(124, 58, 237))

    # Forearm Link to Wrist
    wx, wy = 860, 480
    draw.line([(ex, ey), (wx, wy)], fill=(39, 39, 42), width=36)
    draw.line([(ex, ey), (wx, wy)], fill=(192, 132, 252), width=4)

    # Gripper Body & Dual Magnetic Fingers
    draw.rectangle([wx - 30, wy - 35, wx + 30, wy + 35], fill=(24, 24, 27), outline=(228, 228, 231), width=2)
    # Gripper jaws
    draw.rectangle([wx + 28, wy - 30, wx + 85, wy - 14], fill=(82, 82, 91), outline=(244, 244, 245))
    draw.rectangle([wx + 28, wy + 14, wx + 85, wy + 30], fill=(82, 82, 91), outline=(244, 244, 245))

    # Crimson Cube firmly grasped between fingers!
    cube_x, cube_y, cs = wx + 95, wy, 35
    draw.rectangle([cube_x - cs, cube_y - cs, cube_x + cs, cube_y + cs], fill=(225, 29, 72), outline=(251, 113, 133), width=2)
    # Magnetic field glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow)
    g_draw.ellipse([cube_x - 55, cube_y - 55, cube_x + 55, cube_y + 55], outline=(167, 139, 250, 160), width=3)
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    img.paste(glow, (0, 0), glow)

    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=2))
    img.save(f"{OUTPUT_DIR}/head-muscle.png", quality=95)
    print(f"[+] Generated {OUTPUT_DIR}/head-muscle.png")


def generate_head_brain():
    """3. head-brain.png: Abstract blueprint-style illustration of a sentence turning into

    a step plan, cobalt blue and white line art, yellow accent, no readable text.
    """
    W, H = 1200, 900
    base = create_radial_gradient(W, H, W * 0.45, H * 0.5, (27, 47, 142), (10, 15, 45))
    img = Image.fromarray(base)
    draw = ImageDraw.Draw(img)

    # Technical grid
    for x in range(0, W, 60):
        draw.line([(x, 0), (x, H)], fill=(30, 58, 138, 80), width=1)
    for y in range(0, H, 60):
        draw.line([(0, y), (W, y)], fill=(30, 58, 138, 80), width=1)

    # Natural Language Text Waveform (Left)
    lx = 140
    for i, length in enumerate([180, 260, 220, 290, 160]):
        y = 320 + i * 36
        draw.line([(lx, y), (lx + length, y)], fill=(245, 197, 24), width=5)
        draw.ellipse([lx - 12, y - 6, lx, y + 6], fill=(245, 197, 24))

    # Flowing Neural Connections from Text to Parser
    flow_x1, flow_x2 = 470, 620
    for i in range(5):
        y1 = 320 + i * 36
        y2 = 280 + i * 70
        draw.line([(flow_x1, y1), (flow_x2, y2)], fill=(147, 197, 253), width=2)
        draw.ellipse([flow_x1, y1 - 4, flow_x1 + 8, y1 + 4], fill=(255, 255, 255))
        draw.ellipse([flow_x2 - 8, y2 - 4, flow_x2, y2 + 4], fill=(245, 197, 24))

    # Structured PDDL Subgoal Stack (Right)
    rx = 640
    steps = [
        {"w": 380, "col": (245, 197, 24)},  # Signal yellow
        {"w": 420, "col": (255, 255, 255)},
        {"w": 400, "col": (255, 255, 255)},
        {"w": 440, "col": (96, 165, 250)},
    ]
    for idx, step in enumerate(steps):
        sy = 260 + idx * 72
        # Card outline
        draw.rectangle([rx, sy, rx + step["w"], sy + 52], fill=(15, 23, 42), outline=step["col"], width=2)
        # Sequence indicator
        draw.ellipse([rx + 18, sy + 16, rx + 38, sy + 36], fill=step["col"])
        # Abstract token bars
        draw.line([(rx + 56, sy + 26), (rx + 240, sy + 26)], fill=(255, 255, 255), width=4)
        draw.line([(rx + 260, sy + 26), (rx + 330, sy + 26)], fill=(147, 197, 253), width=3)

    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=2))
    img.save(f"{OUTPUT_DIR}/head-brain.png", quality=95)
    print(f"[+] Generated {OUTPUT_DIR}/head-brain.png")


def generate_architecture():
    """4. architecture.png: Clean architecture diagram: instruction -> planner -> vision ->

    agent -> arm -> dashboard. Cobalt (#1B2F8E) and white, yellow (#F5C518) accents.
    """
    W, H = 1200, 900
    base = create_radial_gradient(W, H, W * 0.5, H * 0.5, (27, 47, 142), (11, 19, 43))
    img = Image.fromarray(base)
    draw = ImageDraw.Draw(img)

    # Grid
    for x in range(0, W, 60):
        draw.line([(x, 0), (x, H)], fill=(37, 65, 138), width=1)
    for y in range(0, H, 60):
        draw.line([(0, y), (W, y)], fill=(37, 65, 138), width=1)

    nodes = [
        {"x": 100, "y": 400, "title": "INSTRUCTION", "sub": "Plain text task", "border": (245, 197, 24)},
        {"x": 300, "y": 400, "title": "OLLAMA LLM", "sub": "PDDL Compiler", "border": (255, 255, 255)},
        {"x": 520, "y": 260, "title": "COORDCONV CNN", "sub": "Spatial Perception", "border": (13, 148, 136)},
        {"x": 520, "y": 540, "title": "D3QN + HER", "sub": "Decoupled Advantage", "border": (139, 92, 246)},
        {"x": 760, "y": 400, "title": "2-DOF ROBOT ARM", "sub": "MuJoCo 3D Physics", "border": (255, 255, 255)},
        {"x": 980, "y": 400, "title": "DASHBOARD", "sub": "React 19 Telemetry", "border": (245, 197, 24)},
    ]

    # Draw Arrows between nodes
    def draw_arrow(x1, y1, x2, y2, color):
        draw.line([(x1, y1), (x2, y2)], fill=color, width=3)
        # Arrowhead
        ang = math.atan2(y2 - y1, x2 - x1)
        al = 12
        p1 = (x2 - al * math.cos(ang - math.pi / 6), y2 - al * math.sin(ang - math.pi / 6))
        p2 = (x2 - al * math.cos(ang + math.pi / 6), y2 - al * math.sin(ang + math.pi / 6))
        draw.polygon([(x2, y2), p1, p2], fill=color)

    # Instruction -> Ollama
    draw_arrow(230, 440, 290, 440, (245, 197, 24))
    # Ollama -> CoordConv
    draw_arrow(430, 410, 510, 310, (255, 255, 255))
    # Ollama -> D3QN
    draw_arrow(430, 470, 510, 570, (255, 255, 255))
    # CoordConv -> D3QN
    draw_arrow(595, 360, 595, 530, (13, 148, 136))
    # D3QN -> Robot Arm
    draw_arrow(670, 570, 750, 470, (139, 92, 246))
    # CoordConv -> Robot Arm
    draw_arrow(670, 310, 750, 410, (13, 148, 136))
    # Robot Arm -> Dashboard
    draw_arrow(890, 440, 970, 440, (245, 197, 24))

    # Draw Node Boxes
    for n in nodes:
        w, h = 130, 80
        draw.rectangle([n["x"], n["y"], n["x"] + w, n["y"] + h], fill=(15, 23, 42), outline=n["border"], width=2)
        # Inner decorative line
        draw.line([(n["x"] + 10, n["y"] + 36), (n["x"] + w - 10, n["y"] + 36)], fill=(51, 65, 85), width=1)
        # Text
        draw.text((n["x"] + 12, n["y"] + 14), n["title"][:14], fill=(255, 255, 255))
        draw.text((n["x"] + 12, n["y"] + 46), n["sub"][:16], fill=(148, 163, 184))

    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=2))
    img.save(f"{OUTPUT_DIR}/architecture.png", quality=95)
    print(f"[+] Generated {OUTPUT_DIR}/architecture.png")


def generate_console_screenshot():
    """5. console-screenshot.png: High-resolution clean overview of the console with 3D/2D views."""
    W, H = 1600, 1000
    base = create_radial_gradient(W, H, W * 0.5, H * 0.5, (15, 23, 42), (7, 10, 19))
    img = Image.fromarray(base)
    draw = ImageDraw.Draw(img)

    # Top nav bar
    draw.rectangle([0, 0, W, 64], fill=(11, 15, 25), outline=(30, 41, 59))
    draw.ellipse([32, 22, 52, 42], fill=(245, 197, 24))
    draw.rectangle([70, 26, 220, 38], fill=(255, 255, 255))
    draw.rounded_rectangle([W - 280, 20, W - 40, 44], radius=6, fill=(30, 41, 59))

    # Left Panel: Ollama Mission Control
    draw.rounded_rectangle([40, 94, 520, 940], radius=12, fill=(11, 15, 25), outline=(30, 41, 59), width=2)
    draw.rounded_rectangle([65, 120, 495, 170], radius=8, fill=(15, 23, 42), outline=(27, 47, 142))
    # Subgoal cards
    for i in range(4):
        draw.rounded_rectangle([65, 200 + i * 65, 495, 250 + i * 65], radius=6, fill=(15, 23, 42), outline=(51, 65, 85))

    # Center Panel: Manipulator Viewport
    draw.rounded_rectangle([550, 94, 1160, 940], radius=12, fill=(8, 12, 20), outline=(30, 41, 59), width=2)
    # 3D Grid & Arm
    cx, cy = 855, 620
    draw.ellipse([cx - 140, cy - 60, cx + 140, cy + 60], fill=(15, 23, 42), outline=(27, 47, 142), width=2)
    # Link 1
    draw.line([(cx, cy), (cx + 120, cy - 160)], fill=(255, 255, 255), width=14)
    # Link 2
    draw.line([(cx + 120, cy - 160), (cx + 260, cy - 60)], fill=(20, 184, 166), width=10)
    # Target Bays
    draw.ellipse([640, 680, 740, 730], fill=(225, 29, 72, 60), outline=(225, 29, 72), width=2)
    draw.ellipse([980, 680, 1080, 730], fill=(37, 99, 235, 60), outline=(37, 99, 235), width=2)

    # Right Panel: Telemetry & Q-Values
    draw.rounded_rectangle([1190, 94, 1560, 940], radius=12, fill=(11, 15, 25), outline=(30, 41, 59), width=2)
    for i in range(7):
        w = [180, 120, 260, 90, 220, 140, 80][i]
        draw.rounded_rectangle([1215, 240 + i * 44, 1215 + w, 266 + i * 44], radius=4, fill=(20, 184, 166) if i == 2 else (51, 65, 85))

    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=100, threshold=2))
    img.save(f"{OUTPUT_DIR}/console-screenshot.png", quality=95)
    print(f"[+] Generated {OUTPUT_DIR}/console-screenshot.png")


if __name__ == "__main__":
    generate_head_eye()
    generate_head_muscle()
    generate_head_brain()
    generate_architecture()
    generate_console_screenshot()
    print("[*] All 5 custom illustrations generated successfully!")
