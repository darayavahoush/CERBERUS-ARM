import React, { useState } from 'react';
import { Eye, Layers, Scan, Crosshair, Sparkles, Filter } from 'lucide-react';
import { STAGE_COLORS, COLOR_NAMES } from '../utils/kinematics';

const FILTERS = [
  { id: 'rgb', label: 'RGB Video' },
  { id: 'gradcam', label: 'Grad-CAM Attention' },
  { id: 'depth', label: 'Synthetic Depth' },
  { id: 'hud', label: 'Tactical HUD' },
];

export default function VisionMultiFilter({
  renderedImage,
  perception,
  onInspect,
  busy = false,
  shapes = ['cube', 'sphere', 'triangle', 'star'],
}) {
  const [activeFilter, setActiveFilter] = useState('hud');

  const shape = perception?.predicted_shape || 'cube';
  const color = perception?.predicted_color || 'crimson';
  const conf = perception?.confidence || 0.962;
  const coords = perception?.predicted_normalized_coords || [0.48, 0.52];

  return (
    <div className="panel col" style={{ padding: 14, gap: 10 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <Eye size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            CoordConv Vision & Multi-Filter Feed
          </h3>
        </div>
        <button
          className="btn small primary"
          onClick={onInspect}
          disabled={busy}
          style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600 }}
        >
          <Scan size={12} className={busy ? 'spin' : ''} />
          {busy ? 'Extracting...' : 'Extract Features'}
        </button>
      </div>

      {/* Filter Switcher Tabs */}
      <div className="row wrap" style={{ gap: 4, background: 'var(--surface-sunken)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn small ${activeFilter === f.id ? 'primary' : ''}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Viewport */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center"
        style={{ aspectRatio: '1 / 1', maxHeight: 220, position: 'relative' }}
      >
        {renderedImage ? (
          <img
            src={renderedImage}
            alt="Workspace camera feed"
            className="w-full h-full object-contain"
            style={{
              filter:
                activeFilter === 'depth'
                  ? 'grayscale(100%) contrast(180%) invert(80%)'
                  : 'none',
            }}
          />
        ) : (
          <div className="col" style={{ alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 11 }}>
            <Scan size={24} className="spin" />
            <span>Awaiting visual sensory feed...</span>
          </div>
        )}

        {/* Grad-CAM Attention Heatmap Overlay */}
        {(activeFilter === 'gradcam' || activeFilter === 'hud') && perception?.gradcam_heatmap && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70"
            style={{ position: 'absolute', inset: 0 }}
          >
            <svg className="w-full h-full" viewBox="0 0 32 32" preserveAspectRatio="none">
              {perception.gradcam_heatmap.map((row, rIdx) =>
                row.map((val, cIdx) => (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={cIdx}
                    y={rIdx}
                    width={1}
                    height={1}
                    fill={`rgba(244, 63, 94, ${val * 0.85})`}
                  />
                ))
              )}
            </svg>
          </div>
        )}

        {/* Tactical Holographic HUD Target Crosshairs */}
        {activeFilter === 'hud' && (
          <>
            <div
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                position: 'absolute',
                left: `${coords[0] * 100}%`,
                top: `${coords[1] * 100}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pulsing targeting ring */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  border: '1.5px dashed #22d3ee',
                  borderRadius: '50%',
                  animation: 'spin 8s linear infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: 6,
                  height: 6,
                  background: '#f5c518',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #f5c518',
                }}
              />
              {/* Coordinates Callout Tag */}
              <span
                style={{
                  position: 'absolute',
                  top: 24,
                  left: 20,
                  fontSize: 9.5,
                  fontFamily: 'var(--mono)',
                  color: '#22d3ee',
                  background: '#090d16cc',
                  padding: '1px 5px',
                  borderRadius: 4,
                  border: '1px solid #22d3ee55',
                  whiteSpace: 'nowrap',
                }}
              >
                TARGET LOCK ({coords[0].toFixed(2)}, {coords[1].toFixed(2)})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Output Predictions */}
      <div className="row" style={{ gap: 8, fontSize: 11, fontFamily: 'var(--mono)' }}>
        <div className="panel col" style={{ flex: 1, padding: 8, background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>Identified Geometry:</span>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: 'var(--accent)', textTransform: 'uppercase', fontSize: 12 }}>{shape}</strong>
            <span style={{ color: 'var(--ink-2)' }}>{(conf * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="panel col" style={{ flex: 1, padding: 8, background: 'var(--surface-sunken)', borderRadius: 6 }}>
          <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>Identified Color:</span>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: STAGE_COLORS[color] || '#ef4444',
                border: '1px solid #fff',
              }}
            />
            <strong style={{ textTransform: 'capitalize', fontSize: 12 }}>{COLOR_NAMES[color] || color}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
