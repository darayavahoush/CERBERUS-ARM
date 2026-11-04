import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FlaskConical, Play, Trophy } from 'lucide-react';
import { DashShell } from '../components/Shell';
import { DisconnectedState, EmptyState, ErrorState, Panel, Skeleton, Spinner, Stat } from '../components/ui';
import { useBackend } from '../api/BackendProvider';
import { trainStore, useTrainRuns } from '../lib/store';

export default function Training() {
  const { api, mode, setMode, connection, retry, refreshStatus } = useBackend();
  const runs = useTrainRuns().filter((r) => r.mode === mode);
  const [busy, setBusy] = useState(false);
  const [bench, setBench] = useState(null);
  const [benchBusy, setBenchBusy] = useState(false);
  const [error, setError] = useState(null);
  const drl = connection.status?.drl;
  const offline = connection.state === 'offline';

  useEffect(() => {
    if (mode === 'live' && api?.trainHistory) {
      api.trainHistory().then((serverRuns) => {
        if (Array.isArray(serverRuns) && serverRuns.length > 0) {
          const existing = new Set(runs.map((r) => r.ts));
          const missing = serverRuns.filter((r) => !existing.has(r.ts));
          if (missing.length) trainStore.addMany(missing);
        }
      }).catch(() => {});
    }
  }, [mode, api]);

  const train = async (n) => {
    setBusy(true); setError(null);
    try {
      const d = await api.train(n);
      trainStore.add({ ts: Date.now(), mode, batch: runs.length + 1, episodes: d.episodes_trained, success: d.success_rate, reward: d.mean_reward, loss: d.mean_loss, epsilon: d.current_epsilon, steps: d.total_steps });
      refreshStatus();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const runBench = async () => {
    setBenchBusy(true); setError(null);
    try { setBench(await api.benchmark()); } catch (e) { setError(e.message); } finally { setBenchBusy(false); }
  };
  const rows = bench?.benchmark_results || [];
  const axis = { tick: { fontSize: 12 }, stroke: '#6b7890' };

  return (
    <DashShell title="Training" actions={<button className="btn primary" onClick={() => train(5)} disabled={busy || offline}>{busy ? <Spinner /> : <Play size={16} aria-hidden />} Train 5 episodes</button>}>
      {offline && <DisconnectedState mode={mode} error={connection.error} onRetry={retry} onUseMock={mode === 'live' ? () => setMode('mock') : undefined} />}
      {error && <ErrorState title="Training request failed" message={error} />}
      <div className="grid g4">
        {connection.state === 'checking' && !drl ? [0, 1, 2, 3].map((i) => <div key={i} className="panel stat"><Skeleton h={30} w="50%" /></div>) : (
          <>
            <Stat label="Exploration rate (ε)" value={drl?.epsilon ?? '–'} hint="Drops as the agent learns" />
            <Stat label="Total training steps" value={drl?.total_steps?.toLocaleString() ?? '–'} />
            <Stat label="Replay buffer" value={drl?.buffer_size?.toLocaleString() ?? '–'} hint="Stored transitions" />
            <Stat label="Latest success rate" value={runs.length ? `${runs[runs.length - 1].success}%` : '–'} hint={runs.length ? `Batch ${runs[runs.length - 1].batch}` : 'No batches yet'} />
          </>
        )}
      </div>

      <Panel title="Learning curves" icon={FlaskConical} actions={runs.length > 0 && <button className="btn small ghost" onClick={() => trainStore.clear((r) => r.mode === mode)}>Clear</button>}>
        {runs.length === 0 ? (
          <EmptyState title="No training batches yet" body="Each batch trains the agent on a few episodes and records how it did. Run one to start the curves." action={<button className="btn primary" onClick={() => train(5)} disabled={busy || offline}>Train 5 episodes</button>} />
        ) : (
          <div className="grid g2">
            <div style={{ height: 260 }}>
              <h3 style={{ fontSize: '.95rem', marginBottom: 6 }}>Success rate per batch (%)</h3>
              <ResponsiveContainer><LineChart data={runs} margin={{ left: -18, right: 8 }}><CartesianGrid stroke="#e6eaf0" /><XAxis dataKey="batch" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip /><Line dataKey="success" name="Success %" stroke="#17784d" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} /></LineChart></ResponsiveContainer>
            </div>
            <div style={{ height: 260 }}>
              <h3 style={{ fontSize: '.95rem', marginBottom: 6 }}>Mean return and loss</h3>
              <ResponsiveContainer><LineChart data={runs} margin={{ left: -18, right: 8 }}><CartesianGrid stroke="#e6eaf0" /><XAxis dataKey="batch" {...axis} /><YAxis {...axis} /><Tooltip /><Legend /><Line dataKey="reward" name="Mean return" stroke="#1b2f8e" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} /><Line dataKey="loss" name="Loss" stroke="#c7352b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} /></LineChart></ResponsiveContainer>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Policy benchmark" icon={Trophy} actions={<button className="btn small" onClick={runBench} disabled={benchBusy || offline}>{benchBusy ? <Spinner /> : null} {rows.length ? 'Run again' : 'Run benchmark'}</button>}>
        {benchBusy && !rows.length ? <div className="col"><Skeleton h={22} /><Skeleton h={22} /><Skeleton h={22} /></div>
          : rows.length === 0 ? <EmptyState title="Nothing to compare yet" body="The benchmark runs random movement, a standard D3QN and the full system on the same scenes. It can take a minute on the live backend." />
            : (
              <div className="col">
                <div style={{ height: 240 }}><ResponsiveContainer><BarChart data={rows} margin={{ left: -18 }}><CartesianGrid stroke="#e6eaf0" /><XAxis dataKey="policy_name" {...axis} /><YAxis domain={[0, 100]} {...axis} /><Tooltip /><Legend /><Bar dataKey="success_rate" name="Success %" fill="#17784d" isAnimationActive={false} /><Bar dataKey="collision_rate" name="Collision %" fill="#c7352b" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
                <div className="tablewrap"><table><caption className="sr">Benchmark results by policy</caption><thead><tr><th>Policy</th><th>Episodes</th><th>Success %</th><th>Collision %</th><th>Mean return</th><th>Mean steps</th><th>Mean jerk</th></tr></thead>
                  <tbody>{rows.map((r) => <tr key={r.policy_name}><td><strong>{r.policy_name}</strong></td><td>{r.episodes}</td><td>{r.success_rate}</td><td>{r.collision_rate}</td><td>{r.mean_reward}</td><td>{r.mean_steps}</td><td>{r.mean_jerk}</td></tr>)}</tbody></table></div>
              </div>
            )}
      </Panel>
    </DashShell>
  );
}
