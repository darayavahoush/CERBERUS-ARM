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
  LayoutDashboard,
  Box,
  Compass,
} from 'lucide-react';

export default function Navbar({
  activeTab = 'home',
  onSelectTab,
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
    <header className="w-full px-4 sm:px-8 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 z-30 sticky top-0">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => onSelectTab('home')}
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <Bot className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              onClick={() => onSelectTab('home')}
              className="text-base font-bold text-slate-100 font-mono tracking-wider cursor-pointer hover:text-cyan-300 transition-colors"
            >
              CERBERUS-ARM
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Q7 · TRI-MODAL DRL
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
            Eye (CoordConv) · Muscle (D3QN-HER) · Brain (Local Ollama)
          </p>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 font-mono text-xs">
        <button
          onClick={() => onSelectTab('home')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Research Overview</span>
        </button>

        <button
          onClick={() => onSelectTab('3d_cockpit')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === '3d_cockpit'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D MuJoCo Twin</span>
        </button>

        <button
          onClick={() => onSelectTab('2d_cockpit')}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === '2d_cockpit'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
          <span>Kinematics Cockpit</span>
        </button>
      </div>

      {/* Primary Simulation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
            isPlaying
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
          }`}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPlaying ? 'Pause' : 'Auto Play'}
        </button>

        <button
          onClick={onStep}
          disabled={isPlaying || loading}
          className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
          title="Single Step Simulation"
        >
          <StepForward className="w-3.5 h-3.5" />
          Step
        </button>

        <button
          onClick={onReset}
          disabled={loading}
          className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
          title="Reset Environment"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-5 bg-slate-800 mx-1 hidden sm:block" />

        <button
          onClick={onTrain}
          disabled={loading}
          className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Train</span> (+5)
        </button>

        <button
          onClick={onOpenBenchmark}
          className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Benchmark</span>
        </button>
      </div>
    </header>
  );
}
