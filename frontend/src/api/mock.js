// In-browser stand-in for the FastAPI backend. Same response shapes as backend/app.py,
// so pages never know which one they are talking to.
import { RECEPTACLES, DEFAULT_PILLAR, SHAPES, COLOR_NAMES, fk, ik, dist, L1, L2, L3 } from '../utils/kinematics';

const DELTA = 0.07;
const MAX_STEPS = 140;
const COLOR_KEYS = ['crimson', 'cobalt', 'emerald', 'amber'];
const BIN_BY_WORD = { red: 'red_bin', blue: 'blue_bin', green: 'green_bin' };
const COLOR_BY_WORD = { red: 'crimson', blue: 'cobalt', green: 'emerald', yellow: 'amber', amber: 'amber', gold: 'amber' };
const SHAPE_BY_WORD = { cube: 'cube', box: 'cube', block: 'cube', square: 'cube', ball: 'sphere', sphere: 'sphere', circle: 'sphere', triangle: 'triangle', pyramid: 'triangle', star: 'star' };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseInstruction(text) {
  const lowered = text.toLowerCase();
  const parts = lowered.split(/\b(?:to|into|in|onto|inside)\b/);
  const pick = parts[0] || '';
  const dest = parts.slice(1).join(' ');
  const word = (s, map) => Object.keys(map).find((w) => new RegExp(`\\b${w}s?\\b`).test(s));
  const colorWord = word(pick, COLOR_BY_WORD);
  const shapeWord = word(pick, SHAPE_BY_WORD);
  const binWord = word(dest, BIN_BY_WORD);
  return {
    color: colorWord ? COLOR_BY_WORD[colorWord] : null,
    shape: shapeWord ? SHAPE_BY_WORD[shapeWord] : null,
    bin: binWord ? BIN_BY_WORD[binWord] : 'blue_bin',
    cautious: /careful|cautious|hazard|slow|delicate|fragile/.test(lowered),
    fast: /fast|quick|speed|rapid|rush/.test(lowered),
  };
}

export function createMockBackend(seed = 7) {
  let rand = mulberry32(seed);
  const pillar = DEFAULT_PILLAR;
  const s = { t1: 0.52, t2: 0.95, t3: -0.42, closed: false, grasped: null, objects: [], target: 0, goalKey: 'blue_bin', step: 0, done: false, lastAction: null, reversals: 0 };
  const train = { episodes: 0, steps: 0, epsilon: 1.0, buffer: 0 };

  const ee = () => fk(s.t1, s.t2, s.t3).ee;
  const goalPos = () => RECEPTACLES[s.goalKey].pos;
  const clear = (p, r) => dist(p, [pillar.x, pillar.y]) > pillar.radius + r
    && Object.values(RECEPTACLES).every((b) => dist(p, b.pos) > b.radius + r + 0.1);

  function spawn(n = 5) {
    const colors = [...COLOR_KEYS, ...COLOR_KEYS].sort(() => rand() - 0.5);
    const out = [];
    while (out.length < n) {
      const r = 0.78 + rand() * 0.82;
      const a = Math.PI * (0.15 + rand() * 0.72);
      const p = [r * Math.cos(a), r * Math.sin(a)];
      if (!clear(p, 0.12) || out.some((o) => dist([o.x, o.y], p) < 0.26)) continue;
      out.push({
        id: `comp_${out.length + 1}`,
        shape: SHAPES[Math.floor(rand() * SHAPES.length)],
        color: colors[out.length],
        x: +p[0].toFixed(3),
        y: +p[1].toFixed(3),
        radius: 0.075,
        rotation: +(rand() * Math.PI * 2).toFixed(2),
      });
    }
    return out;
  }

  function observation() {
    const f = fk(s.t1, s.t2, s.t3);
    const o = s.objects[s.target] || { x: 0.5, y: 0.8, color: 'cobalt', shape: 'cube' };
    const g = goalPos();
    return {
      vector: [], fk: f, theta1: s.t1, theta2: s.t2, theta3: s.t3, phi: f.phi,
      manipulability: Math.abs(L1 * L2 * Math.sin(s.t2) + L2 * L3 * Math.sin(s.t3)),
      gripper_closed: s.closed, grasped_idx: s.grasped, target_idx: s.target,
      objects: s.objects.map((x) => ({ ...x })), goal_pos: g, goal_key: s.goalKey,
      goal_name: RECEPTACLES[s.goalKey]?.label || 'Sorting Bay',
      dist_ee_obj: dist(f.ee, [o.x, o.y]), dist_obj_goal: dist([o.x, o.y], g), step: s.step,
    };
  }

  function reset({ target_shape, target_color, target_bin } = {}) {
    Object.assign(s, { t1: 0.52, t2: 0.95, t3: -0.42, closed: false, grasped: null, step: 0, done: false, lastAction: null, reversals: 0 });
    s.objects = spawn(4 + Math.floor(rand() * 2));
    let idx = s.objects.findIndex((o) => (!target_color || o.color === target_color) && (!target_shape || o.shape === target_shape));
    if (idx < 0) {
      idx = s.objects.findIndex((o) => !target_color || o.color === target_color);
      if (idx < 0) idx = 0;
      if (target_shape) s.objects[idx].shape = target_shape;
    }
    s.target = idx;
    s.goalKey = target_bin || 'blue_bin';
    return observation();
  }

  function pillarHit(p) { return dist(p, [pillar.x, pillar.y]) < pillar.radius + 0.04; }
  const clampJoints = (t1, t2, t3) => [
    Math.min(2.6, Math.max(-2.6, t1)),
    Math.min(2.35, Math.max(-2.35, t2)),
    Math.min(2.1, Math.max(-2.1, t3)),
  ];

  function policy() {
    const o = s.objects[s.target];
    const tgt = s.grasped !== null ? goalPos() : [o.x, o.y];
    if (dist(ee(), tgt) < 0.14) return 6; // Grasp/Release action
    const goal = ik(tgt[0], tgt[1]);
    if (!goal) return 8;
    const diff1 = goal[0] - s.t1;
    const diff2 = goal[1] - s.t2;
    const diff3 = (goal[2] || 0) - s.t3;
    if (Math.abs(diff1) > Math.abs(diff2) && Math.abs(diff1) > 0.05) return diff1 > 0 ? 0 : 1;
    if (Math.abs(diff2) > 0.05) return diff2 > 0 ? 2 : 3;
    if (Math.abs(diff3) > 0.05) return diff3 > 0 ? 4 : 5;
    return 7;
  }

  function qValues(a) {
    return Array.from({ length: 9 }, (_, i) => +((i === a ? 2.1 + rand() * 0.5 : -0.7 + rand() * 1.2)).toFixed(3));
  }

  function step(action) {
    const manual = Number.isInteger(action);
    const a = manual ? action : policy();
    const q = qValues(a);
    if (s.done) return { observation: observation(), reward: 0, terminated: true, truncated: false, info: {}, action: a, q_values: q, rendered_image: null };

    const o = s.objects[s.target];
    const goalPt = s.grasped !== null ? goalPos() : [o.x, o.y];
    const before = dist(ee(), goalPt);
    s.step += 1;
    s.lastAction = a;

    let reward = -0.05;
    let success = false;
    if (a === 0) s.t1 += DELTA; else if (a === 1) s.t1 -= DELTA;
    else if (a === 2) s.t2 += DELTA; else if (a === 3) s.t2 -= DELTA;
    else if (a === 4) s.t3 += DELTA; else if (a === 5) s.t3 -= DELTA;
    else if (a === 7) { s.t1 += DELTA * 0.4; s.t2 -= DELTA * 0.4; s.t3 += DELTA * 0.2; }
    [s.t1, s.t2, s.t3] = clampJoints(s.t1, s.t2, s.t3);

    const f = fk(s.t1, s.t2, s.t3);
    if (a === 6) { // Toggle gripper
      if (!s.closed) {
        s.closed = true;
        if (dist(f.ee, [o.x, o.y]) < 0.16) { s.grasped = s.target; reward += 20; }
      } else {
        s.closed = false;
        if (s.grasped !== null) {
          o.x = f.ee[0]; o.y = f.ee[1];
          s.grasped = null;
          if (dist([o.x, o.y], goalPos()) < RECEPTACLES[s.goalKey].radius) { success = true; reward += 70; }
        }
      }
    }
    if (s.grasped !== null) { o.x = f.ee[0]; o.y = f.ee[1]; }
    const after = dist(f.ee, s.grasped !== null ? goalPos() : [o.x, o.y]);
    reward += 2.5 * (before - after);

    const collision = pillarHit(f.ee) || pillarHit(f.wrist);
    if (collision) reward -= 30;
    const terminated = success || collision;
    const truncated = !terminated && s.step >= MAX_STEPS;
    s.done = terminated || truncated;
    return {
      observation: observation(), reward: +reward.toFixed(2),
      terminated, truncated,
      info: { is_success: success, is_collision: collision, jerk: +(0.02 + rand() * 0.04).toFixed(3), dist_to_goal: +dist(f.ee, goalPt).toFixed(3) },
      action: a, q_values: q, rendered_image: null,
    };
  }

  const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

  return {
    id: 'mock',
    async status() {
      await wait(60);
      return {
        status: 'online', device: 'mock (in-browser)',
        cnn: { architecture: 'CoordConv + Multi-Task Backbone', gradcam_enabled: true, classes: { shapes: SHAPES, colors: COLOR_KEYS } },
        drl: { algorithm: 'Dueling Double-DQN (D3QN) + HER', state_dim: 15, action_dim: 7, epsilon: +train.epsilon.toFixed(3), total_steps: train.steps, buffer_size: train.buffer },
        ollama: { online: false, models: [], active_model: 'neuro_symbolic_engine', backend: 'mock_neuro_symbolic' },
        receptacles: RECEPTACLES,
      };
    },
    async reset(body = {}) {
      await wait(80);
      const observationNow = reset(body);
      return { observation: observationNow, rendered_image: null, obstacles: [pillar], receptacles: RECEPTACLES };
    },
    async step(action) { await wait(30); return step(action); },
    async plan(instruction) {
      await wait(450);
      const p = parseInstruction(instruction);
      const obs = reset({ target_shape: p.shape, target_color: p.color, target_bin: p.bin });
      const o = obs.objects[obs.target_idx];
      const collision = p.cautious ? 40 : p.fast ? 15 : 25;
      const jerk = p.cautious ? 2.5 : p.fast ? 0.8 : 1.5;
      return {
        plan: {
          task_summary: `Move the ${COLOR_NAMES[o.color]} ${o.shape} into the ${p.bin.replace('_', ' ')}`,
          target_shape: o.shape, target_color: o.color, destination_bin: p.bin,
          subgoals: [`APPROACH_TARGET(${o.color.toUpperCase()}_${o.shape.toUpperCase()})`, 'ALIGN_GRIPPER', 'EXECUTE_GRASP', 'TRANSIT_CLEAR_OF_HAZARD', `DESCEND_RELEASE(${p.bin.toUpperCase()})`],
          supervisory_weights: { collision_penalty: collision, jerk_penalty: jerk, step_penalty: p.fast ? 0.25 : 0.1 },
          safety_assessment: p.cautious ? 'Cautious mode: the central pillar carries a heavier penalty and joint speed is damped.' : 'Standard envelope: the arm stays clear of the central pillar and avoids the straight-arm singularity.',
          reasoning_steps: [
            `Matched “${instruction.slice(0, 60)}” to the ${o.color} ${o.shape} on the table.`,
            `Chose ${p.bin.replace('_', ' ')} as the destination.`,
            `Set collision penalty ${collision} and jerk penalty ${jerk}.`,
          ],
          source: 'mock_neuro_symbolic',
        },
        observation: obs, rendered_image: null, obstacles: [pillar],
      };
    },
    async inspect() {
      await wait(350);
      const obs = observation();
      const o = obs.objects[obs.target_idx];
      const nx = (o.x + 2.2) / 4.4;
      const ny = (2.2 - o.y) / 2.6;
      const heat = Array.from({ length: 32 }, (_, r) => Array.from({ length: 32 }, (_, c) => {
        const d2 = ((c / 31 - nx) ** 2) + ((r / 31 - ny) ** 2);
        return +Math.exp(-d2 / 0.006).toFixed(3);
      }));
      const si = SHAPES.indexOf(o.shape);
      const ci = COLOR_KEYS.indexOf(o.color);
      const probs = (i) => { const p = Array.from({ length: 4 }, (_, k) => (k === i ? 0.86 + rand() * 0.1 : rand() * 0.05)); const t = p.reduce((a, b) => a + b); return p.map((v) => +(v / t).toFixed(3)); };
      const sp = probs(si);
      return { predicted_shape: o.shape, predicted_color: o.color, shape_probabilities: sp, color_probabilities: probs(ci), predicted_normalized_coords: [+nx.toFixed(4), +ny.toFixed(4)], gradcam_heatmap: heat, confidence: Math.max(...sp) };
    },
    async explain(t) {
      await wait(500);
      const jerk = (t.jerk ?? 0).toFixed(2);
      const text = t.is_success
        ? `The arm placed the object in ${t.steps} steps with a return of ${t.reward.toFixed(1)}. Joint motion stayed smooth (jerk ${jerk}), and the path went around the central pillar.`
        : t.is_collision
          ? `The episode ended in a collision after ${t.steps} steps. The arm swept into the pillar while turning toward the target; a higher collision penalty or a wider detour would help.`
          : `The episode ran out of steps (${t.steps}) before the object reached the bay. Return was ${t.reward.toFixed(1)}; the arm likely hesitated near the target.`;
      return { explanation: text, telemetry_evaluated: t };
    },
    async train(episodes = 5) {
      await wait(900);
      let ok = 0; let rewards = 0;
      for (let i = 0; i < episodes; i += 1) {
        train.episodes += 1;
        const p = Math.min(0.9, 0.08 + 0.82 * (1 - Math.exp(-train.episodes / 45)));
        const win = rand() < p;
        ok += win ? 1 : 0;
        rewards += win ? 40 + rand() * 20 : -25 + rand() * 30;
        train.steps += win ? 30 + Math.floor(rand() * 25) : MAX_STEPS;
        train.epsilon = Math.max(0.05, train.epsilon * 0.985);
      }
      train.buffer = Math.min(50000, train.steps * 2);
      return {
        episodes_trained: episodes, mean_reward: +(rewards / episodes).toFixed(2), success_rate: +((ok / episodes) * 100).toFixed(1),
        mean_loss: +(0.9 * Math.exp(-train.episodes / 80) + rand() * 0.05).toFixed(4), current_epsilon: +train.epsilon.toFixed(4), total_steps: train.steps, buffer_size: train.buffer,
      };
    },
    async benchmark() {
      await wait(1200);
      return {
        timestamp: new Date().toISOString(),
        benchmark_results: [
          { policy_name: 'Random exploration', episodes: 15, success_rate: 6.7, collision_rate: 46.7, mean_reward: -34.8, mean_steps: 80, mean_jerk: 14.2 },
          { policy_name: 'Standard D3QN', episodes: 15, success_rate: 53.3, collision_rate: 20, mean_reward: 18.4, mean_steps: 44.5, mean_jerk: 6.8 },
          { policy_name: 'D3QN + HER + LLM weights', episodes: 15, success_rate: 86.7, collision_rate: 6.7, mean_reward: 48.9, mean_steps: 28.2, mean_jerk: 3.1 },
        ],
      };
    },
    async episodes() { return []; },
    async recordEpisode() { return { status: 'recorded' }; },
    async trainHistory() { return []; },
  };
}
