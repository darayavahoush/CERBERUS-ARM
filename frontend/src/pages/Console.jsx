import React from 'react';
import { Pause, Play, RotateCcw, StepForward, Volume2, VolumeX, Sparkles, Terminal } from 'lucide-react';
import { DashShell } from '../components/Shell';
import Stage from '../components/Stage';
import { Assistant } from '../components/ConsoleParts';
import AIBrainPipeline from '../components/AIBrainPipeline';
import VisionMultiFilter from '../components/VisionMultiFilter';
import NasaTelemetryCockpit from '../components/NasaTelemetryCockpit';
import ThoughtProcessConsole from '../components/ThoughtProcessConsole';
import { DisconnectedState, ErrorState, Panel, Skeleton, Spinner } from '../components/ui';
import { useSim } from '../lib/SimProvider';
import { useBackend } from '../api/BackendProvider';
import { ACTIONS, COLOR_NAMES } from '../utils/kinematics';
import { sound } from '../utils/audio';

export default function Console() {
  const s = useSim();
  const { mode, setMode, connection, retry } = useBackend();
  const { sim } = s;
  const offline = connection.state === 'offline';
  const eps = connection.status?.drl?.epsilon ?? 0.05;
  const t = sim.obs?.objects?.[sim.obs?.target_idx];
  const [muted, setMuted] = React.useState(sound.isMuted());

  const handleToggleSound = () => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
  };

  const handleStepWithSound = (action = null) => {
    sound.playServoStep();
    s.step(action);
  };

  const handlePlanWithSound = (text) => {
    sound.playTargetLock();
    s.plan(text);
  };

  // Sound triggers on grasp/success
  React.useEffect(() => {
    if (sim.isGrasped) {
      sound.playMagneticGrasp();
    }
    if (sim.isSuccess) {
      sound.playSuccessChime();
    }
  }, [sim.isGrasped, sim.isSuccess]);

  return (
    <DashShell title="Autonomous Manipulation Console">
      {offline && <DisconnectedState mode={mode} error={connection.error} onRetry={retry} onUseMock={mode === 'live' ? () => setMode('mock') : undefined} />}
      {s.error && !offline && <ErrorState title="Telemetry Error" message={s.error} onRetry={() => { s.setError(null); s.reset(); }} />}

      {/* Top Telemetry & Control Bar */}
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="pill" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 11.5, fontFamily: 'var(--mono)' }}>
            ● MUJOCO 3.17 ACTIVE
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--mono)' }}>
            Integrator: RK4 (5ms) · Model: CERBERUS-RR
          </span>
        </div>

        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <button
            className="btn small"
            onClick={handleToggleSound}
            style={{ padding: '4px 8px', fontSize: 11, fontFamily: 'var(--mono)' }}
            title="Toggle Robotic Telemetry Audio Synthesizer"
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} style={{ color: '#22c55e' }} />}
            {muted ? 'Audio Muted' : 'Sound Active'}
          </button>
        </div>
      </div>

      {/* Main 3-Column Cockpit Layout */}
      <div className="console" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.05fr) minmax(0, 1.75fr) minmax(280px, 1.15fr)', gap: 16, alignItems: 'start' }}>
        {/* Left Column: Natural Language Reasoning & Observable Thought Process */}
        <div className="col" style={{ gap: 14 }}>
          <Assistant sim={sim} plan={s.plan} busy={s.busy} onExplain={s.explain} explaining={s.explaining} />
          <ThoughtProcessConsole sim={sim} plan={s.plan} busy={s.busy} onExplain={s.explain} explaining={s.explaining} />
        </div>

        {/* Center Column: 3D MuJoCo Digital Twin & Neural Pipeline */}
        <div className="col" style={{ gap: 14 }}>
          <Panel
            title="Manipulator Workspace"
            bodyClass="body"
            actions={t && (
              <span className="pill" style={{ fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 600 }}>
                Target: {COLOR_NAMES[t.color] || t.color} {t.shape}
              </span>
            )}
          >
            {!sim.obs ? (
              <div className="col"><Skeleton h={400} /><span className="sr" role="status">Loading MuJoCo workspace</span></div>
            ) : (
              <Stage
                observation={sim.obs}
                obstacles={sim.obstacles}
                trail={s.trail}
                onSelect={(i, o) => handlePlanWithSound(`Pick the ${COLOR_NAMES[o.color] || o.color} ${o.shape} and deposit it into the ${(sim.obs.goal_key || 'blue_bin').split('_')[0]} bay`)}
              />
            )}

            {/* Simulation Dispatch Controls */}
            <div className="row wrap" style={{ marginTop: 14, gap: 8, alignItems: 'center' }}>
              <button
                className="btn primary"
                onClick={() => {
                  sound.playServoStep();
                  s.setPlaying(!s.playing);
                }}
                disabled={!sim.obs || sim.finished || s.busy}
                style={{ fontWeight: 600 }}
              >
                {s.playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                {s.playing ? 'Pause Motion' : 'Execute Policy'}
              </button>

              <button
                className="btn"
                onClick={() => handleStepWithSound()}
                disabled={!sim.obs || sim.finished || s.playing}
              >
                <StepForward size={15} aria-hidden /> Step (Δt)
              </button>

              <button
                className="btn"
                onClick={() => s.reset()}
                disabled={s.busy}
              >
                {s.busy ? <Spinner size={14} /> : <RotateCcw size={15} aria-hidden />} Reset Scene
              </button>

              <span className="faint end" style={{ fontSize: 11.5, fontFamily: 'var(--mono)' }}>
                Drag to orbit · Scroll to zoom
              </span>
            </div>

            {/* Manual Joint Micro-Stepping */}
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 12.5, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
                ▶ Manual Joint Actuation Primitives
              </summary>
              <div className="row wrap" style={{ marginTop: 8, gap: 5 }}>
                {ACTIONS.map((a, i) => (
                  <button
                    key={a}
                    className="btn small"
                    disabled={!sim.obs || sim.finished || s.playing}
                    onClick={() => handleStepWithSound(i)}
                    style={{ fontSize: 11, fontFamily: 'var(--mono)' }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </details>
          </Panel>

          {/* AI Brain & Neural Architecture Pipeline */}
          <AIBrainPipeline
            busy={s.busy || s.playing}
            perceptionConfidence={s.perception?.confidence ?? 0.964}
            manipulability={sim.obs?.manipulability ?? 0.707}
            epsilon={eps}
          />
        </div>

        {/* Right Column: NASA Telemetry Gauges & Multi-Filter Vision HUD */}
        <div className="col" style={{ gap: 14 }}>
          <NasaTelemetryCockpit sim={sim} epsilon={eps} />
          <VisionMultiFilter
            renderedImage={sim.renderedImage}
            perception={s.perception}
            onInspect={s.inspect}
            busy={s.busy}
            shapes={connection.status?.cnn?.classes?.shapes}
          />
        </div>
      </div>
    </DashShell>
  );
}
