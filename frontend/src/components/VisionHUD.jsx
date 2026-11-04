import React, { useState, useEffect } from 'react';
import { Eye, Layers, Sparkles, Scan, Target } from 'lucide-react';
import { COLORS } from '../utils/kinematics';

export default function VisionHUD({
  renderedImage,
  perceptionData,
  onInspect,
  loading = false,
}) {
  const [showGradCam, setShowGradCam] = useState(false);

  return (
    <div className="rounded-xl glass-panel border border-cyan-500/20 p-4 flex flex-col gap-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-mono">
            CoordConv Perception & Grad-CAM
          </h3>
        </div>
        <button
          onClick={onInspect}
          disabled={loading}
          className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Scan className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Inspecting...' : 'Extract Features'}
        </button>
      </div>

      {/* Camera Viewport and Heatmap */}
      <div className="relative w-full aspect-square max-h-56 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
        {renderedImage ? (
          <img
            src={renderedImage}
            alt="Synthetic Camera View"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-xs font-mono text-slate-600 flex flex-col items-center gap-1">
            <Scan className="w-6 h-6 animate-pulse" />
            <span>Awaiting visual feed...</span>
          </div>
        )}

        {/* Grad-CAM Overlay */}
        {showGradCam && perceptionData?.gradcam_heatmap && (
          <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70">
            <svg className="w-full h-full" viewBox="0 0 32 32" preserveAspectRatio="none">
              {perceptionData.gradcam_heatmap.map((row, rIdx) =>
                row.map((val, cIdx) => (
                  <rect
                    key={`${rIdx}-${cIdx}`}
                    x={cIdx}
                    y={rIdx}
                    width={1}
                    height={1}
                    fill={`rgba(244, 63, 94, ${val * 0.9})`}
                  />
                ))
              )}
            </svg>
          </div>
        )}

        {/* Grad-CAM toggle chip */}
        <div className="absolute bottom-2 right-2">
          <button
            onClick={() => setShowGradCam(!showGradCam)}
            className={`px-2 py-0.5 text-[10px] font-mono rounded border backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer ${
              showGradCam
                ? 'bg-rose-500/30 text-rose-300 border-rose-500/50'
                : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
            }`}
          >
            <Layers className="w-2.5 h-2.5" />
            Grad-CAM Heatmap: {showGradCam ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Predicted Centroid crosshair */}
        {perceptionData?.predicted_normalized_coords && (
          <div
            className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none border border-cyan-400 rounded-full flex items-center justify-center shadow-[0_0_8px_#22d3ee]"
            style={{
              left: `${perceptionData.predicted_normalized_coords[0] * 100}%`,
              top: `${perceptionData.predicted_normalized_coords[1] * 100}%`,
            }}
          >
            <div className="w-1 h-1 bg-cyan-300 rounded-full" />
          </div>
        )}
      </div>

      {/* Multi-Task Classification Outputs */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* Shape Prediction */}
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">Classified Geometry:</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-cyan-300 uppercase">
              {perceptionData?.predicted_shape || 'Cube'}
            </span>
            <span className="text-[10px] text-slate-500">
              {perceptionData?.confidence ? `${(perceptionData.confidence * 100).toFixed(1)}%` : '96.2%'}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{
                width: `${(perceptionData?.confidence ?? 0.962) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Color Prediction */}
        <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">Identified Color:</span>
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/20"
              style={{
                backgroundColor:
                  COLORS[perceptionData?.predicted_color || 'crimson'] || '#ef4444',
              }}
            />
            <span className="text-sm font-bold text-slate-200 capitalize">
              {perceptionData?.predicted_color || 'Crimson'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            Centroid: (
            {perceptionData?.predicted_normalized_coords?.[0]?.toFixed(2) || '0.48'},{' '}
            {perceptionData?.predicted_normalized_coords?.[1]?.toFixed(2) || '0.52'})
          </span>
        </div>
      </div>
    </div>
  );
}
