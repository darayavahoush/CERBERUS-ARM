import React, { useState } from 'react';
import { Box, Layers, Maximize2 } from 'lucide-react';
import { RECEPTACLES, STAGE_COLORS, COLOR_NAMES, DEFAULT_PILLAR, radToDeg } from '../utils/kinematics';
import MuJoCoStage3D from './MuJoCoStage3D';

const starPoints = (r) => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const rr = i % 2 ? r * 0.5 : r * 1.2;
  return `${(rr * Math.cos(a)).toFixed(3)},${(rr * Math.sin(a)).toFixed(3)}`;
}).join(' ');

function Shape({ shape, r }) {
  if (shape === 'cube') return <rect x={-r} y={-r} width={2 * r} height={2 * r} rx={0.01} />;
  if (shape === 'sphere') return <circle r={r} />;
  if (shape === 'triangle') return <polygon points={`0,${-1.15 * r} ${1.05 * r},${0.85 * r} ${-1.05 * r},${0.85 * r}`} />;
  return <polygon points={starPoints(r)} />;
}

// World coords are y-up; the SVG is y-down, so every y goes through Y().
const Y = (y) => -y;

export default function Stage({ observation: obs, mujocoState = null, obstacles = [], trail = [], onSelect, bare = false, showHud = true, label }) {
  const [viewMode, setViewMode] = useState('3d'); // '3d' | '2d'
  const pillars = obstacles.length ? obstacles : [DEFAULT_PILLAR];
  const targetIdx = obs?.target_idx ?? 0;
  const goalKey = obs?.goal_key || 'blue_bin';
  const grasped = obs && obs.grasped_idx !== null && obs.grasped_idx !== undefined;
  const target = obs?.objects?.[targetIdx];
  const desc = obs
    ? `Workspace. Target ${COLOR_NAMES[target?.color] || ''} ${target?.shape || ''} going to ${goalKey.replace('_', ' ')}. Gripper ${obs.gripper_closed ? 'closed' : 'open'}.`
    : 'Workspace, waiting for data.';

  return (
    <div className="col" style={{ gap: 8 }}>
      {/* Top View Selector Switcher */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>
          <Box size={15} style={{ color: 'var(--accent)' }} />
          <span>Workspace Environment</span>
        </div>
        <div className="row" style={{ gap: 4, background: 'var(--surface-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
          <button
            type="button"
            className={`btn small ${viewMode === '3d' ? 'primary' : ''}`}
            style={{ padding: '3px 8px', fontSize: 11.5, fontWeight: 600 }}
            onClick={() => setViewMode('3d')}
          >
            3D MuJoCo Twin
          </button>
          <button
            type="button"
            className={`btn small ${viewMode === '2d' ? 'primary' : ''}`}
            style={{ padding: '3px 8px', fontSize: 11.5, fontWeight: 600 }}
            onClick={() => setViewMode('2d')}
          >
            2D Blueprint
          </button>
        </div>
      </div>

      {/* Render 3D MuJoCo Twin */}
      {viewMode === '3d' ? (
        <div className="w-full">
          <MuJoCoStage3D
            observation={obs}
            mujocoState={mujocoState}
            obstacles={obstacles}
            trail={trail}
            onSelect={onSelect}
          />
        </div>
      ) : (
        /* Render 2D SVG Blueprint */
        <div className="stage">
          {showHud && obs && (
            <div className="hud" aria-hidden>
              <span className="tag">J1 {radToDeg(obs.theta1)}°</span>
              <span className="tag">J2 {radToDeg(obs.theta2)}°</span>
              <span className="tag">J3 {radToDeg(obs.theta3 ?? -0.42)}°</span>
              <span className="tag">{grasped ? 'Carrying' : obs.gripper_closed ? 'Gripper closed' : 'Gripper open'}</span>
            </div>
          )}
          <svg viewBox="-2.2 -2.2 4.4 2.6" role="img" aria-label={label || desc}>
            <defs>
              <pattern id="hz" width="0.08" height="0.08" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="0.08" stroke="#fff" strokeOpacity=".5" strokeWidth="0.02" />
              </pattern>
              <pattern id="gr" width="0.2" height="0.2" patternUnits="userSpaceOnUse">
                <path d="M0.2 0H0V0.2" fill="none" stroke="#fff" strokeOpacity=".07" strokeWidth="0.004" />
              </pattern>
            </defs>
            <rect x="-2.2" y="-2.2" width="4.4" height="2.6" fill="url(#gr)" />
            <line x1="-2.2" y1="0" x2="2.2" y2="0" stroke="#fff" strokeOpacity=".5" strokeWidth="0.01" />

            {!bare && [0.4, 0.8, 1.2, 1.6, 1.8].map((r) => (
              <path key={r} d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`} fill="none" stroke="#fff" strokeOpacity={r === 1.8 ? 0.45 : 0.14} strokeWidth="0.008" strokeDasharray={r === 1.8 ? '0.04 0.03' : undefined} />
            ))}

            {pillars.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={Y(p.y)} r={p.radius} fill="url(#hz)" stroke="#fff" strokeWidth="0.015" />
                <text x={p.x} y={Y(p.y) + 0.035} textAnchor="middle" fontSize="0.085" fill="#fff" fontWeight="600" style={{ paintOrder: 'stroke' }} stroke="#1b2f8e" strokeWidth="0.03">Pillar</text>
              </g>
            ))}

            {Object.entries(RECEPTACLES).map(([key, b]) => {
              const on = key === goalKey;
              return (
                <g key={key}>
                  {on && <circle cx={b.pos[0]} cy={Y(b.pos[1])} r={b.radius + 0.06} fill="none" stroke="#f5c518" strokeWidth="0.03" />}
                  <circle cx={b.pos[0]} cy={Y(b.pos[1])} r={b.radius} fill={STAGE_COLORS[b.color]} fillOpacity=".22" stroke={STAGE_COLORS[b.color]} strokeWidth="0.025" strokeDasharray={on ? undefined : '0.05 0.04'} />
                  <text x={b.pos[0]} y={Y(b.pos[1]) + b.radius + 0.14} textAnchor="middle" fontSize="0.09" fill="#fff" fillOpacity={on ? 1 : 0.7}>{b.label}{on ? ' (goal)' : ''}</text>
                </g>
              );
            })}

            {trail.length > 1 && (
              <polyline points={trail.map((p) => `${p[0].toFixed(3)},${Y(p[1]).toFixed(3)}`).join(' ')} fill="none" stroke="#f5c518" strokeOpacity=".75" strokeWidth="0.02" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {(obs?.objects || []).map((o, i) => {
              const isTarget = i === targetIdx;
              const name = `${COLOR_NAMES[o.color] || o.color} ${o.shape}`;
              return (
                <g key={i} transform={`translate(${o.x}, ${Y(o.y)})`}
                  onClick={() => onSelect && onSelect(i, o)}
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}>
                  {isTarget && <circle r="0.14" fill="none" stroke="#f5c518" strokeWidth="0.02" strokeDasharray="0.04 0.03" />}
                  <g fill={STAGE_COLORS[o.color]} stroke="#fff" strokeWidth="0.015"><Shape shape={o.shape} r={o.radius} /></g>
                  {isTarget && (
                    <text y="-0.16" textAnchor="middle" fontSize="0.08" fill="#f5c518" fontWeight="700">target</text>
                  )}
                </g>
              );
            })}

            {obs?.fk && (
              <g>
                <line x1={obs.fk.base[0]} y1={Y(obs.fk.base[1])} x2={obs.fk.elbow[0]} y2={Y(obs.fk.elbow[1])} stroke="#fff" strokeWidth="0.065" strokeLinecap="round" />
                {obs.fk.wrist ? (
                  <>
                    <line x1={obs.fk.elbow[0]} y1={Y(obs.fk.elbow[1])} x2={obs.fk.wrist[0]} y2={Y(obs.fk.wrist[1])} stroke="#38bdf8" strokeWidth="0.055" strokeLinecap="round" />
                    <line x1={obs.fk.wrist[0]} y1={Y(obs.fk.wrist[1])} x2={obs.fk.ee[0]} y2={Y(obs.fk.ee[1])} stroke="#f5c518" strokeWidth="0.045" strokeLinecap="round" />
                    <circle cx={obs.fk.wrist[0]} cy={Y(obs.fk.wrist[1])} r="0.055" fill="#f5c518" stroke="#1b2f8e" strokeWidth="0.015" />
                  </>
                ) : (
                  <line x1={obs.fk.elbow[0]} y1={Y(obs.fk.elbow[1])} x2={obs.fk.ee[0]} y2={Y(obs.fk.ee[1])} stroke="#f5c518" strokeWidth="0.05" strokeLinecap="round" />
                )}
                <circle cx={obs.fk.base[0]} cy={Y(obs.fk.base[1])} r="0.09" fill="#1b2f8e" stroke="#fff" strokeWidth="0.02" />
                <circle cx={obs.fk.elbow[0]} cy={Y(obs.fk.elbow[1])} r="0.07" fill="#1b2f8e" stroke="#fff" strokeWidth="0.02" />
                <circle cx={obs.fk.ee[0]} cy={Y(obs.fk.ee[1])} r="0.05" fill={grasped ? '#22c55e' : obs.gripper_closed ? '#ef4444' : '#fff'} stroke="#1b2f8e" strokeWidth="0.02" />
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
