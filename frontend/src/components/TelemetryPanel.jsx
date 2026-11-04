import React from 'react';
import { Activity, Gauge, Zap, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

const ACTION_LABELS = [
  'J1 +Δθ',
  'J1 -Δθ',
  'J2 +Δθ',
  'J2 -Δθ',
  'Gripper Toggle',
  'Micro-Align',
  'Hold / Idle',
];

export default function TelemetryPanel({
  qValues = [],
  currentAction = null,
  reward = 0,
  cumulativeReward = 0,
  step = 0,
  epsilon = 0.05,
  isCollision = false,
  isSuccess = false,
  rewardHistory = [],
}) {
  const maxQ = qValues.length ? Math.max(...qValues, 0.01) : 1;
  const minQ = qValues.length ? Math.min(...qValues, 0) : 0;
  const rangeQ = Math.max(maxQ - minQ, 0.01);

  return (
    <div className="rounded-xl glass-panel border border-cyan-500/20 p-4 flex flex-col gap-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-mono">
            DRL Q-Value Distribution (D3QN + HER)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">ε-greedy:</span>
          <span className="px-1.5 py-0.5 text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 rounded">
            {epsilon.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Numerical Metrics Strip */}
      <div className="grid grid-cols-4 gap-2 font-mono text-center">
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block">Step</span>
          <span className="text-sm font-bold text-slate-200">{step}</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block">Step Reward</span>
          <span
            className={`text-sm font-bold ${
              reward > 0 ? 'text-emerald-400' : reward < 0 ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {reward > 0 ? `+${reward.toFixed(2)}` : reward.toFixed(2)}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block">Total Return</span>
          <span
            className={`text-sm font-bold ${
              cumulativeReward >= 0 ? 'text-cyan-400' : 'text-amber-400'
            }`}
          >
            {cumulativeReward.toFixed(1)}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase block">Status</span>
          {isSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-0.5">
              <ShieldCheck className="w-3 h-3" /> SUCCESS
            </span>
          ) : isCollision ? (
            <span className="text-xs font-bold text-rose-400 flex items-center justify-center gap-0.5">
              <AlertTriangle className="w-3 h-3" /> COLLISION
            </span>
          ) : (
            <span className="text-xs font-bold text-cyan-400">ACTIVE</span>
          )}
        </div>
      </div>

      {/* Q-Value Action Bars */}
      <div className="flex flex-col gap-1.5 mt-1 font-mono">
        {ACTION_LABELS.map((label, idx) => {
          const q = qValues[idx] ?? 0;
          const isSelected = currentAction === idx;
          const percentage = Math.max(6, Math.min(100, ((q - minQ) / rangeQ) * 100));

          return (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span
                className={`w-28 text-[11px] truncate ${
                  isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'
                }`}
              >
                [{idx}] {label}
              </span>
              <div className="flex-1 h-3.5 bg-slate-900/80 rounded border border-slate-800/80 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-150 rounded-sm ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_8px_#06b6d4]'
                      : 'bg-slate-700/60'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span
                className={`w-12 text-right text-[11px] ${
                  isSelected ? 'text-emerald-400 font-bold' : 'text-slate-500'
                }`}
              >
                {q.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mini Trend Line for Rewards */}
      {rewardHistory.length > 1 && (
        <div className="mt-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              Recent Trajectory Return
            </span>
            <span>{rewardHistory.length} timesteps</span>
          </div>
          <div className="h-10 w-full flex items-end gap-1 bg-slate-950/60 p-1 rounded border border-slate-800">
            {rewardHistory.slice(-24).map((r, i) => {
              const h = Math.max(10, Math.min(100, ((r + 20) / 40) * 100));
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    r > 0 ? 'bg-cyan-400/80' : 'bg-rose-500/60'
                  }`}
                  style={{ height: `${h}%` }}
                  title={`Step ${i}: ${r}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
