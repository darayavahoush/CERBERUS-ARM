import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Trophy,
  Zap,
  Cpu,
  Bot,
  CircleDot,
} from 'lucide-react';

export default function Navbar({
  isPlaying,
  onTogglePlay,
  onStep,
  onReset,
  onTrain,
  onOpenBenchmark,
  systemStatus,
  loading = false,
}) {
  return (
    <header className="w-full px-6 py-3 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between z-20">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_#06b6d4]">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 font-mono tracking-wider flex items-center gap-1.5">
              <span>CERBERUS-ARM</span>
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Q7 · TRI-MODAL DRL
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Eye (CoordConv CNN) · Muscle (D3QN + HER) · Brain (Grounded Ollama)
          </p>
        </div>
      </div>

      {/* Primary Simulation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md ${
            isPlaying
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPlaying ? 'Pause Sim' : 'Auto Play'}
        </button>

        <button
          onClick={onStep}
          disabled={isPlaying || loading}
          className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <StepForward className="w-3.5 h-3.5" />
          Step
        </button>

        <button
          onClick={onReset}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        <div className="w-[1px] h-6 bg-slate-800 mx-1" />

        <button
          onClick={onTrain}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-mono rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          Train (+5 Eps)
        </button>

        <button
          onClick={onOpenBenchmark}
          className="px-3 py-1.5 text-xs font-mono rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          Benchmark
        </button>
      </div>

      {/* Backend & Hardware Status Badges */}
      <div className="flex items-center gap-2.5 font-mono text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="uppercase text-[11px]">
            Device: {systemStatus?.device || 'MPS (GPU)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-[11px]">API Connected</span>
        </div>
      </div>
    </header>
  );
}
