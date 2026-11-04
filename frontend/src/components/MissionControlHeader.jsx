import React, { useState } from 'react';
import { Play, Pause, StepForward, RotateCcw, Dices, Mic, MicOff, Volume2, Sparkles, Layers, ShieldCheck, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { COLOR_NAMES, COMPONENT_LABELS, RECEPTACLES } from '../utils/kinematics';
import { sound } from '../utils/audio';

export default function MissionControlHeader({
  sim,
  onPlayToggle,
  isPlaying,
  onStep,
  onReset,
  onRandomize,
  onVoiceCommand,
  busy,
}) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  const obs = sim?.obs;
  const targetObj = obs?.objects?.[obs?.target_idx];
  const goalKey = obs?.goal_key || 'blue_bin';
  const goal = RECEPTACLES[goalKey] || { label: 'Bay B · AOI Inspection' };

  const isGrasped = obs && obs.grasped_idx !== null && obs.grasped_idx !== undefined;
  const gripperClosed = obs?.gripper_closed ?? false;
  const currentStep = obs?.step ?? 0;
  const maxSteps = obs?.max_steps ?? 80;
  const progressPct = Math.min(100, Math.round((currentStep / maxSteps) * 100));

  const statusLabel = sim?.success
    ? 'MISSION SUCCESSFUL'
    : sim?.collision
    ? 'COLLISION INTERLOCK'
    : isGrasped
    ? 'TRANSPORTING TO BAY'
    : gripperClosed
    ? 'CLAMPING JAWS'
    : obs?.dist_ee_obj < 0.25
    ? 'APPROACHING TARGET'
    : 'SEEKING COMPONENT';

  const statusColor = sim?.success
    ? '#22c55e'
    : sim?.collision
    ? '#ef4444'
    : isGrasped
    ? '#38bdf8'
    : '#f59e0b';

  const triggerVoice = (text) => {
    sound.playTargetLock();
    if (onVoiceCommand) onVoiceCommand(text);
  };

  return (
    <div className="panel col" style={{ padding: '12px 16px', gap: 12, border: '1px solid var(--line)', background: 'var(--surface-raised)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
      {/* Top Row: Mission Identity & Real-Time Status */}
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, display: 'inline-block', boxShadow: `0 0 10px ${statusColor}` }} />
            <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-1)' }}>
              MISSION CONTROL · CLEANROOM WORKCELL
            </span>
            <span className="pill" style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: statusColor, background: `${statusColor}18`, borderColor: `${statusColor}40`, fontWeight: 700 }}>
              {statusLabel}
            </span>
          </div>

          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
            Target: <strong style={{ color: 'var(--accent)' }}>{COLOR_NAMES[targetObj?.color] || targetObj?.color || 'Crimson'} {COMPONENT_LABELS[targetObj?.shape] || targetObj?.shape || 'Component'}</strong> → Route to <strong style={{ color: 'var(--ink-1)' }}>{goal.label}</strong>
          </span>
        </div>

        {/* Action Controls */}
        <div className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
          <button
            className="btn primary"
            onClick={onPlayToggle}
            disabled={!obs || sim.finished || busy}
            style={{ fontWeight: 600, padding: '7px 14px', fontSize: 13 }}
          >
            {isPlaying ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            {isPlaying ? 'Pause Motion' : 'Execute Policy'}
          </button>

          <button
            className="btn"
            onClick={onStep}
            disabled={!obs || sim.finished || isPlaying}
            style={{ padding: '7px 12px', fontSize: 13 }}
          >
            <StepForward size={15} aria-hidden /> Step (Δt)
          </button>

          <button
            className="btn"
            onClick={onRandomize || onReset}
            disabled={busy}
            style={{ padding: '7px 12px', fontSize: 13, borderColor: 'var(--accent)', color: 'var(--accent)' }}
            title="Generate random sample space with randomized objects each time"
          >
            <Dices size={15} aria-hidden /> 🎲 Randomize Workcell
          </button>

          <button
            className="btn small"
            onClick={onReset}
            disabled={busy}
            style={{ padding: '7px 11px', fontSize: 12 }}
          >
            <RotateCcw size={14} aria-hidden /> Reset
          </button>
        </div>
      </div>

      {/* Second Row: Mission Progress Bar & Telemetry Strip */}
      <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 6, borderTop: '1px solid var(--line)' }}>
        {/* Progress Bar */}
        <div className="row" style={{ flex: 1, minWidth: 260, gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
            STEP {currentStep} / {maxSteps} ({progressPct}%)
          </span>
          <div style={{ flex: 1, height: 6, background: 'var(--surface-sunken)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #38bdf8, #22c55e)', transition: 'width 0.15s ease' }} />
          </div>
        </div>

        {/* Voice Assistant Shortcut & Object Memory Toggle */}
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button
            className={`btn small ${voiceActive ? 'primary' : ''}`}
            onClick={() => setVoiceActive(!voiceActive)}
            style={{ fontSize: 11.5, fontFamily: 'var(--mono)', padding: '4px 10px' }}
          >
            {voiceActive ? <Mic size={13} style={{ color: '#22c55e' }} /> : <MicOff size={13} />}
            Hey Cerberus Voice
          </button>

          <button
            className="btn small"
            onClick={() => setShowMemory(!showMemory)}
            style={{ fontSize: 11.5, fontFamily: 'var(--mono)', padding: '4px 10px' }}
          >
            <Layers size={13} />
            Memory Graph ({obs?.objects?.length ?? 0})
          </button>
        </div>
      </div>

      {/* Voice Assistant Prompt Strip */}
      {voiceActive && (
        <div className="row wrap" style={{ padding: '8px 12px', background: 'var(--surface-sunken)', borderRadius: 8, gap: 8, alignItems: 'center', border: '1px solid var(--line)' }}>
          <span className="row" style={{ gap: 6, fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--accent)', fontWeight: 600 }}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            VOICE COMMAND:
          </span>
          <div className="row wrap" style={{ gap: 6 }}>
            {[
              'Route cobalt micro-module to Bay B (AOI Inspection)',
              'Carefully place amber lithium cell in Bay A (SMT Staging)',
              'Transfer emerald quartz lens to Bay C (Cleanroom QA)',
              'Rapidly clear workcell avoiding central laser spindle',
            ].map((phrase) => (
              <button
                key={phrase}
                className="chip"
                onClick={() => triggerVoice(phrase)}
                style={{ fontSize: 11, fontFamily: 'var(--mono)', background: 'var(--surface)', padding: '3px 8px' }}
              >
                "{phrase}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Object Memory Table (Epistemic World Model) */}
      {showMemory && obs?.objects && (
        <div style={{ maxHeight: 150, overflowY: 'auto', background: 'var(--surface-sunken)', borderRadius: 8, border: '1px solid var(--line)', padding: '6px 10px', fontSize: 11.5, fontFamily: 'var(--mono)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '4px 6px' }}>COMPONENT ID</th>
                <th style={{ padding: '4px 6px' }}>TAXONOMY</th>
                <th style={{ padding: '4px 6px' }}>COORDINATES (X, Y)</th>
                <th style={{ padding: '4px 6px' }}>CONFIDENCE</th>
                <th style={{ padding: '4px 6px' }}>STATE</th>
              </tr>
            </thead>
            <tbody>
              {obs.objects.map((o, idx) => {
                const isTarget = idx === obs.target_idx;
                const isItemGrasped = isGrasped && obs.grasped_idx === idx;
                return (
                  <tr key={o.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: isTarget ? 'var(--accent)' : 'var(--ink-1)' }}>
                    <td style={{ padding: '4px 6px', fontWeight: isTarget ? 700 : 400 }}>{o.id || `comp_${idx + 1}`}</td>
                    <td style={{ padding: '4px 6px' }}>{COLOR_NAMES[o.color] || o.color} {COMPONENT_LABELS[o.shape] || o.shape}</td>
                    <td style={{ padding: '4px 6px' }}>({o.x.toFixed(2)}, {o.y.toFixed(2)})</td>
                    <td style={{ padding: '4px 6px', color: '#22c55e' }}>98.4%</td>
                    <td style={{ padding: '4px 6px' }}>
                      <span className={`pill ${isItemGrasped ? 'ok' : isTarget ? 'info' : ''}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                        {isItemGrasped ? 'CLAMPED' : isTarget ? 'ACTIVE TARGET' : 'UNPICKED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
