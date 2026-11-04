// Client-side kinematics and workspace constants (3-DOF Industrial Manipulator)
export const L1 = 0.90; // Base to Elbow (m)
export const L2 = 0.70; // Elbow to Wrist (m)
export const L3 = 0.35; // Wrist to Tool (m)
export const MAX_REACH = L1 + L2 + L3;
export const MIN_REACH = 0.20;

// Workspace bounds shown in the stage: x in [-2.2, 2.2], y in [-0.4, 2.2]
export const WORLD = { xMin: -2.2, xMax: 2.2, yMin: -0.4, yMax: 2.2 };

// Chip colours on light surfaces
export const COLORS = { crimson: '#D1352B', cobalt: '#2A44B5', emerald: '#168A5B', amber: '#C98A0A' };
// Object colours on the blueprint stage
export const STAGE_COLORS = { crimson: '#FF6B63', cobalt: '#9DB6FF', emerald: '#4BE0A0', amber: '#FFC83D' };
export const COLOR_NAMES = { crimson: 'red', cobalt: 'blue', emerald: 'green', amber: 'yellow' };
export const SHAPES = ['cube', 'sphere', 'triangle', 'star'];

export const COMPONENT_LABELS = {
  cube: 'Micro-Module',
  sphere: 'Quartz Lens',
  triangle: 'Optical Prism',
  star: 'Sensor Hub',
};

// Real-world Industrial Workcell Sorting Bays
export const RECEPTACLES = {
  red_bin: { pos: [-1.25, 0.45], color: 'crimson', label: 'Bay A · SMT Staging', sublabel: 'Assembly infeed', radius: 0.22 },
  blue_bin: { pos: [1.25, 0.45], color: 'cobalt', label: 'Bay B · AOI Inspection', sublabel: 'Quality verification', radius: 0.22 },
  green_bin: { pos: [0.0, 1.60], color: 'emerald', label: 'Bay C · Cleanroom QA', sublabel: 'Certified pass-through', radius: 0.22 },
};

// Central Keep-out Zone: Laser Optical Scanner & Light Curtain
export const DEFAULT_PILLAR = { x: 0.0, y: 0.85, radius: 0.20, label: 'Laser Inspection Spindle' };

// 9 Discrete Actions for 3-DOF Arm
export const ACTIONS = [
  'Shoulder +', 'Shoulder −', 'Elbow +', 'Elbow −', 'Wrist +', 'Wrist −', 'Gripper toggle', 'Micro-align', 'Hold',
];

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const radToDeg = (rad) => ((rad * 180) / Math.PI).toFixed(1);

export function fk(t1, t2, t3 = 0) {
  const elbow = [L1 * Math.cos(t1), L1 * Math.sin(t1)];
  const wrist = [elbow[0] + L2 * Math.cos(t1 + t2), elbow[1] + L2 * Math.sin(t1 + t2)];
  const ee = [wrist[0] + L3 * Math.cos(t1 + t2 + t3), wrist[1] + L3 * Math.sin(t1 + t2 + t3)];
  return { base: [0, 0], elbow, wrist, ee, phi: t1 + t2 + t3 };
}

// 3-DOF Inverse Kinematics with approach orientation
export function ik(x, y, phi = null) {
  const targetPhi = phi !== null ? phi : Math.atan2(y, x) - Math.PI / 4;
  const wx = x - L3 * Math.cos(targetPhi);
  const wy = y - L3 * Math.sin(targetPhi);

  const d2 = wx * wx + wy * wy;
  const c2 = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c2 < -1 || c2 > 1) {
    // Direct reach fallback
    const directD2 = x * x + y * y;
    const directC2 = (directD2 - (L1 + L2) ** 2) / (2 * (L1 + L2));
    if (directC2 < -1 || directC2 > 1) return null;
    return [Math.atan2(y, x), 0.3, 0.0];
  }

  const t2 = Math.acos(c2);
  const t1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));
  const t3 = targetPhi - (t1 + t2);
  return [t1, t2, t3];
}
