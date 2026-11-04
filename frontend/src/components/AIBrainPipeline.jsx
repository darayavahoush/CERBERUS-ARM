import React, { useState } from 'react';
import {
  Brain,
  Eye,
  Activity,
  Zap,
  Cpu,
  Layers,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export default function AIBrainPipeline({
  busy = false,
  activeStage = 'idle',
  perceptionConfidence = 0.964,
  manipulability = 0.707,
  epsilon = 0.05,
}) {
  const [selectedNode, setSelectedNode] = useState(null);

  const NODES = [
    {
      id: 'vision',
      title: 'CoordConv CNN',
      head: 'HEAD 1: EYE',
      category: 'Perception',
      latency: '4.2 ms',
      shape: '[1, 5, 128, 128]',
      metric: `${(perceptionConfidence * 100).toFixed(1)}% Conf`,
      icon: Eye,
      color: '#0ea5e9',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-950/20',
      activeColor: 'text-cyan-400',
      details: {
        paper: 'Liu et al., NeurIPS 2018',
        concept: 'Cartesian Coordinate Injection',
        input: 'RGB (3ch) + Coord X, Y (2ch) = 5-channel spatial tensor',
        heads: 'Shape Logits (4), Color Logits (4), Centroid Regression (x̂, ŷ)',
        loss: 'SmoothL1(coords) * 5.0 + CrossEntropy(shape) + CrossEntropy(color)',
      },
    },
    {
      id: 'memory',
      title: 'Spatial Memory',
      head: 'REGISTRY',
      category: 'Episodic Store',
      latency: '0.4 ms',
      shape: '3 Objects',
      metric: 'Persistent',
      icon: Layers,
      color: '#3b82f6',
      border: 'border-blue-500/40',
      bg: 'bg-blue-950/20',
      activeColor: 'text-blue-400',
      details: {
        concept: 'Target entity tracking across timesteps',
        tracked: 'Shape, Color, Cartesian coords (x,y,z), Grasp state',
        safetyCheck: 'Distance to Central Hazard Pillar > R_obs + 0.18m',
      },
    },
    {
      id: 'planner',
      title: 'Ollama Task Planner',
      head: 'HEAD 3: BRAIN',
      category: 'Reasoning',
      latency: '118 ms',
      shape: '5 Subgoals',
      metric: 'Zero Cloud',
      icon: Brain,
      color: '#f59e0b',
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/20',
      activeColor: 'text-amber-400',
      details: {
        model: 'Local Ollama (llama3.2 / qwen2.5) with Neuro-Symbolic Fallback',
        schema: 'Validated JSON task plan with target, destination, and constraints',
        modulation: 'Dynamic supervisory reward weights (λ_coll, λ_jerk, λ_step)',
        forensics: 'Post-hoc Explainable AI (XAI) trajectory forensics',
      },
    },
    {
      id: 'drl',
      title: 'D3QN + HER Policy',
      head: 'HEAD 2: MUSCLE',
      category: 'Actuation',
      latency: '0.8 ms',
      shape: '[18] → [9 Q-vals]',
      metric: `ε = ${epsilon.toFixed(3)}`,
      icon: Zap,
      color: '#10b981',
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/20',
      activeColor: 'text-emerald-400',
      details: {
        paper: 'Andrychowicz et al., NeurIPS 2017 & Wang et al., ICML 2016',
        architecture: 'Dueling Value-Advantage Stream: Q(s, a) = V(s) + A(s, a)',
        herStrategy: 'Future Hindsight Relabeling (k=4) converting misses to hits',
        actionSpace: '9 Primitives: [J1 ±Δθ, J2 ±Δθ, J3 ±Δθ, Toggle Gripper, Micro-Align, Hold]',
      },
    },
    {
      id: 'physics',
      title: 'MuJoCo Kinematic Twin',
      head: 'DIGITAL TWIN',
      category: 'Simulation',
      latency: '5.0 ms',
      shape: 'Named joint state',
      metric: `w = ${manipulability.toFixed(3)}`,
      icon: Cpu,
      color: '#8b5cf6',
      border: 'border-purple-500/40',
      bg: 'bg-purple-950/20',
      activeColor: 'text-purple-400',
      details: {
        state: 'Named joint positions, link transforms, end-effector site, and contact count from MuJoCo forward kinematics',
        control: 'Discrete action is applied by the planar task environment, then its joint and object positions are synchronized into the MuJoCo model',
        scope: 'The controller does not currently step MuJoCo torque dynamics; this panel reports the synchronized digital-twin state',
      },
    },
  ];

  return (
    <div className="panel col" style={{ padding: 16, gap: 12 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <Brain size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ margin: 0, fontSize: 14, fontFamily: 'var(--mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Autonomous AI Pipeline & Neural Inference
          </h3>
        </div>
        <div className="row" style={{ gap: 6, fontSize: 11, fontFamily: 'var(--mono)' }}>
          <span className="pill" style={{ color: busy ? '#22c55e' : '#94a3b8', border: '1px solid var(--line)' }}>
            <span className={`dot ${busy ? 'pulse' : ''}`} style={{ background: busy ? '#22c55e' : '#64748b' }} />
            {busy ? 'INFERENCE ACTIVE' : 'IDLE / READY'}
          </span>
        </div>
      </div>

      {/* Pipeline Blocks Horizontal Scroller */}
      <div className="row wrap" style={{ gap: 8, alignItems: 'stretch' }}>
        {NODES.map((node, idx) => {
          const Icon = node.icon;
          const isSelected = selectedNode?.id === node.id;

          return (
            <React.Fragment key={node.id}>
              <div
                onClick={() => setSelectedNode(node)}
                className={`panel col cursor-pointer transition-all ${node.bg}`}
                style={{
                  flex: '1 1 170px',
                  minWidth: 155,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: isSelected ? `2px solid ${node.color}` : '1px solid var(--line)',
                  boxShadow: isSelected ? `0 0 16px ${node.color}33` : 'none',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: node.color, fontWeight: 700 }}>
                    {node.head}
                  </span>
                  <span style={{ fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
                    {node.latency}
                  </span>
                </div>

                <div className="row" style={{ gap: 6, alignItems: 'center', margin: '2px 0' }}>
                  <Icon size={14} style={{ color: node.color }} />
                  <strong style={{ fontSize: 12.5, fontFamily: 'var(--mono)' }}>{node.title}</strong>
                </div>

                <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-2)', marginTop: 4 }}>
                  <span>{node.shape}</span>
                  <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{node.metric}</span>
                </div>
              </div>

              {idx < NODES.length - 1 && (
                <div className="row" style={{ alignItems: 'center', opacity: 0.4 }}>
                  <ChevronRight size={14} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Drawer showing Layer Details when clicked */}
      {selectedNode && (
        <div className="panel col" style={{ padding: 12, background: 'var(--surface-sunken)', borderRadius: 8, border: `1px solid ${selectedNode.color}55`, fontSize: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: selectedNode.color, textTransform: 'uppercase' }}>
              🔬 {selectedNode.title} // Technical Specifications
            </span>
            <button className="btn small" onClick={() => setSelectedNode(null)} style={{ padding: '2px 6px', fontSize: 10 }}>Close</button>
          </div>
          <div className="col" style={{ gap: 4, fontFamily: 'var(--mono)', color: 'var(--ink-2)' }}>
            {Object.entries(selectedNode.details).map(([k, v]) => (
              <div key={k} className="row" style={{ gap: 8 }}>
                <span style={{ color: 'var(--ink-3)', minWidth: 100, textTransform: 'capitalize' }}>{k}:</span>
                <span style={{ color: 'var(--ink-1)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
