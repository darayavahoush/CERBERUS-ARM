import React from 'react';

export default function HerTrajectoryIllustration() {
  return (
    <div className="w-full rounded-2xl glass-panel p-6 border border-slate-800/80 bg-slate-950/90 shadow-2xl relative overflow-hidden">
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase block mb-1">
            DECISION ENGINE // ANDRYCHOWICZ ET AL., NEURIPS 2017
          </span>
          <h3 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
            HINDSIGHT EXPERIENCE REPLAY (HER): FAILING PRODUCTIVELY
          </h3>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          SPARSE-REWARD CONVERGENCE ACCELERATION
        </div>
      </div>

      <div className="relative z-10 w-full overflow-x-auto py-2">
        <svg viewBox="0 0 880 230" className="w-full min-w-[700px] h-auto font-mono text-xs">
          {/* Start Point S0 */}
          <circle cx="80" cy="120" r="12" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          <text x="80" y="124" textAnchor="middle" fill="#38bdf8" fontWeight="bold">S₀</text>
          <text x="80" y="150" textAnchor="middle" fill="#94a3b8" fontSize="9">Start State</text>

          {/* Actual Trajectory curve */}
          <path
            d="M 92 120 Q 240 40 400 90 T 600 150"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3.5"
            strokeDasharray="6 3"
          />

          {/* Intended Goal (Blue) */}
          <circle cx="680" cy="60" r="16" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5" />
          <circle cx="680" cy="60" r="4" fill="#3b82f6" />
          <text x="680" y="95" textAnchor="middle" fill="#60a5fa" fontWeight="bold">
            Desired Goal g
          </text>
          <text x="680" y="110" textAnchor="middle" fill="#ef4444" fontSize="9">
            (Missed! Distance = 0.85m)
          </text>

          {/* Achieved Terminal State (Green) */}
          <circle cx="600" cy="150" r="16" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="600" cy="150" r="4" fill="#34d399" />
          <text x="600" y="185" textAnchor="middle" fill="#34d399" fontWeight="bold">
            Achieved Position g'
          </text>

          {/* Replay Relabeling Box */}
          <g transform="translate(680, 135)">
            <rect width="180" height="75" rx="8" fill="#090d16" stroke="#059669" strokeWidth="1.5" />
            <text x="12" y="20" fill="#34d399" fontWeight="bold" fontSize="9.5">
              HER RETROACTIVE RELABEL:
            </text>
            <text x="12" y="38" fill="#cbd5e1" fontSize="9">
              Original: R(s, a, g) = -10 (Fail)
            </text>
            <text x="12" y="55" fill="#10b981" fontWeight="bold" fontSize="9.5">
              Hindsight: R(s, a, g') = +50 (Perfect!)
            </text>
          </g>

          {/* Explanatory callout line */}
          <path d="M 618 150 L 678 165" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      </div>
    </div>
  );
}
