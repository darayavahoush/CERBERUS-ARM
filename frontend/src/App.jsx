import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

import Navbar from './components/Navbar';
import ArmCanvas from './components/ArmCanvas';
import VisionHUD from './components/VisionHUD';
import TelemetryPanel from './components/TelemetryPanel';
import OllamaConsole from './components/OllamaConsole';
import BenchmarkModal from './components/BenchmarkModal';

export default function App() {
  // Global Simulation State
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

  // Simulation timer ref
  const playIntervalRef = useRef(null);

  // Fetch status and initial environment
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

        // Update active subgoal progress heuristically
        if (data.observation?.grasped_idx !== null && data.observation?.grasped_idx !== undefined) {
          setActiveSubgoalIdx((idx) => Math.max(idx, 3)); // In transit
        } else if (succ) {
          setActiveSubgoalIdx(4); // Released in receptacle
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
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

  // Compile task via Ollama
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

  // Run Perception Inspection
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

  // Run Training Batch
  const handleTrain = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/train/step?episodes=5', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        fetchStatus();
        confetti({ particleCount: 40, spread: 45, origin: { y: 0.2 } });
        alert(
          `Trained 5 Episodes!\nSuccess Rate: ${data.success_rate}%\nMean Return: ${data.mean_reward}\nEpsilon: ${data.current_epsilon}`
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col bg-grid-cyber">
      {/* Top Navigation */}
      <Navbar
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

      {/* Main Grid Content */}
      <main className="flex-1 p-5 grid grid-cols-12 gap-5 max-w-[1720px] mx-auto w-full">
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

        {/* Center Column: Kinematics Visualizer (5 cols) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col">
          <ArmCanvas
            observation={observation}
            obstacles={obstacles}
            onObjectClick={(idx, obj) => {
              handlePlanTask(`Pick the ${obj.color} ${obj.shape} and move it to the blue bin.`);
            }}
          />
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
