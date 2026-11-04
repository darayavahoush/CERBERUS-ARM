// Client-side kinematics and graphics helpers

export const L1 = 1.0;
export const L2 = 0.8;
export const MAX_REACH = L1 + L2;
export const MIN_REACH = Math.abs(L1 - L2);

export const COLORS = {
  crimson: '#ef4444',
  cobalt: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
};

export const RECEPTACLES = {
  red_bin: { pos: [-1.2, 0.45], color: 'crimson', label: 'Red Sorting Bay', radius: 0.22 },
  blue_bin: { pos: [1.2, 0.45], color: 'cobalt', label: 'Blue Storage Bay', radius: 0.22 },
  green_bin: { pos: [0.0, 1.55], color: 'emerald', label: 'Green Assembly Bay', radius: 0.22 },
};

/**
 * World coordinate [-2.2, 2.2] x [-0.4, 2.2] to Canvas Pixel coordinate
 */
export function worldToCanvas(wx, wy, width, height) {
  const xMin = -2.2, xMax = 2.2;
  const yMin = -0.4, yMax = 2.2;
  const px = ((wx - xMin) / (xMax - xMin)) * width;
  const py = ((yMax - wy) / (yMax - yMin)) * height;
  return { x: px, y: py };
}

export function canvasToWorld(px, py, width, height) {
  const xMin = -2.2, xMax = 2.2;
  const yMin = -0.4, yMax = 2.2;
  const wx = xMin + (px / width) * (xMax - xMin);
  const wy = yMax - (py / height) * (yMax - yMin);
  return { x: wx, y: wy };
}

export function radToDeg(rad) {
  return ((rad * 180) / Math.PI).toFixed(1);
}
