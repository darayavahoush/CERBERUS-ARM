// Client-side kinematics and workspace constants (mirror backend/env/kinematics.py)
export const L1 = 1.0;
export const L2 = 0.8;
export const MAX_REACH = L1 + L2;
export const MIN_REACH = Math.abs(L1 - L2);

// Workspace bounds shown in the stage: x in [-2.2, 2.2], y in [-0.4, 2.2]
export const WORLD = { xMin: -2.2, xMax: 2.2, yMin: -0.4, yMax: 2.2 };

// Chip colours on light surfaces
export const COLORS = { crimson: '#D1352B', cobalt: '#2A44B5', emerald: '#168A5B', amber: '#C98A0A' };
// Object colours on the blueprint stage (lighter so they read on cobalt)
export const STAGE_COLORS = { crimson: '#FF6B63', cobalt: '#9DB6FF', emerald: '#4BE0A0', amber: '#FFC83D' };
export const COLOR_NAMES = { crimson: 'red', cobalt: 'blue', emerald: 'green', amber: 'yellow' };
export const SHAPES = ['cube', 'sphere', 'triangle', 'star'];

export const RECEPTACLES = {
  red_bin: { pos: [-1.2, 0.45], color: 'crimson', label: 'Red bay', radius: 0.22 },
  blue_bin: { pos: [1.2, 0.45], color: 'cobalt', label: 'Blue bay', radius: 0.22 },
  green_bin: { pos: [0.0, 1.55], color: 'emerald', label: 'Green bay', radius: 0.22 },
};
export const DEFAULT_PILLAR = { x: 0.0, y: 0.85, radius: 0.22 };

// Action space (backend/env/robotic_arm_env.py)
export const ACTIONS = [
  'Shoulder +', 'Shoulder −', 'Elbow +', 'Elbow −', 'Gripper toggle', 'Micro-align', 'Hold',
];

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const radToDeg = (rad) => ((rad * 180) / Math.PI).toFixed(1);

export function fk(t1, t2) {
  const elbow = [L1 * Math.cos(t1), L1 * Math.sin(t1)];
  const ee = [elbow[0] + L2 * Math.cos(t1 + t2), elbow[1] + L2 * Math.sin(t1 + t2)];
  return { base: [0, 0], elbow, ee };
}

// Elbow-down analytic IK; returns null when the point is out of reach
export function ik(x, y) {
  const d2 = x * x + y * y;
  const c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c2 < -1 || c2 > 1) return null;
  const t2 = Math.acos(c2);
  const t1 = Math.atan2(y, x) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
  return [t1, t2];
}
