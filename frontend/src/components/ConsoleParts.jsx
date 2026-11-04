import React, { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Eye, Gauge, MessageSquareText, Search, Sparkles } from 'lucide-react';
import Stage from './Stage';
import { Panel, Spinner } from './ui';
import { ACTIONS, COLOR_NAMES, SHAPES } from '../utils/kinematics';
import { subgoalIndex } from '../lib/SimProvider';

export const PRESETS = [
  'Pick the red cube and put it in the green bin',
  'Carefully move the blue sphere to the red bin',
  'Quickly place the yellow star in the blue bin',
];

const STEP_LABELS = ['Approach target', 'Align gripper', 'Grasp', 'Carry past the pillar', 'Release in bay'];

export function Assistant({ sim, plan, busy, onExplain, explaining }) {
  const [text, setText] = useState('');
  const submit = (e) => { e.preventDefault(); if (text.trim()) plan(text.trim()); };
  const p = sim.plan;
  const at = subgoalIndex(sim.obs, sim.success);
  return (
    <Panel title="Instruction" icon={MessageSquareText}>
      <form className="col" onSubmit={submit}>
        <label className="f" htmlFor="instr">Tell the arm what to move</label>
        <textarea id="instr" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Pick the green star and put it in the red bin" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); }} />
        <div className="row wrap">{PRESETS.map((t) => <button type="button" key={t} className="chip" onClick={() => { setText(t); plan(t); }}>{t}</button>)}</div>
        <button className="btn primary" disabled={busy || !text.trim()}>{busy ? <Spinner /> : <Sparkles size={16} aria-hidden />} Plan task</button>
      </form>
      <div aria-live="polite" style={{ marginTop: 16 }}>
        {!p && <p className="muted" style={{ fontSize: 14 }}>No plan yet. Click an object on the workspace, pick an example, or type your own instruction.</p>}
        {p && (
          <div className="col">
            <div className="row wrap"><strong>{p.task_summary}</strong><span className="pill info end">{p.source?.startsWith('ollama') ? 'Local LLM' : 'Built-in parser'}</span></div>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
              {(p.subgoals || []).map((g, i) => {
                const label = STEP_LABELS[i] || g;
                const done = i < at; const now = i === at;
                return (
                  <li key={g} className="row" style={{ opacity: done || now ? 1 : 0.55 }} aria-current={now ? 'step' : undefined}>
                    <span style={{ width: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center', flex: 'none', background: done ? 'var(--ok)' : now ? 'var(--signal)' : 'var(--rule-2)', color: done ? '#fff' : '#1b1500' }}>{done ? <Check size={14} aria-label="done" /> : <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}</span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
            {p.supervisory_weights && <p className="muted" style={{ fontSize: 13.5 }}>Penalties set by the planner: collision {p.supervisory_weights.collision_penalty}, jerk {p.supervisory_weights.jerk_penalty}.</p>}
            {p.safety_assessment && <p className="muted" style={{ fontSize: 13.5 }}>{p.safety_assessment}</p>}
            {p.reasoning_steps?.length > 0 && (
              <details><summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>How the planner decided</summary><ul className="muted" style={{ fontSize: 13.5 }}>{p.reasoning_steps.map((r) => <li key={r}>{r}</li>)}</ul></details>
            )}
          </div>
        )}
      </div>
      <div className="col" style={{ marginTop: 16, borderTop: '1px solid var(--rule-2)', paddingTop: 14 }}>
        <div className="row"><h3 style={{ fontSize: '.98rem' }}>Episode debrief</h3>
          <button className="btn small end" disabled={!sim.finished || explaining} onClick={onExplain}>{explaining ? <Spinner /> : null} Explain this run</button></div>
        {sim.explanation ? <p aria-live="polite">{sim.explanation}</p> : <p className="faint" style={{ fontSize: 13.5 }}>{sim.finished ? 'Ask for a short written debrief of what happened.' : 'Available once the episode ends.'}</p>}
      </div>
    </Panel>
  );
}

function Heat({ grid }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c || !grid?.length) return;
    const n = grid.length; const m = grid[0].length;
    c.width = m; c.height = n;
    const ctx = c.getContext('2d'); const img = ctx.createImageData(m, n);
    grid.forEach((row, r) => row.forEach((v, k) => {
      const i = (r * m + k) * 4; const t = Math.max(0, Math.min(1, v));
      img.data[i] = 255; img.data[i + 1] = Math.round(220 - 150 * t); img.data[i + 2] = 40; img.data[i + 3] = Math.round(220 * Math.pow(t, 1.4));
    }));
    ctx.putImageData(img, 0, 0);
  }, [grid]);
  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'auto', mixBlendMode: 'screen' }} />;
}

export function Vision({ sim, perception, onInspect, busy, shapes = SHAPES }) {
  const [showHeat, setShowHeat] = useState(true);
  const c = perception?.predicted_normalized_coords;
  return (
    <Panel title="What the camera sees" icon={Eye} actions={<button className="btn small" onClick={onInspect} disabled={busy || !sim.obs}>{busy ? <Spinner /> : <Search size={14} aria-hidden />} Run perception</button>}>
      <div className="col">
        <div style={{ position: 'relative' }}>
          {sim.image ? <img src={sim.image} alt="Rendered camera frame" style={{ width: '100%', display: 'block', borderRadius: 10 }} /> : <Stage observation={sim.obs} obstacles={sim.obstacles} bare showHud={false} label="Camera view of the table" />}
          {showHeat && perception?.gradcam_heatmap && <Heat grid={perception.gradcam_heatmap} />}
          {c && <div aria-hidden style={{ position: 'absolute', left: `${c[0] * 100}%`, top: `${c[1] * 100}%`, width: 22, height: 22, margin: -11, border: '2px solid #f5c518', borderRadius: 4 }} />}
        </div>
        {!perception && <p className="muted" style={{ fontSize: 13.5 }}>Run perception to see what the vision model detects and where it is looking.</p>}
        {perception && (
          <>
            <div className="row wrap">
              <span className="pill info">{COLOR_NAMES[perception.predicted_color] || perception.predicted_color} {perception.predicted_shape}</span>
              <span className="muted" style={{ fontSize: 13.5 }}>Confidence {(perception.confidence * 100).toFixed(1)}%</span>
              <label className="row end" style={{ fontSize: 13.5 }}><input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} /> Attention heatmap</label>
            </div>
            <div className="col" style={{ gap: 6 }}>
              {perception.shape_probabilities?.map((v, i) => (
                <div key={i} className="row" style={{ fontSize: 13 }}><span style={{ width: 70 }}>{shapes[i] || i}</span><div className="bar grow" role="meter" aria-label={`${shapes[i]} probability`} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${v * 100}%` }} /></div><span style={{ width: 40, textAlign: 'right' }}>{(v * 100).toFixed(0)}%</span></div>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

export function Telemetry({ sim, epsilon }) {
  const q = sim.q || [];
  const best = q.length ? q.indexOf(Math.max(...q)) : -1;
  const lo = Math.min(0, ...q); const hi = Math.max(0.001, ...q); const span = hi - lo || 1;
  const data = sim.rewards.reduce((a, r, i) => [...a, { step: i + 1, total: +((a[i - 1]?.total ?? 0) + r).toFixed(2) }], []);
  return (
    <Panel title="Decision telemetry" icon={Gauge}>
      <div className="col">
        <div className="grid g2" style={{ gap: 10 }}>
          <div><div className="faint" style={{ fontSize: 12.5 }}>Step</div><div className="num" style={{ fontSize: '1.5rem' }}>{sim.obs?.step ?? 0}</div></div>
          <div><div className="faint" style={{ fontSize: 12.5 }}>Return</div><div className="num" style={{ fontSize: '1.5rem' }}>{sim.total.toFixed(1)}</div></div>
          <div><div className="faint" style={{ fontSize: 12.5 }}>Last reward</div><div className="num" style={{ fontSize: '1.2rem' }}>{sim.reward.toFixed(2)}</div></div>
          <div><div className="faint" style={{ fontSize: 12.5 }}>Exploration (ε)</div><div className="num" style={{ fontSize: '1.2rem' }}>{epsilon != null ? epsilon : '–'}</div></div>
        </div>
        {sim.finished && <span className={`pill ${sim.success ? 'ok' : 'bad'}`} role="status">{sim.success ? 'Success: object placed' : sim.collision ? 'Collision with the pillar' : 'Ran out of steps'}</span>}
        <div>
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 6 }}>Action values (higher means preferred)</div>
          {q.length === 0 ? <p className="muted" style={{ fontSize: 13.5 }}>Run a step to see how the policy scores each action.</p> : (
            <div className="col" style={{ gap: 6 }}>
              {q.map((v, i) => (
                <div key={i} className="row" style={{ fontSize: 13, fontWeight: i === best ? 700 : 400 }}>
                  <span style={{ width: 104 }}>{ACTIONS[i]}</span>
                  <div className="bar grow"><i style={{ width: `${((v - lo) / span) * 100}%`, background: i === best ? 'var(--signal)' : 'var(--blueprint-2)' }} /></div>
                  <span style={{ width: 44, textAlign: 'right' }}>{v.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ height: 120 }}>
          {data.length > 1 ? (
            <ResponsiveContainer><AreaChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="step" tick={{ fontSize: 11 }} stroke="#6b7890" /><YAxis tick={{ fontSize: 11 }} stroke="#6b7890" />
              <Tooltip /><Area dataKey="total" name="Return" stroke="#1b2f8e" fill="#1b2f8e" fillOpacity={0.15} isAnimationActive={false} />
            </AreaChart></ResponsiveContainer>
          ) : <p className="faint" style={{ fontSize: 13 }}>Return over time appears here.</p>}
        </div>
      </div>
    </Panel>
  );
}

