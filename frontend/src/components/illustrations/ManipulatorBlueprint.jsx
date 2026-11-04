import React from 'react';

export default function ManipulatorBlueprint() {
  return (
    <div className="w-full rounded-2xl glass-panel p-6 border border-slate-800/80 bg-slate-950/90 shadow-2xl relative overflow-hidden">
      {/* Drafting Grid Watermark */}
      <div className="absolute inset-0 bg-grid-cyber opacity-30 pointer-events-none" />

      {/* Blueprint Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase block mb-1">
            MECHANICAL KINEMATICS DRAFTING // DWG-RR-2026
          </span>
          <h3 className="text-lg font-bold font-mono text-slate-100 tracking-wide">
            2-DOF PLANAR ARTICULATED MANIPULATOR SPECIFICATION
          </h3>
        </div>
        <div className="text-right font-mono text-xs text-slate-500">
          SCALE: 1:10 (SIM) · DOF: 2 REVOLUTE
        </div>
      </div>

      {/* Blueprint Vector Graphic */}
      <div className="relative z-10 w-full overflow-x-auto py-1">
        <svg viewBox="0 0 880 340" className="w-full min-w-[700px] h-auto font-mono text-xs">
          {/* Base Anchor Pedestal */}
          <rect x="80" y="240" width="80" height="20" rx="4" fill="#1e293b" stroke="#0284c7" strokeWidth="2" />
          <path d="M 60 260 L 180 260" stroke="#475569" strokeWidth="2" strokeDasharray="4 2" />
          <text x="120" y="280" textAnchor="middle" fill="#64748b" fontSize="10">
            BASE PEDESTAL (0, 0)
          </text>

          {/* Base Origin Reference Frame {X0, Y0} */}
          <line x1="120" y1="240" x2="170" y2="240" stroke="#f43f5e" strokeWidth="2" />
          <polygon points="170,237 176,240 170,243" fill="#f43f5e" />
          <text x="180" y="243" fill="#f43f5e" fontSize="9" fontWeight="bold">X₀</text>

          <line x1="120" y1="240" x2="120" y2="190" stroke="#10b981" strokeWidth="2" />
          <polygon points="117,190 120,184 123,190" fill="#10b981" />
          <text x="125" y="185" fill="#10b981" fontSize="9" fontWeight="bold">Y₀</text>

          {/* Joint 1 Pivot */}
          <circle cx="120" cy="240" r="14" fill="#0f172a" stroke="#0284c7" strokeWidth="2.5" />
          <circle cx="120" cy="240" r="5" fill="#38bdf8" />

          {/* Link 1 (Shoulder -> Elbow) */}
          <line x1="120" y1="240" x2="360" y2="120" stroke="#38bdf8" strokeWidth="10" strokeLinecap="round" />
          <line x1="120" y1="240" x2="360" y2="120" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" />

          {/* Angle θ1 Arc & Arrow */}
          <path d="M 170 240 A 50 50 0 0 0 156 195" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <polygon points="154,198 152,190 159,195" fill="#f59e0b" />
          <text x="182" y="215" fill="#f59e0b" fontSize="11" fontWeight="bold">θ₁ (Shoulder)</text>

          {/* Dimension Line L1 */}
          <line x1="125" y1="225" x2="365" y2="105" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
          <text x="240" y="155" fill="#94a3b8" fontSize="10" transform="rotate(-26, 240, 155)">
            L₁ = 1.0 m (Link 1 Carbon Tube)
          </text>

          {/* Joint 2 Elbow Pivot */}
          <circle cx="360" cy="120" r="12" fill="#0f172a" stroke="#0284c7" strokeWidth="2.5" />
          <circle cx="360" cy="120" r="4" fill="#38bdf8" />

          {/* Extension Line for θ2 measurement */}
          <line x1="360" y1="120" x2="480" y2="60" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />

          {/* Link 2 (Elbow -> Wrist) */}
          <line x1="360" y1="120" x2="620" y2="170" stroke="#06b6d4" strokeWidth="8" strokeLinecap="round" />
          <line x1="360" y1="120" x2="620" y2="170" stroke="#0891b2" strokeWidth="3" strokeLinecap="round" />

          {/* Angle θ2 Arc & Arrow */}
          <path d="M 420 90 A 60 60 0 0 1 430 132" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <polygon points="427,130 431,138 434,131" fill="#f59e0b" />
          <text x="445" y="115" fill="#f59e0b" fontSize="11" fontWeight="bold">θ₂ (Elbow)</text>

          {/* Dimension Line L2 */}
          <text x="490" y="170" fill="#94a3b8" fontSize="10">
            L₂ = 0.8 m (Forearm)
          </text>

          {/* End-Effector / Gripper Assembly */}
          <rect x="620" y="155" width="28" height="30" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          {/* Finger Jaws */}
          <line x1="648" y1="160" x2="668" y2="160" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          <line x1="648" y1="180" x2="668" y2="180" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
          {/* Magnetic Emitter / Laser */}
          <circle cx="658" cy="170" r="4" fill="#06b6d4" />

          {/* End-Effector Reference Frame {Xee, Yee} */}
          <line x1="658" y1="170" x2="700" y2="170" stroke="#f43f5e" strokeWidth="2" />
          <polygon points="700,167 706,170 700,173" fill="#f43f5e" />
          <text x="712" y="173" fill="#f43f5e" fontSize="9" fontWeight="bold">X_ee</text>

          <line x1="658" y1="170" x2="658" y2="130" stroke="#10b981" strokeWidth="2" />
          <polygon points="655,130 658,124 661,130" fill="#10b981" />
          <text x="663" y="125" fill="#10b981" fontSize="9" fontWeight="bold">Y_ee</text>

          {/* Reach Envelope Dashed Arc */}
          <path d="M 680 70 A 560 560 0 0 1 760 240" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
          <text x="710" y="85" fill="#0ea5e9" fontSize="10">
            R_max = L₁ + L₂ = 1.8 m
          </text>

          {/* Kinematics Equations Card in Blueprint */}
          <g transform="translate(620, 215)">
            <rect width="240" height="95" rx="8" fill="#090d16" stroke="#334155" />
            <text x="14" y="22" fill="#38bdf8" fontWeight="bold" fontSize="10">
              FORWARD KINEMATICS (FK):
            </text>
            <text x="14" y="40" fill="#cbd5e1" fontSize="9">
              x_ee = L₁ cos(θ₁) + L₂ cos(θ₁ + θ₂)
            </text>
            <text x="14" y="56" fill="#cbd5e1" fontSize="9">
              y_ee = L₁ sin(θ₁) + L₂ sin(θ₁ + θ₂)
            </text>
            <text x="14" y="78" fill="#f59e0b" fontSize="9">
              Manipulability: w = |L₁ L₂ sin(θ₂)|
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
