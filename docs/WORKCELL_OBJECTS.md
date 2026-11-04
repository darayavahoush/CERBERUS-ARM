# Workcell and Object Specification

The 3D viewport uses a Three.js scene driven by the backend observation. Shape, color, pose, grasp state, and destination are taken from the current environment state; the detailing below is the visual model shown to the operator.

## Manipulated components

| Environment class | Workcell identity | Geometry and finish | Recognition details |
| --- | --- | --- | --- |
| `cube` | Micro-module IC package | Squared graphite package body, colored ceramic lid, gold perimeter leads, and a keyed alignment mark | The lid color carries the environment color label; the gold mark identifies orientation. |
| `sphere` | Quartz focusing lens | Refractive colored glass shell, inner optic, gold equator, and a second meridian ring | The inner element and paired rings distinguish a lens from a solid ball. |
| `triangle` | Dispersive optical prism | Three-sided glass prism, amber facet mark, and three gold corner fiducials | The triangular footprint is preserved in both the synthetic camera image and 3D scene. |
| `star` | Multi-axis fiducial sensor hub | Five-point anodized shell, central sensor socket, glass optic, and five perimeter fasteners | The star outline is a separate class; it is not rendered as a generic hexagonal pod. |

All components retain their assigned environment color (`crimson`, `cobalt`, `emerald`, or `amber`) in the 2D image labels and as a high-contrast accent in the 3D model. The active target receives a separate floating reticle; that reticle is a selection cue, not part of the component geometry.

## Sorting bays

| Bay | Destination | World center (m) | Visual treatment |
| --- | --- | ---: | --- |
| A | SMT assembly staging | `(-1.25, 0.45)` | Crimson docking pad and fiducial ring |
| B | AOI inspection | `(1.25, 0.45)` | Cobalt inspection pad and fiducial ring |
| C | Cleanroom QA pass-through | `(0.00, 1.60)` | Emerald pass-through pad and fiducial ring |

Each receptacle is a target region with a 0.22 m acceptance radius. The bay accents identify destinations visually; the environment's target key and success condition remain authoritative.

## Safety obstacle

The central optical inspection spindle is centered at `(0.00, 0.85)` m with a 0.20 m keep-out radius in the 2D manipulation environment. The 3D scene represents it as a translucent amber tower, scanner collar, base flange, and a labeled warning marker. A collision stops the simulation at its last safe arm pose and applies the configured collision penalty.

## Arm and viewport conventions

The model has three planar revolute links of 0.90 m, 0.70 m, and 0.35 m, plus an animated parallel gripper. The viewport uses a light optical-breadboard surface, subdued metric grid, soft studio lighting, and distinct dark-metal, titanium, brass, and cyan joint materials. Perspective, top-down, and side camera presets use the same world coordinates.

The MJCF includes named, detailed example bodies for a micro-module, lens, prism, and fiducial star so the native MuJoCo model remains inspectable. The browser's randomized object poses are supplied by the manipulation environment; the native XML examples are scene fixtures, not the source of randomized episode state.
