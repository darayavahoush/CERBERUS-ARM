import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, History, Trash2 } from 'lucide-react';
import { DashShell } from '../components/Shell';
import { EmptyState, Panel, Stat, ago } from '../components/ui';
import { useBackend } from '../api/BackendProvider';
import { episodeStore, useEpisodes } from '../lib/store';
import { mulberry32 } from '../api/mock';

const outcome = (e) => (e.success ? 'Success' : e.collision ? 'Collision' : 'Timeout');
const sample = () => {
  const r = mulberry32(Date.now() & 0xffff);
  const colors = ['red', 'blue', 'green', 'yellow']; const shapes = ['cube', 'sphere', 'triangle', 'star']; const bins = ['red_bin', 'blue_bin', 'green_bin'];
  return Array.from({ length: 24 }, (_, i) => {
    const p = 0.35 + (i / 24) * 0.5; const ok = r() < p; const col = !ok && r() < 0.5;
    return { id: `s${Date.now()}${i}`, ts: Date.now() - (24 - i) * 420000, mode: 'mock', instruction: `Pick the ${colors[Math.floor(r() * 4)]} ${shapes[Math.floor(r() * 4)]}`, target: 'sample', bin: bins[Math.floor(r() * 3)], success: ok, collision: col, steps: ok ? 28 + Math.floor(r() * 25) : col ? 12 + Math.floor(r() * 30) : 140, reward: +(ok ? 35 + r() * 25 : col ? -30 + r() * 15 : -10 + r() * 15).toFixed(2), jerk: +(1 + r() * 4).toFixed(2), source: 'sample' };
  });
};

export default function Episodes() {
  const { api, mode } = useBackend();
  const all = useEpisodes();

  useEffect(() => {
    if (mode === 'live' && api?.episodes) {
      api.episodes().then((serverEps) => {
        if (Array.isArray(serverEps) && serverEps.length > 0) {
          const existingIds = new Set(all.map((e) => e.id));
          const missing = serverEps.filter((e) => !existingIds.has(e.id));
          if (missing.length) episodeStore.addMany(missing);
        }
      }).catch(() => {});
    }
  }, [mode, api]);
  const [scope, setScope] = useState('current');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);
  const list = useMemo(() => all.filter((e) => (scope === 'all' || e.mode === mode) && (filter === 'all' || outcome(e).toLowerCase() === filter)).slice().reverse(), [all, scope, filter, mode]);
  const scoped = all.filter((e) => scope === 'all' || e.mode === mode);
  const wins = scoped.filter((e) => e.success).length;
  const avg = (k) => (scoped.length ? (scoped.reduce((a, e) => a + (e[k] || 0), 0) / scoped.length).toFixed(1) : '–');
  const chart = scoped.slice(-40).map((e, i) => ({ n: i + 1, reward: e.reward, o: outcome(e) }));
  const col = { Success: '#17784d', Collision: '#c7352b', Timeout: '#9a6408' };
  const picked = list.find((e) => e.id === sel);
  const exportJson = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(scoped, null, 2)], { type: 'application/json' })); a.download = 'episodes.json'; a.click(); };

  return (
    <DashShell title="Episodes" actions={<>
      <div className="seg" role="group" aria-label="Which episodes"><button aria-pressed={scope === 'current'} onClick={() => setScope('current')}>This source</button><button aria-pressed={scope === 'all'} onClick={() => setScope('all')}>All</button></div>
      <button className="btn small" onClick={exportJson} disabled={!scoped.length}><Download size={14} aria-hidden /> Export</button>
    </>}>
      {scoped.length === 0 ? (
        <Panel><EmptyState title="No episodes recorded yet" body="Every run you finish in the console is saved here, with its outcome, step count and return." action={<div className="row wrap" style={{ justifyContent: 'center' }}><a className="btn primary" href="#/console">Run an episode</a>{mode === 'mock' && <button className="btn" onClick={() => episodeStore.addMany(sample())}>Load sample history</button>}</div>} /></Panel>
      ) : (
        <>
          <div className="grid g4">
            <Stat label="Episodes" value={scoped.length} />
            <Stat label="Success rate" value={`${Math.round((wins / scoped.length) * 100)}%`} />
            <Stat label="Mean return" value={avg('reward')} />
            <Stat label="Mean steps" value={avg('steps')} />
          </div>
          <Panel title="Return per episode (latest 40)" icon={History}>
            <div style={{ height: 200 }}><ResponsiveContainer><BarChart data={chart} margin={{ left: -18 }}><CartesianGrid stroke="#e6eaf0" vertical={false} /><XAxis dataKey="n" tick={{ fontSize: 11 }} stroke="#6b7890" /><YAxis tick={{ fontSize: 11 }} stroke="#6b7890" /><Tooltip formatter={(v, n, p) => [v, p.payload.o]} /><Bar dataKey="reward" isAnimationActive={false}>{chart.map((c, i) => <Cell key={i} fill={col[c.o]} />)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="row wrap faint" style={{ fontSize: 13 }}>{Object.entries(col).map(([k, v]) => <span key={k} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, background: v, borderRadius: 3, display: 'inline-block' }} />{k}</span>)}</div>
          </Panel>
          <Panel title="History" actions={<div className="row wrap">
            <div className="seg" role="group" aria-label="Outcome filter">{['all', 'success', 'collision', 'timeout'].map((f) => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div>
            <button className="btn small ghost" onClick={() => { if (window.confirm('Delete the episodes shown for this source?')) episodeStore.clear(scope === 'all' ? undefined : (e) => e.mode === mode); setSel(null); }}><Trash2 size={14} aria-hidden /> Clear</button></div>} bodyClass="">
            {list.length === 0 ? <EmptyState title="No episodes match this filter" body="Try another outcome." /> : (
              <div className="tablewrap"><table><caption className="sr">Episode history</caption><thead><tr><th>When</th><th>Task</th><th>Outcome</th><th>Steps</th><th>Return</th><th>Source</th></tr></thead>
                <tbody>{list.slice(0, 100).map((e) => (
                  <tr key={e.id} aria-selected={sel === e.id} onClick={() => setSel(e.id)} tabIndex={0} onKeyDown={(k) => { if (k.key === 'Enter') setSel(e.id); }} style={{ cursor: 'pointer' }}>
                    <td>{ago(e.ts)}</td><td style={{ maxWidth: 320 }}>{e.instruction}</td>
                    <td><span className={`pill ${e.success ? 'ok' : e.collision ? 'bad' : 'warn'}`}>{outcome(e)}</span></td><td>{e.steps}</td><td>{e.reward}</td><td className="faint">{e.mode === 'mock' ? 'Sample' : 'Live'}</td>
                  </tr>))}</tbody></table></div>
            )}
          </Panel>
          {picked && (
            <Panel title="Episode detail"><dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '6px 18px', margin: 0 }}>
              {[['Instruction', picked.instruction], ['Target', picked.target], ['Destination', picked.bin.replace('_', ' ')], ['Outcome', outcome(picked)], ['Steps', picked.steps], ['Return', picked.reward], ['Jerk index', picked.jerk], ['Planner', picked.source], ['Recorded', new Date(picked.ts).toLocaleString()]].map(([k, v]) => <React.Fragment key={k}><dt className="muted">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></React.Fragment>)}
            </dl></Panel>
          )}
        </>
      )}
    </DashShell>
  );
}
