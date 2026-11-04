import React from 'react';

export default function CerberusTriModalDiagram() {
  return (
    <div className="w-full rounded-2xl glass-panel p-6 border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-2xl relative overflow-hidden">
      {/* Background Blueprint Grid Watermark */}
      <div className="absolute inset-0 bg-grid-cyber opacity-40 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase block mb-1">
            RESEARCH SYSTEM SCHEMATIC // FIG. 1
          </span>
          <h3 className="text-xl font-bold font-mono text-slate-100 tracking-wide flex items-center gap-2">
            <span>THE CERBERUS TRI-MODAL ARCHITECTURE</span>
          </h3>
        </div>
        <div className="text-right font-mono text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-cyan-400">
            EYE · MUSCLE · BRAIN
          </span>
        </div>
      </div>

      {/* Interactive 3-Headed Technical Vector SVG */}
      <div className="relative z-10 w-full overflow-x-auto py-2">
        <svg viewBox="0 0 1000 360" className="w-full min-w-[760px] h-auto font-mono text-xs">
          <defs>
            {/* Gradients */}
            <linearGradient id="gradEye" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="gradMuscle" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="gradBrain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.05" />
            </linearGradient>
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connective Neural Bus Spine */}
          <path
            d="M 160 180 L 500 180 L 840 180"
            stroke="#334155"
            strokeWidth="3"
            strokeDasharray="6 4"
          />
          <circle cx="500" cy="180" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          <text x="500" y="184" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
            Σ
          </text>

          {/* ========================================================
              HEAD 1: THE EYE (PERCEPTION)
             ======================================================== */}
          <g transform="translate(40, 40)">
            {/* Module Card */}
            <rect
              width="260"
              height="280"
              rx="16"
              fill="url(#gradEye)"
              stroke="#0891b2"
              strokeWidth="1.5"
            />
            {/* Header pill */}
            <rect x="16" y="16" width="100" height="22" rx="4" fill="#0e7490" fillOpacity="0.4" />
            <text x="24" y="31" fill="#22d3ee" fontWeight="bold" fontSize="11">
              HEAD 1: THE EYE
            </text>

            <text x="16" y="62" fill="#f8fafc" fontWeight="bold" fontSize="13">
              CoordConv Spatial CNN
            </text>
            <text x="16" y="80" fill="#94a3b8" fontSize="10">
              Input: RGB (3) + Coord [X, Y] (2) = 5ch
            </text>

            {/* Visual Sensory Cone & Camera */}
            <path
              d="M 40 110 L 130 95 L 130 175 Z"
              fill="#06b6d4"
              fillOpacity="0.1"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <rect x="25" y="122" width="22" height="22" rx="4" fill="#0891b2" />
            <circle cx="36" cy="133" r="6" fill="#090d16" stroke="#22d3ee" strokeWidth="2" />

            {/* Feature Heads Breakdown */}
            <g transform="translate(140, 95)" fontSize="9">
              <rect width="104" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="14" fill="#38bdf8">Shape Classify</text>

              <rect y="26" width="104" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="40" fill="#38bdf8">Color Identify</text>

              <rect y="52" width="104" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="66" fill="#38bdf8">Centroid (x̂, ŷ)</text>

              <rect y="78" width="104" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="92" fill="#22d3ee" fontWeight="bold">Grad-CAM Heatmap</text>
            </g>

            {/* Bottom Citation */}
            <rect x="16" y="225" width="228" height="40" rx="6" fill="#090d16" stroke="#1e293b" />
            <text x="24" y="240" fill="#64748b" fontSize="8.5">
              Liu et al., NeurIPS 2018
            </text>
            <text x="24" y="254" fill="#38bdf8" fontSize="9">
              Overcomes conv translation blindness
            </text>
          </g>

          {/* ========================================================
              HEAD 2: THE MUSCLE (DECISION & ACTUATION)
             ======================================================== */}
          <g transform="translate(370, 40)">
            <rect
              width="260"
              height="280"
              rx="16"
              fill="url(#gradMuscle)"
              stroke="#059669"
              strokeWidth="1.5"
            />
            {/* Header pill */}
            <rect x="16" y="16" width="116" height="22" rx="4" fill="#065f46" fillOpacity="0.4" />
            <text x="24" y="31" fill="#34d399" fontWeight="bold" fontSize="11">
              HEAD 2: THE MUSCLE
            </text>

            <text x="16" y="62" fill="#f8fafc" fontWeight="bold" fontSize="13">
              D3QN + HER Engine
            </text>
            <text x="16" y="80" fill="#94a3b8" fontSize="10">
              Dueling Stream: Q(s,a) = V(s) + A(s,a)
            </text>

            {/* Kinematic Arm Diagram */}
            <g transform="translate(30, 105)">
              <circle cx="15" cy="50" r="8" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
              <line x1="15" y1="50" x2="65" y2="20" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
              <circle cx="65" cy="20" r="6" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
              <line x1="65" y1="20" x2="110" y2="45" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
              <circle cx="110" cy="45" r="4" fill="#34d399" />
              
              {/* Gripper */}
              <path d="M 110 40 L 118 38 M 110 50 L 118 52" stroke="#6ee7b7" strokeWidth="2" />
              
              {/* Manipulability arc */}
              <path d="M 50 15 A 25 25 0 0 1 75 30" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
              <text x="45" y="10" fill="#f59e0b" fontSize="8">w(q) &gt; 0.05</text>
            </g>

            {/* HER Relabeling Pill */}
            <g transform="translate(150, 95)" fontSize="9">
              <rect width="94" height="22" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="15" fill="#34d399">7 Joint Primitives</text>

              <rect y="28" width="94" height="22" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="43" fill="#34d399">Hindsight Replay</text>

              <rect y="56" width="94" height="22" rx="4" fill="#0f172a" stroke="#1e293b" />
              <text x="8" y="71" fill="#34d399">Polyak Soft Target</text>
            </g>

            {/* Bottom Citation */}
            <rect x="16" y="225" width="228" height="40" rx="6" fill="#090d16" stroke="#1e293b" />
            <text x="24" y="240" fill="#64748b" fontSize="8.5">
              Andrychowicz et al., NeurIPS 2017
            </text>
            <text x="24" y="254" fill="#34d399" fontSize="9">
              Retroactive goal relabeling for sparse RL
            </text>
          </g>

          {/* ========================================================
              HEAD 3: THE BRAIN (SEMANTIC REASONER)
             ======================================================== */}
          <g transform="translate(700, 40)">
            <rect
              width="260"
              height="280"
              rx="16"
              fill="url(#gradBrain)"
              stroke="#d97706"
              strokeWidth="1.5"
            />
            {/* Header pill */}
            <rect x="16" y="16" width="116" height="22" rx="4" fill="#92400e" fillOpacity="0.4" />
            <text x="24" y="31" fill="#fbbf24" fontWeight="bold" fontSize="11">
              HEAD 3: THE BRAIN
            </text>

            <text x="16" y="62" fill="#f8fafc" fontWeight="bold" fontSize="13">
              Grounded Ollama LLM
            </text>
            <text x="16" y="80" fill="#94a3b8" fontSize="10">
              Zero Cloud API · Native Local Daemon
            </text>

            {/* PDDL Subgoal Tree */}
            <g transform="translate(16, 95)" fontSize="9">
              <rect width="228" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <circle cx="10" cy="10" r="3" fill="#fbbf24" />
              <text x="20" y="14" fill="#fde68a">1. APPROACH_OBJECT</text>

              <rect y="25" width="228" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <circle cx="10" cy="35" r="3" fill="#fbbf24" />
              <text x="20" y="39" fill="#fde68a">2. ALIGN_AND_GRASP</text>

              <rect y="50" width="228" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <circle cx="10" cy="60" r="3" fill="#fbbf24" />
              <text x="20" y="64" fill="#fde68a">3. TRANSIT_AVOID_HAZARD</text>

              <rect y="75" width="228" height="20" rx="4" fill="#0f172a" stroke="#1e293b" />
              <circle cx="10" cy="85" r="3" fill="#10b981" />
              <text x="20" y="89" fill="#a7f3d0">4. DESCEND_AND_RELEASE</text>
            </g>

            {/* Bottom Callout */}
            <rect x="16" y="225" width="228" height="40" rx="6" fill="#090d16" stroke="#1e293b" />
            <text x="24" y="240" fill="#64748b" fontSize="8.5">
              Neuro-Symbolic Task Compiler
            </text>
            <text x="24" y="254" fill="#fbbf24" fontSize="9">
              Dynamic reward shaping (λ_coll, λ_jerk)
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
