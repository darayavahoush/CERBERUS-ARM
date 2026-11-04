import React from 'react';
import { Activity, Gauge, Zap, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { ACTIONS, radToDeg } from '../utils/kinematics';

export default function NasaTelemetryCockpit({
  sim,
  epsilon = 0.05,
}) {
  const obs = sim?.obs;
  const qVals = sim?.q || [];
  const totalReward = sim?.total ?? 0;

  const theta1Deg = obs?.theta1 ? radToDeg(obs.theta1) : '45.0';
  const theta2Deg = obs?.theta2 ? radToDeg(obs.theta2) : '60.0';
  const theta3Deg = obs?.theta3 ? radToDeg(obs.theta3) : '-45.0';
  const manipulability = obs?.manipulability ?? 0.76;
  const isNearSingularity = manipulability < 0.05;

  // Min-max normalization for Q-values
  const maxQ = qVals.length ? Math.max(...qVals, 0.01) : 1;
  const minQ = qVals.length ? Math.min(...qVals, 0) : 0;
  const rangeQ = Math.max(maxQ - minQ, 0.01);

  return (
    <div className="panel col" style={{ padding: 14, gap: 12 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Gauge size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            NASA Telemetry & 3-DOF Actuation
          </h3>
        </div>
        <div className="row" style={{ gap: 6, fontSize: 11, fontFamily: 'var(--mono)' }}>
          <span style={{ color: 'var(--ink-3)' }}>ε-decay:</span>
          <span style={{ color: 'var(--amber)', fontWeight: 700 }}>{epsilon.toFixed(3)}</span>
        </div>
      </div>

      {/* Primary Kinematics & Physics Gauges Strip (3-DOF) */}
      <div className="row wrap" style={{ gap: 5, fontFamily: 'var(--mono)', textAlign: 'center' }}>
        <div className="panel col" style={{ flex: 1, minWidth: 55, padding: '6px 3px', background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ fontSize: 9.0, color: 'var(--ink-3)', textTransform: 'uppercase' }}>J1 θ₁</span>
          <strong style={{ fontSize: 12, color: 'var(--ink-1)' }}>{theta1Deg}°</strong>
        </div>

        <div className="panel col" style={{ flex: 1, minWidth: 55, padding: '6px 3px', background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ fontSize: 9.0, color: 'var(--ink-3)', textTransform: 'uppercase' }}>J2 θ₂</span>
          <strong style={{ fontSize: 12, color: 'var(--ink-1)' }}>{theta2Deg}°</strong>
        </div>

        <div className="panel col" style={{ flex: 1, minWidth: 55, padding: '6px 3px', background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ fontSize: 9.0, color: 'var(--ink-3)', textTransform: 'uppercase' }}>J3 θ₃</span>
          <strong style={{ fontSize: 12, color: 'var(--ink-1)' }}>{theta3Deg}°</strong>
        </div>

        <div className="panel col" style={{ flex: 1, minWidth: 55, padding: '6px 3px', background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ fontSize: 9.0, color: 'var(--ink-3)', textTransform: 'uppercase' }}>Manip w</span>
          <strong style={{ fontSize: 12, color: isNearSingularity ? '#ef4444' : '#22c55e' }}>
            {manipulability.toFixed(2)}
          </strong>
        </div>

        <div className="panel col" style={{ flex: 1, minWidth: 55, padding: '6px 3px', background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ fontSize: 9.0, color: 'var(--ink-3)', textTransform: 'uppercase' }}>Return ΣR</span>
          <strong style={{ fontSize: 12, color: totalReward >= 0 ? '#22c55e' : '#f5c518' }}>
            {totalReward.toFixed(1)}
          </strong>
        </div>
      </div>

      {/* Q-Value Action Distribution across all 9 discrete primitives */}
      <div className="col" style={{ gap: 2.5, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
        <div className="row" style={{ justifyContent: 'space-between', color: 'var(--ink-3)', fontSize: 9.5, marginBottom: 2 }}>
          <span>ACTION ADVANTAGE Q(s, a)</span>
          <span>ESTIMATED VALUE</span>
        </div>

        {ACTIONS.map((label, idx) => {
          const q = qVals[idx] ?? 0;
          const isSelected = sim?.action === idx;
          const pct = Math.max(5, Math.min(100, ((q - minQ) / rangeQ) * 100));

          return (
            <div key={label} className="row" style={{ gap: 6, alignItems: 'center' }}>
              <span style={{ width: 92, fontSize: 10, color: isSelected ? 'var(--accent)' : 'var(--ink-2)', fontWeight: isSelected ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                [{idx}] {label}
              </span>
              <div style={{ flex: 1, height: 9, background: 'var(--surface-sunken)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isSelected ? 'linear-gradient(90deg, #0ea5e9, #22c55e)' : 'var(--ink-3)',
                    transition: 'width 0.15s ease',
                  }}
                />
              </div>
              <span style={{ width: 38, textAlign: 'right', fontSize: 10, color: isSelected ? '#22c55e' : 'var(--ink-3)', fontWeight: isSelected ? 700 : 400 }}>
                {q.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
