import React from 'react';

export default function CoordConvIllustration() {
  return (
    <div className="w-full rounded-2xl glass-panel p-6 border border-slate-800/80 bg-slate-950/90 shadow-2xl relative overflow-hidden">
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase block mb-1">
            PERCEPTION MECHANISM // NEURIPS 2018 GROUNDING
          </span>
          <h3 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
            COORDCONV: SOLVING CARTESIAN COORDINATE BLINDNESS
          </h3>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          5-CHANNEL TENSOR AUGMENTATION
        </div>
      </div>

      <div className="relative z-10 w-full overflow-x-auto py-2">
        <svg viewBox="0 0 880 260" className="w-full min-w-[700px] h-auto font-mono text-xs">
          {/* Standard CNN Box (Left) */}
          <g transform="translate(40, 20)">
            <rect width="360" height="210" rx="12" fill="#0f172a" stroke="#dc2626" strokeWidth="1.5" strokeOpacity="0.6" />
            <rect x="16" y="14" width="160" height="20" rx="4" fill="#450a0a" />
            <text x="24" y="28" fill="#f87171" fontWeight="bold" fontSize="10">
              TRADITIONAL CNN (FAIL)
            </text>
            <text x="16" y="56" fill="#cbd5e1" fontSize="10">
              Input: Standard RGB Tensor (3 × H × W)
            </text>

            {/* Translation Invariance Demonstration */}
            <rect x="25" y="75" width="80" height="80" rx="4" fill="#1e293b" stroke="#334155" />
            <rect x="35" y="85" width="20" height="20" fill="#ef4444" />
            <text x="65" y="175" textAnchor="middle" fill="#94a3b8" fontSize="9">
              Object at (x₁, y₁)
            </text>

            <path d="M 125 115 L 165 115" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" />
            <text x="145" y="105" textAnchor="middle" fill="#f87171" fontSize="8">Shifted</text>

            <rect x="185" y="75" width="80" height="80" rx="4" fill="#1e293b" stroke="#334155" />
            <rect x="235" y="125" width="20" height="20" fill="#ef4444" />
            <text x="225" y="175" textAnchor="middle" fill="#94a3b8" fontSize="9">
              Object at (x₂, y₂)
            </text>

            <text x="16" y="200" fill="#f87171" fontSize="9">
              Identical convolutional kernels lose absolute pixel position!
            </text>
          </g>

          {/* CoordConv Box (Right) */}
          <g transform="translate(460, 20)">
            <rect width="380" height="210" rx="12" fill="#0f172a" stroke="#059669" strokeWidth="1.5" strokeOpacity="0.8" />
            <rect x="16" y="14" width="180" height="20" rx="4" fill="#064e3b" />
            <text x="24" y="28" fill="#34d399" fontWeight="bold" fontSize="10">
              COORDCONV SOLUTION (OURS)
            </text>
            <text x="16" y="56" fill="#cbd5e1" fontSize="10">
              Augmented: [RGB (3) ; X-Coord (1) ; Y-Coord (1)] = 5ch
            </text>

            {/* 3 Tensor Layer Planes */}
            {/* RGB Plane */}
            <g transform="translate(30, 80)">
              <polygon points="0,60 50,20 120,20 70,60" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" />
              <text x="50" y="45" fill="#38bdf8" fontSize="8">RGB (3)</text>
            </g>

            {/* X-Coord Plane */}
            <g transform="translate(70, 80)">
              <polygon points="0,60 50,20 120,20 70,60" fill="#10b981" fillOpacity="0.3" stroke="#34d399" />
              <text x="50" y="45" fill="#34d399" fontSize="8">X ∈ [-1, 1]</text>
            </g>

            {/* Y-Coord Plane */}
            <g transform="translate(110, 80)">
              <polygon points="0,60 50,20 120,20 70,60" fill="#f59e0b" fillOpacity="0.3" stroke="#fbbf24" />
              <text x="50" y="45" fill="#fbbf24" fontSize="8">Y ∈ [-1, 1]</text>
            </g>

            {/* Outcome arrow */}
            <path d="M 245 110 L 280 110" stroke="#34d399" strokeWidth="2.5" />
            <polygon points="280,106 287,110 280,114" fill="#34d399" />

            <g transform="translate(295, 80)">
              <rect width="70" height="60" rx="6" fill="#090d16" stroke="#059669" />
              <text x="35" y="24" textAnchor="middle" fill="#34d399" fontWeight="bold" fontSize="9">
                Centroid
              </text>
              <text x="35" y="40" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                (x̂, ŷ)
              </text>
              <text x="35" y="52" textAnchor="middle" fill="#6ee7b7" fontSize="7.5">
                Error &lt; 3px
              </text>
            </g>

            <text x="16" y="200" fill="#34d399" fontSize="9">
              Gives kernels immediate spatial awareness for robotic grasping!
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
