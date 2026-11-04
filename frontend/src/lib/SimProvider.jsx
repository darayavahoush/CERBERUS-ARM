import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useBackend } from '../api/BackendProvider';
import { episodeStore } from './store';
import { dist } from '../utils/kinematics';

const Ctx = createContext(null);
export const useSim = () => useContext(Ctx);

const blank = {
  obs: null, obstacles: [], image: null, action: null, q: [], reward: 0, total: 0, rewards: [],
  collision: false, success: false, finished: false, plan: null, instruction: '', explanation: '',
};

export function subgoalIndex(obs, success) {
  if (!obs) return 0;
  if (success) return 5;
  if (obs.grasped_idx !== null && obs.grasped_idx !== undefined) return 3;
  if (obs.gripper_closed) return 2;
  return obs.dist_ee_obj < 0.3 ? 1 : 0;
}

export function SimProvider({ children }) {
  const { api, mode } = useBackend();
  const [sim, setSim] = useState(blank);
  const [trail, setTrail] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [perception, setPerception] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const inflight = useRef(false);
  const ref = useRef(sim);
  ref.current = sim;
  const logged = useRef(false);

  const apply = (data, extra = {}) => {
    setSim((s) => ({ ...s, obs: data.observation, obstacles: data.obstacles ?? s.obstacles, image: data.rendered_image ?? null, ...extra }));
    setTrail(data.observation?.fk?.ee ? [data.observation.fk.ee] : []);
  };

  const reset = useCallback(async (body = {}, extra = {}) => {
    setPlaying(false); setBusy(true); setError(null); logged.current = false;
    try {
      const data = await api.reset(body);
      setPerception(null);
      setSim({ ...blank, plan: extra.plan ?? null, instruction: extra.instruction ?? '', obs: data.observation, obstacles: data.obstacles ?? [], image: data.rendered_image ?? null });
      setTrail([data.observation.fk.ee]);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [api]);

  // Start fresh whenever the data source changes
  useEffect(() => { setSim(blank); setTrail([]); setError(null); setPerception(null); reset(); }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback((s) => {
    if (logged.current || !s.obs) return;
    logged.current = true;
    const o = s.obs.objects?.[s.obs.target_idx];
    const rec = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), mode,
      instruction: s.instruction || 'Random task', target: o ? `${o.color} ${o.shape}` : 'unknown',
      bin: s.obs.goal_key, success: s.success, collision: s.collision, steps: s.obs.step, reward: +s.total.toFixed(2),
      jerk: s.jerk ?? 0, source: s.plan?.source || 'policy',
    };
    episodeStore.add(rec);
    if (mode === 'live' && api.recordEpisode) {
      api.recordEpisode(rec).catch(() => {});
    }
  }, [mode, api]);

  const step = useCallback(async (manual = null) => {
    if (inflight.current || ref.current.finished) return;
    inflight.current = true;
    try {
      const d = await api.step(manual);
      const success = !!d.info?.is_success;
      const collision = !!d.info?.is_collision;
      const finished = !!(d.terminated || d.truncated);
      const next = {
        ...ref.current, obs: d.observation, image: d.rendered_image ?? null, action: d.action, q: d.q_values || [],
        reward: d.reward, total: ref.current.total + d.reward, rewards: [...ref.current.rewards, d.reward],
        success, collision, finished, jerk: d.info?.jerk ?? ref.current.jerk,
      };
      setSim(next);
      setTrail((t) => [...t, d.observation.fk.ee].slice(-60));
      if (finished) { setPlaying(false); finish(next); }
      setError(null);
    } catch (e) { setError(e.message); setPlaying(false); } finally { inflight.current = false; }
  }, [api, finish]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => step(), 90);
    return () => clearInterval(id);
  }, [playing, step]);

  const plan = useCallback(async (instruction) => {
    setPlaying(false); setBusy(true); setError(null); logged.current = false;
    try {
      const d = await api.plan(instruction);
      setPerception(null);
      setSim({ ...blank, plan: d.plan, instruction, obs: d.observation, obstacles: d.obstacles ?? ref.current.obstacles, image: d.rendered_image ?? null });
      setTrail([d.observation.fk.ee]);
      return d.plan;
    } catch (e) { setError(e.message); return null; } finally { setBusy(false); }
  }, [api]);

  const inspect = useCallback(async () => {
    setBusy(true);
    try { setPerception(await api.inspect()); setError(null); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }, [api]);

  const explain = useCallback(async () => {
    const s = ref.current;
    if (!s.obs) return;
    setExplaining(true);
    try {
      const d = await api.explain({
        is_success: s.success, is_collision: s.collision, steps: s.obs.step, reward: s.total,
        jerk: s.jerk ?? 0, cnn_confidence: perception?.confidence ?? 0.96,
      });
      setSim((x) => ({ ...x, explanation: d.explanation }));
    } catch (e) { setError(e.message); } finally { setExplaining(false); }
  }, [api, perception]);

  const nearTarget = sim.obs ? dist(sim.obs.fk.ee, [sim.obs.objects[sim.obs.target_idx].x, sim.obs.objects[sim.obs.target_idx].y]) : null;
  return (
    <Ctx.Provider value={{ sim, trail, playing, setPlaying, busy, error, setError, perception, explaining, reset, step, plan, inspect, explain, nearTarget }}>
      {children}
    </Ctx.Provider>
  );
}
