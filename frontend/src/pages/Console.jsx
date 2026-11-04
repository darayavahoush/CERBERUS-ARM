import React, { useState, useEffect } from 'react';
import { Pause, Play, RotateCcw, StepForward, Volume2, VolumeX, Sparkles, Terminal, Dices } from 'lucide-react';
import { DashShell } from '../components/Shell';
import Stage from '../components/Stage';
import { Assistant } from '../components/ConsoleParts';
import MissionControlHeader from '../components/MissionControlHeader';
import AIBrainPipeline from '../components/AIBrainPipeline';
import VisionMultiFilter from '../components/VisionMultiFilter';
import NasaTelemetryCockpit from '../components/NasaTelemetryCockpit';
import ThoughtProcessConsole from '../components/ThoughtProcessConsole';
import { DisconnectedState, ErrorState, Panel, Skeleton, Spinner } from '../components/ui';
import { useSim } from '../lib/SimProvider';
import { useBackend } from '../api/BackendProvider';
import { ACTIONS, COLOR_NAMES, COMPONENT_LABELS, RECEPTACLES } from '../utils/kinematics';
import { sound } from '../utils/audio';

export default function Console() {
  const s = useSim();
  const { mode, setMode, connection, retry } = useBackend();
  const { sim } = s;
  const offline = connection.state === 'offline';
  const eps = connection.status?.drl?.epsilon ?? 0.05;
  const t = sim.obs?.objects?.[sim.obs?.target_idx];
  const [muted, setMuted] = useState(sound.isMuted());

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

  const handleRandomizeWorkcell = () => {
    sound.playTargetLock();
    s.reset({ num_components: Math.floor(Math.random() * 3) + 4 });
  };

  // Audio cues on state transitions
  useEffect(() => {
    if (sim.isGrasped) sound.playMagneticGrasp();
    if (sim.isSuccess) sound.playSuccessChime();
  }, [sim.isGrasped, sim.isSuccess]);

  return (
    <DashShell title="Autonomous Manipulation Cockpit">
      {offline && <DisconnectedState mode={mode} error={connection.error} onRetry={retry} onUseMock={mode === 'live' ? () => setMode('mock') : undefined} />}
      {s.error && !offline && <ErrorState title="Telemetry Error" message={s.error} onRetry={() => { s.setError(null); s.reset(); }} />}

      {/* 1. MISSION CONTROL HEADER: Executive Status, Voice Control & Rapid Actions */}
      <div style={{ marginBottom: 16 }}>
        <MissionControlHeader
          sim={sim}
          isPlaying={s.playing}
          onPlayToggle={() => {
            sound.playServoStep();
            s.setPlaying(!s.playing);
          }}
          onStep={() => handleStepWithSound()}
          onReset={() => s.reset()}
          onRandomize={handleRandomizeWorkcell}
          onVoiceCommand={(cmd) => handlePlanWithSound(cmd)}
          busy={s.busy}
        />
      </div>

      {/* 2. MAIN 3-COLUMN INDUSTRIAL COCKPIT LAYOUT */}
      <div className="console" style={{ display: 'grid', gridTemplateColumns: 'minmax(270px, 0.95fr) minmax(420px, 1.85fr) minmax(290px, 1.15fr)', gap: 16, alignItems: 'start' }}>
        {/* Left Column: Natural Language Instruction & Observable Thought Process */}
        <div className="col" style={{ gap: 14 }}>
          <Assistant sim={sim} plan={s.plan} busy={s.busy} onExplain={s.explain} explaining={s.explaining} />
          <ThoughtProcessConsole sim={sim} plan={s.plan} busy={s.busy} onExplain={s.explain} explaining={s.explaining} />
        </div>

        {/* Center Column: 3D MuJoCo Digital Twin Workspace */}
        <div className="col" style={{ gap: 14 }}>
          <Panel
            title="Cleanroom Precision Manipulator"
            bodyClass="body"
            actions={t && (
              <span className="pill info" style={{ fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 600 }}>
                Target: {COLOR_NAMES[t.color] || t.color} {COMPONENT_LABELS[t.shape] || t.shape}
              </span>
            )}
          >
            {!sim.obs ? (
              <div className="col"><Skeleton h={480} /><span className="sr" role="status">Loading MuJoCo 3D workspace</span></div>
            ) : (
              <Stage
                observation={sim.obs}
                obstacles={sim.obstacles}
                trail={s.trail}
                onSelect={(i, o) => handlePlanWithSound(`Sort the ${COLOR_NAMES[o.color] || o.color} ${COMPONENT_LABELS[o.shape] || o.shape} into ${(sim.obs.goal_key || 'blue_bin').replace('_', ' ')}`)}
              />
            )}

            {/* Manual Joint Micro-Stepping (3-DOF Actuation) */}
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
                ▶ Manual 3-DOF Joint Actuation Primitives
              </summary>
              <div className="row wrap" style={{ marginTop: 8, gap: 5 }}>
                {ACTIONS.map((a, i) => (
                  <button
                    key={a}
                    className="btn small"
                    disabled={!sim.obs || sim.finished || s.playing}
                    onClick={() => handleStepWithSound(i)}
                    style={{ fontSize: 10.5, fontFamily: 'var(--mono)', padding: '3px 8px' }}
                  >
                    [{i}] {a}
                  </button>
                ))}
              </div>
            </details>
          </Panel>

          {/* AI Brain & End-to-End Neural Architecture Pipeline */}
          <AIBrainPipeline
            busy={s.busy || s.playing}
            perceptionConfidence={s.perception?.confidence ?? 0.984}
            manipulability={sim.obs?.manipulability ?? 0.76}
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
