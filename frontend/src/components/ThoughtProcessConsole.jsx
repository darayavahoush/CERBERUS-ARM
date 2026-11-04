import React from 'react';
import { Terminal, ShieldCheck, AlertCircle, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { COLOR_NAMES } from '../utils/kinematics';

export default function ThoughtProcessConsole({
  sim,
  plan,
  busy = false,
  onExplain,
  explaining = false,
}) {
  const obs = sim?.obs;
  const target = obs?.objects?.[obs?.target_idx];
  const goalKey = obs?.goal_key || 'blue_bin';
  const grasped = obs && obs.grasped_idx !== null && obs.grasped_idx !== undefined;
  const finished = sim?.finished;
  const success = sim?.isSuccess;
  const collision = sim?.isCollision;

  return (
    <div className="panel col" style={{ padding: 14, gap: 10 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Terminal size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            AI Thought Process & Observable CoT
          </h3>
        </div>
        <span className="pill" style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: busy ? '#22c55e' : 'var(--ink-3)' }}>
          {busy ? 'REASONING...' : 'DISPATCH READY'}
        </span>
      </div>

      {/* Observable Pipeline Timeline */}
      <div className="col" style={{ gap: 6, fontFamily: 'var(--mono)', fontSize: 11 }}>
        {/* Step 1: Vision Detection */}
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            {target ? <CheckCircle2 size={13} style={{ color: '#22c55e' }} /> : <Clock size={13} style={{ color: 'var(--ink-3)' }} />}
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ color: target ? 'var(--ink-1)' : 'var(--ink-3)', fontWeight: 600 }}>
              01 // SENSORY RECEPTOR (CoordConv)
            </span>
            <span style={{ color: 'var(--ink-2)', fontSize: 10.5 }}>
              {target
                ? `Entity locked: [${COLOR_NAMES[target.color] || target.color} ${target.shape}] at (${target.x.toFixed(2)}, ${target.y.toFixed(2)})`
                : 'Searching workspace for geometrical entities...'}
            </span>
          </div>
        </div>

        {/* Step 2: Task Goal Grounding */}
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            {plan ? <CheckCircle2 size={13} style={{ color: '#22c55e' }} /> : <Clock size={13} style={{ color: 'var(--ink-3)' }} />}
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ color: plan ? 'var(--ink-1)' : 'var(--ink-3)', fontWeight: 600 }}>
              02 // NEURO-SYMBOLIC COMPILER (Ollama)
            </span>
            <span style={{ color: 'var(--ink-2)', fontSize: 10.5 }}>
              {plan?.task_summary
                ? `Compiled: ${plan.task_summary} → Dest: ${goalKey}`
                : 'Awaiting operator instruction...'}
            </span>
          </div>
        </div>

        {/* Step 3: Trajectory & Grasp */}
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            {grasped ? <CheckCircle2 size={13} style={{ color: '#22c55e' }} /> : <Clock size={13} style={{ color: 'var(--ink-3)' }} />}
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ color: grasped ? '#22c55e' : 'var(--ink-3)', fontWeight: 600 }}>
              03 // MANIPULATION POLICY (D3QN + HER)
            </span>
            <span style={{ color: 'var(--ink-2)', fontSize: 10.5 }}>
              {grasped
                ? 'Object captured! Enforcing magnetic lock during transit.'
                : `Pre-grasp phase. Distance to target: ${obs?.dist_ee_obj ? (obs.dist_ee_obj).toFixed(2) : '0.00'}m`}
            </span>
          </div>
        </div>

        {/* Step 4: Safety & Hazard */}
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div style={{ marginTop: 2 }}>
            {collision ? <AlertCircle size={13} style={{ color: '#ef4444' }} /> : <ShieldCheck size={13} style={{ color: '#22c55e' }} />}
          </div>
          <div className="col" style={{ gap: 2 }}>
            <span style={{ color: collision ? '#ef4444' : 'var(--ink-1)', fontWeight: 600 }}>
              04 // SAFETY BOUNDARY MONITOR
            </span>
            <span style={{ color: 'var(--ink-2)', fontSize: 10.5 }}>
              {collision
                ? 'COLLISION ALERT: Safety boundary violated!'
                : 'Hazard clearance verified > 0.22m radius.'}
            </span>
          </div>
        </div>
      </div>

      {/* Post-Hoc Forensics Button */}
      {finished && (
        <div className="col" style={{ gap: 6, marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: success ? '#22c55e' : '#f5c518', fontWeight: 700 }}>
              {success ? '✓ TASK COMPLETED' : 'TRAJECTORY CONCLUDED'}
            </span>
            <button className="btn small primary" onClick={onExplain} disabled={explaining} style={{ fontSize: 10.5, padding: '2px 8px' }}>
              {explaining ? 'Analyzing...' : 'Generate XAI Forensics'}
            </button>
          </div>
          {sim?.explanation && (
            <div style={{ fontSize: 11, fontFamily: 'var(--font)', fontStyle: 'italic', color: 'var(--ink-2)', background: 'var(--surface-sunken)', padding: 8, borderRadius: 6, lineHeight: 1.45 }}>
              "{sim.explanation}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
