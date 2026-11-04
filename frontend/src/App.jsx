import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import Arm3DView from './components/Arm3DView';
import ArmCanvas from './components/ArmCanvas';
import VisionHUD from './components/VisionHUD';
import TelemetryPanel from './components/TelemetryPanel';
import OllamaConsole from './components/OllamaConsole';
import BenchmarkModal from './components/BenchmarkModal';
import { Box, LayoutDashboard, Compass } from 'lucide-react';

export default function App() {
  // Navigation Tab ('home' | '3d_cockpit' | '2d_cockpit')
  const [activeTab, setActiveTab] = useState('home');

  // Simulation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  // Environment & Observation
  const [observation, setObservation] = useState(null);
  const [renderedImage, setRenderedImage] = useState(null);
  const [obstacles, setObstacles] = useState([]);

  // Telemetry
  const [currentAction, setCurrentAction] = useState(null);
  const [qValues, setQValues] = useState([]);
  const [reward, setReward] = useState(0);
  const [cumulativeReward, setCumulativeReward] = useState(0);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [isCollision, setIsCollision] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Perception
  const [perceptionData, setPerceptionData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Ollama & Reasoning
  const [activePlan, setActivePlan] = useState(null);
  const [activeSubgoalIdx, setActiveSubgoalIdx] = useState(0);
  const [xaiExplanation, setXaiExplanation] = useState('');
  const [planLoading, setPlanLoading] = useState(false);

  // Benchmark
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  // View mode inside cockpit ('3d' | '2d')
  const [viewportMode, setViewportMode] = useState('3d');

  // Simulation timer ref
  const playIntervalRef = useRef(null);

  // Initial load
  useEffect(() => {
    fetchStatus();
    handleReset();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.warn('Backend not responding yet:', err);
    }
  };

  const handleReset = async (taskId = 1) => {
    setIsPlaying(false);
    setLoading(true);
    try {
      const res = await fetch('/api/env/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (res.ok) {
        const data = await res.json();
        setObservation(data.observation);
        setRenderedImage(data.rendered_image);
        setObstacles(data.obstacles || []);
        setCumulativeReward(0);
        setRewardHistory([]);
        setIsCollision(false);
        setIsSuccess(false);
        setCurrentAction(null);
        setQValues([]);
        setActiveSubgoalIdx(0);
      }
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStep = async (manualAction = null) => {
    try {
      const res = await fetch('/api/env/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: manualAction }),
      });
      if (res.ok) {
        const data = await res.json();
        setObservation(data.observation);
        setRenderedImage(data.rendered_image);
        setCurrentAction(data.action);
        setQValues(data.q_values || []);
        setReward(data.reward);
        setCumulativeReward((prev) => prev + data.reward);
        setRewardHistory((prev) => [...prev, data.reward]);

        const succ = data.info?.is_success || false;
        const coll = data.info?.is_collision || false;
        setIsSuccess(succ);
        setIsCollision(coll);

        if (data.observation?.grasped_idx !== null && data.observation?.grasped_idx !== undefined) {
          setActiveSubgoalIdx((idx) => Math.max(idx, 3));
        } else if (succ) {
          setActiveSubgoalIdx(4);
          confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
        }

        if (data.terminated || data.truncated) {
          setIsPlaying(false);
        }
      }
    } catch (err) {
      console.error('Step execution failed:', err);
      setIsPlaying(false);
    }
  };

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        handleStep();
      }, 140);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Task Planner
  const handlePlanTask = async (instruction) => {
    setPlanLoading(true);
    try {
      const res = await fetch('/api/task/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      });
      if (res.ok) {
        const data = await res.json();
        setActivePlan(data.plan);
        setObservation(data.observation);
        setRenderedImage(data.rendered_image);
        setCumulativeReward(0);
        setRewardHistory([]);
        setIsCollision(false);
        setIsSuccess(false);
        setActiveSubgoalIdx(0);
      }
    } catch (err) {
      console.error('Task planning failed:', err);
    } finally {
      setPlanLoading(false);
    }
  };

  // Perception Inspection
  const handleInspectPerception = async () => {
    setInspectLoading(true);
    try {
      const res = await fetch('/api/perception/inspect', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setPerceptionData(data);
      }
    } catch (err) {
      console.error('Perception inspection failed:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Request Explainable AI forensics
  const handleRequestXAI = async () => {
    try {
      const telemetry = {
        is_success: isSuccess,
        is_collision: isCollision,
        steps: observation?.step || 0,
        reward: cumulativeReward,
        jerk: observation?.step ? 1.4 : 0.0,
        cnn_confidence: perceptionData?.confidence || 0.96,
      };

      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry }),
      });
      if (res.ok) {
        const data = await res.json();
        setXaiExplanation(data.explanation);
      }
    } catch (err) {
      console.error('XAI request failed:', err);
    }
  };

  // Training step
  const handleTrain = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/train/step?episodes=5', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        fetchStatus();
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.2 } });
        alert(
          `Trained 5 Episodes with Hindsight Relabeling!\nSuccess Rate: ${data.success_rate}%\nMean Return: ${data.mean_reward}\nEpsilon: ${data.current_epsilon}`
        );
      }
    } catch (err) {
      console.error('Training failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Benchmark suite
  const handleRunBenchmark = async () => {
    setBenchmarkLoading(true);
    try {
      const res = await fetch('/api/benchmark');
      if (res.ok) {
        const data = await res.json();
        setBenchmarkData(data);
      }
    } catch (err) {
      console.error('Benchmark execution failed:', err);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-cyber selection:bg-cyan-500/20">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onStep={() => handleStep()}
        onReset={() => handleReset()}
        onTrain={handleTrain}
        onOpenBenchmark={() => {
          setIsBenchmarkOpen(true);
          if (!benchmarkData) handleRunBenchmark();
        }}
        systemStatus={systemStatus}
        loading={loading}
      />

      {/* Render Active View */}
      {activeTab === 'home' ? (
        <HomePage
          onLaunchCockpit={() => setActiveTab('3d_cockpit')}
          onOpenBenchmark={() => {
            setIsBenchmarkOpen(true);
            if (!benchmarkData) handleRunBenchmark();
          }}
          systemStatus={systemStatus}
        />
      ) : (
        /* Cockpit Views ('3d_cockpit' or '2d_cockpit') */
        <main className="flex-1 p-4 sm:p-6 grid grid-cols-12 gap-5 max-w-[1760px] mx-auto w-full">
          {/* Left Column: Perception HUD & Ollama Console (4 cols) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <OllamaConsole
              onPlanTask={handlePlanTask}
              activePlan={activePlan}
              activeSubgoalIdx={activeSubgoalIdx}
              xaiExplanation={xaiExplanation}
              onRequestXAI={handleRequestXAI}
              ollamaStatus={systemStatus?.ollama}
              loading={planLoading}
            />
            <VisionHUD
              renderedImage={renderedImage}
              perceptionData={perceptionData}
              onInspect={handleInspectPerception}
              loading={inspectLoading}
            />
          </div>

          {/* Center Column: Manipulator Visualizer (3D or 2D Toggle) (5 cols) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-2">
            {/* Viewport Mode Switcher Header */}
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                Active Manipulator Display:
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setViewportMode('3d')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
                    viewportMode === '3d'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Box className="w-3 h-3" />
                  3D MuJoCo PBR
                </button>
                <button
                  onClick={() => setViewportMode('2d')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
                    viewportMode === '2d'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-3 h-3" />
                  2D Kinematics
                </button>
              </div>
            </div>

            {/* Viewport Component */}
            <div className="flex-1 min-h-[500px]">
              {viewportMode === '3d' ? (
                <Arm3DView
                  theta1={observation?.theta1 ?? Math.PI / 3}
                  theta2={observation?.theta2 ?? Math.PI / 4}
                  gripperClosed={observation?.gripper_closed ?? false}
                  isGrasped={observation?.grasped_idx !== null && observation?.grasped_idx !== undefined}
                  objects={observation?.objects || []}
                  targetIdx={observation?.target_idx ?? 0}
                  obstacles={obstacles}
                  receptacles={systemStatus?.receptacles}
                />
              ) : (
                <ArmCanvas
                  observation={observation}
                  obstacles={obstacles}
                  onObjectClick={(idx, obj) => {
                    handlePlanTask(`Pick the ${obj.color} ${obj.shape} and deposit it into the blue bin.`);
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Column: DRL Telemetry & Q-Values (3 cols) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
            <TelemetryPanel
              qValues={qValues}
              currentAction={currentAction}
              reward={reward}
              cumulativeReward={cumulativeReward}
              step={observation?.step || 0}
              epsilon={systemStatus?.drl?.epsilon || 0.05}
              isCollision={isCollision}
              isSuccess={isSuccess}
              rewardHistory={rewardHistory}
            />
          </div>
        </main>
      )}

      {/* Benchmark Evaluation Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        benchmarkData={benchmarkData}
        onRunBenchmark={handleRunBenchmark}
        loading={benchmarkLoading}
      />
    </div>
  );
}
