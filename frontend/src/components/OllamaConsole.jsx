import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  Clock,
  Terminal,
  FileText,
  Play,
  Layers,
} from 'lucide-react';

const PRESET_TASKS = [
  {
    title: 'Task 1: Red Cube -> Blue Bay',
    prompt: 'Pick the crimson cube and deposit it into the blue storage bay.',
  },
  {
    title: 'Task 2: Hazard Avoidance (Green Sphere)',
    prompt:
      'Carefully pick the emerald sphere and place it into the green bin, maintaining maximum clearance from the center hazard.',
  },
  {
    title: 'Task 3: Fast Transfer (Amber Star)',
    prompt:
      'Rapidly pick the amber star and transfer it directly into the red sorting bay on the left.',
  },
];

export default function OllamaConsole({
  onPlanTask,
  onRunOrchestrator,
  activePlan,
  activeSubgoalIdx = 0,
  xaiExplanation = '',
  onRequestXAI,
  ollamaStatus = {},
  loading = false,
  orchestratorLogs = [],
}) {
  const [instruction, setInstruction] = useState('');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:3b-instruct');

  useEffect(() => {
    if (ollamaStatus?.active_model) {
      setSelectedModel(ollamaStatus.active_model);
    }
  }, [ollamaStatus?.active_model]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    onPlanTask(instruction, selectedModel);
  };

  const handleSelectPreset = (prompt) => {
    setInstruction(prompt);
    onPlanTask(prompt, selectedModel);
  };

  const handleExecuteOrchestrator = () => {
    const prompt = instruction.trim() || PRESET_TASKS[0].prompt;
    if (onRunOrchestrator) {
      onRunOrchestrator(prompt, selectedModel);
    }
  };

  const availableModels =
    ollamaStatus?.models && ollamaStatus.models.length > 0
      ? ollamaStatus.models
      : ['qwen2.5:3b-instruct', 'llama3.2:latest', 'llama3.1:8b', 'llama3:latest'];

  return (
    <div className="rounded-xl glass-panel border border-cyan-500/20 p-4 flex flex-col gap-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-mono">
            LangGraph + Ollama Qwen Orchestrator
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              ollamaStatus?.online ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
            }`}
          />
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-[11px] font-mono text-cyan-300 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-400 cursor-pointer"
            title="Active Ollama Model"
          >
            {availableModels.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-slate-200">
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preset Task Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TASKS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSelectPreset(preset.prompt)}
            className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-slate-900/80 hover:bg-cyan-500/10 text-cyan-300 border border-slate-800 hover:border-cyan-500/30 transition-all cursor-pointer"
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* Natural Language Prompt Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. Pick the crimson cube and place it into the blue receptacle cautiously..."
          className="w-full px-3.5 py-2.5 pr-48 rounded-lg bg-slate-950/90 border border-slate-700/80 text-sm font-sans text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
        />
        <div className="absolute right-1.5 flex items-center gap-1.5">
          <button
            type="submit"
            disabled={loading || !instruction.trim()}
            className="px-2.5 py-1.5 text-xs font-mono font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Compile PDDL Plan Only"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Plan
          </button>
          <button
            type="button"
            onClick={handleExecuteOrchestrator}
            disabled={loading}
            className="px-2.5 py-1.5 text-xs font-mono font-medium rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-md"
            title="Run Full LangGraph Autonomous Agent Cycle"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            LangGraph Run
          </button>
        </div>
      </form>

      {/* Compiled PDDL Plan & Subgoals */}
      {activePlan && (
        <div className="flex flex-col gap-2 mt-1 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-bold text-cyan-300 uppercase flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              {activePlan.task_summary || 'Task Plan'}
            </span>
            <span className="text-[10px] text-slate-500">
              Source: {activePlan.source || selectedModel}
            </span>
          </div>

          {/* Subgoals Checklist */}
          <div className="flex flex-col gap-1 mt-1">
            {(activePlan.subgoals || []).map((subgoal, idx) => {
              const isPast = idx < activeSubgoalIdx;
              const isCurrent = idx === activeSubgoalIdx;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                      : isPast
                      ? 'text-emerald-400 line-through opacity-75'
                      : 'text-slate-500'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className="text-[11px] font-mono">{subgoal}</span>
                </div>
              );
            })}
          </div>

          {/* Supervisory Weights */}
          {activePlan.supervisory_weights && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-4 text-[10px] text-slate-400">
              <span>Supervisory DRL Modulation:</span>
              <span className="text-rose-400">
                Coll. Pen: {activePlan.supervisory_weights.collision_penalty}
              </span>
              <span className="text-amber-400">
                Jerk Pen: {activePlan.supervisory_weights.jerk_penalty}
              </span>
            </div>
          )}
        </div>
      )}

      {/* LangGraph Trace Logs */}
      {orchestratorLogs && orchestratorLogs.length > 0 && (
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 flex flex-col gap-1 font-mono text-[10px] text-slate-300 max-h-36 overflow-y-auto">
          <span className="text-cyan-400 font-bold uppercase flex items-center gap-1 text-[11px]">
            <Layers className="w-3 h-3" /> LangGraph Orchestration Trace:
          </span>
          {orchestratorLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed border-l-2 border-cyan-500/40 pl-2 text-slate-300">
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Post-Hoc Explainable AI (XAI) Forensics */}
      <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Explainable AI (XAI) Forensic Debrief
          </span>
          <button
            onClick={() => onRequestXAI && onRequestXAI(selectedModel)}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            Generate Debrief
          </button>
        </div>

        {xaiExplanation ? (
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-cyan-500/20 text-xs font-sans text-slate-300 leading-relaxed italic">
            "{xaiExplanation}"
          </div>
        ) : (
          <div className="text-[11px] font-mono text-slate-500 italic">
            Execute actions or finish an episode to generate grounded post-hoc LLM forensics.
          </div>
        )}
      </div>
    </div>
  );
}
