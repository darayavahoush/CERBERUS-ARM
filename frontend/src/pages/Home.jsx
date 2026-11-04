import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Brain,
  Cpu,
  Dumbbell,
  Eye,
  Layers,
  Sparkles,
  Zap,
  ShieldCheck,
  Target,
  Maximize2,
  CheckCircle2,
  Box,
  Compass,
  Mic,
  Activity,
  Code2,
  BookOpen,
} from 'lucide-react';
import { MarketingShell } from '../components/Shell';
import HeroDemo from '../components/HeroDemo';
import AIBrainPipeline from '../components/AIBrainPipeline';
import { Img } from '../components/ui';

const HEADS = [
  {
    k: 'Head 1: The Eye',
    subtitle: 'Spatial CoordConv Multi-Task CNN',
    c: '#0ea5e9',
    icon: Eye,
    img: 'head-eye',
    title: 'Spatial Visual Grounding',
    body: 'Injects explicit Cartesian coordinate channels [X, Y] into the convolutional feature maps (Liu et al., NeurIPS 2018), breaking translational invariance to simultaneously classify shapes, classify colors, and regress sub-millimeter continuous component centroids (x̂, ŷ).',
    badge: '4.2 ms · 98.4% Acc',
    features: ['Grad-CAM Attention Heatmaps', 'Multi-Task Loss Balancing', 'Sub-Pixel Centroid Regression'],
  },
  {
    k: 'Head 2: The Muscle',
    subtitle: '3-DOF Dueling Double-DQN + HER',
    c: '#10b981',
    icon: Zap,
    img: 'head-muscle',
    title: 'Reinforcement Learning Policy',
    body: 'A goal-conditioned Dueling Double-DQN agent trained with Hindsight Experience Replay (HER, k=4). Employs an 18-dimensional state vector and 9 discrete 3-DOF actuation primitives, actively penalizing kinematic singularities via Yoshikawa manipulability w(q) and jerk regularizers.',
    badge: '0.8 ms · 500Hz RK4',
    features: ['3-DOF Articulated Kinematics', 'Hindsight Goal Relabeling', 'Singularity Avoidance w(q)'],
  },
  {
    k: 'Head 3: The Brain',
    subtitle: 'Local LangGraph LLM Reasoner',
    c: '#f59e0b',
    icon: Brain,
    img: 'head-brain',
    title: 'Neuro-Symbolic Task Planning',
    body: 'An autonomous local state machine powered by Ollama (Qwen2.5 / Llama 3.2) that parses natural language instructions into deterministic PDDL subgoals, dynamically tunes safety penalty weights (λ_coll, λ_jerk), and generates post-hoc Explainable AI (XAI) forensic debriefs.',
    badge: '118 ms · Zero Cloud',
    features: ['LangGraph State Machine', 'Dynamic Reward Modulation', 'Forensic XAI Debriefs'],
  },
];

const BENCH = [
  { name: 'Random Exploration', success: 6.7, collision: 46.7, jerk: 82.4 },
  { name: 'Standard D3QN (No HER)', success: 53.3, collision: 20.0, jerk: 34.1 },
  { name: 'CERBERUS Tri-Modal (Ours)', success: 86.7, collision: 6.7, jerk: 11.2 },
];

const WORKCELL_BAYS = [
  {
    name: 'Bay A · SMT Staging',
    desc: 'Surface-Mount Technology Infeed & Assembly Dock',
    coord: '[-1.25, 0.45] m',
    color: '#ef4444',
    tag: 'Red Receptacle',
  },
  {
    name: 'Bay B · AOI Inspection',
    desc: 'Automated Optical Quality & Laser Verification',
    coord: '[+1.25, 0.45] m',
    color: '#3b82f6',
    tag: 'Blue Receptacle',
  },
  {
    name: 'Bay C · Cleanroom QA',
    desc: 'Certified Class-100 Pass-Through Chamber Dock',
    coord: '[0.00, 1.60] m',
    color: '#10b981',
    tag: 'Green Receptacle',
  },
];

const COMPONENTS = [
  {
    name: 'Micro-Module IC',
    shape: 'Cube',
    desc: 'Graphite metallic multi-pin integrated circuit package with laser-etched fiducials.',
    color: '#94a3b8',
  },
  {
    name: 'Quartz Focusing Lens',
    shape: 'Sphere',
    desc: 'High-purity refractive optical crystal sphere with anti-reflective coating.',
    color: '#38bdf8',
  },
  {
    name: 'Dispersive Optical Prism',
    shape: 'Triangular Prism',
    desc: 'Polished optical crown glass prism for spectral dispersion and beam steering.',
    color: '#f43f5e',
  },
  {
    name: 'Multi-Axis Sensor Hub',
    shape: 'Hexagon',
    desc: 'Anodized gold sensor housing with hermetically sealed optical aperture.',
    color: '#f59e0b',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('benchmarks');

  return (
    <MarketingShell>
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="sect tight" style={{ paddingTop: 20, paddingBottom: 48 }}>
        <div className="hero" style={{ alignItems: 'start', gap: 36 }}>
          {/* Left Hero Column: Typographic Branding & Technical Specs */}
          <div className="col" style={{ gap: 20 }}>
            <div className="row wrap" style={{ gap: 8 }}>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-sm">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                CERBERUS-ARM // SYSTEM V2.4
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                3-DOF Cleanroom Workcell
              </span>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <h1 style={{ fontSize: 'clamp(2.4rem, 4.6vw, 3.8rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                The Three-Headed <br />
                <span style={{ color: 'var(--blueprint-2)', textShadow: '0 0 24px rgba(42, 68, 181, 0.25)' }}>
                  Robotic Intelligence.
                </span>
              </h1>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Vision. Reasoning. Manipulation.
              </p>
            </div>

            <p className="lead" style={{ fontSize: '1.08rem', lineHeight: 1.65, color: 'var(--ink-2)' }}>
              An autonomous 3-DOF articulated robotic manipulator designed for cleanroom micro-assembly and optical component sorting. Powered by spatial CoordConv computer vision, localhost LangGraph reasoning, goal-conditioned D3QN+HER reinforcement learning, and a real-time 500Hz MuJoCo physics digital twin.
            </p>

            {/* CTAs */}
            <div className="row wrap" style={{ gap: 12, marginTop: 4 }}>
              <a className="btn primary" href="#/console" style={{ padding: '0 24px', height: 46, fontSize: 15, fontWeight: 700 }}>
                Launch Mission Cockpit <ArrowRight size={18} aria-hidden />
              </a>
              <a className="btn" href="#architecture" style={{ padding: '0 20px', height: 46, fontSize: 14, fontWeight: 600 }}>
                Inspect Architecture
              </a>
              <a className="btn" href="#/about" style={{ padding: '0 18px', height: 46, fontSize: 14 }}>
                Documentation & Paper
              </a>
            </div>

            {/* Live Metrics Ticker */}
            <div
              className="row wrap"
              style={{
                gap: 16,
                padding: '12px 18px',
                borderRadius: 12,
                background: 'rgba(16, 27, 46, 0.04)',
                border: '1px solid var(--rule)',
                marginTop: 8,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--blueprint-2)' }}>
                  500 Hz
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>RK4 Multi-Body Physics</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 16 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>
                  86.7%
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Cleanroom Sort Success</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 16 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 800, color: '#f59e0b' }}>
                  0.4 mm
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>IK End-Effector Precision</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 16 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--ink)' }}>
                  Zero Cloud
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Localhost DRL & LLM</div>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Interactive Live 3-DOF 3D Twin Demo */}
          <div className="col" style={{ width: '100%' }}>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* 2. THE THREE CERBERUS HEADS (TRI-MODAL DEEP INTELLIGENCE) */}
      <section className="sect" aria-labelledby="heads-heading" style={{ paddingTop: 32 }}>
        <div className="col" style={{ gap: 8, marginBottom: 32, textAlign: 'center', alignItems: 'center' }}>
          <span className="pill info" style={{ fontWeight: 700, fontSize: 12 }}>TRI-MODAL NEURAL ARCHITECTURE</span>
          <h2 id="heads-heading" style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)' }}>
            Three Autonomous Heads. One Embodied Arm.
          </h2>
          <p className="lead" style={{ maxWidth: '64ch' }}>
            Each head represents an independent neural tier with dedicated latency budgets, mathematical formulations, and verifiable execution invariants.
          </p>
        </div>

        <div className="grid g3">
          {HEADS.map(({ k, subtitle, c, icon: I, img, title, body, badge, features }) => (
            <article key={k} className="panel head-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderColor: 'var(--rule)' }}>
              <div className="art" style={{ position: 'relative', overflow: 'hidden' }}>
                <Img name={img} alt={`${k}: ${title}`} ratio="16 / 10" />
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(10, 15, 30, 0.85)',
                    color: c,
                    border: `1px solid ${c}50`,
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                  }}
                >
                  {badge}
                </span>
              </div>
              <div className="txt col grow" style={{ padding: 20, gap: 12 }}>
                <div>
                  <div className="row" style={{ gap: 6, color: c, fontWeight: 700, fontSize: 12.5, textTransform: 'uppercase' }}>
                    <I size={15} />
                    <span>{k}</span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', marginTop: 4 }}>{title}</h3>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{subtitle}</div>
                </div>

                <p className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>{body}</p>

                <div className="col" style={{ gap: 6, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--rule-2)' }}>
                  {features.map((f) => (
                    <div key={f} className="row" style={{ gap: 6, fontSize: 12.5, color: 'var(--ink-2)' }}>
                      <CheckCircle2 size={13} style={{ color: c, flex: 'none' }} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. REAL-WORLD CLEANROOM WORKCELL SPECIFICATION */}
      <section className="band" style={{ padding: '64px 0', background: '#0b111e', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div className="sect" style={{ padding: '0 24px' }}>
          <div className="col" style={{ gap: 8, marginBottom: 36, textAlign: 'center', alignItems: 'center' }}>
            <span style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              INDUSTRIAL APPLICATION DOMAIN
            </span>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)' }}>
              Optical Component & Semiconductor Workcell
            </h2>
            <p style={{ color: '#94a3b8', maxWidth: '68ch', fontSize: '1.05rem', lineHeight: 1.6 }}>
              CERBERUS-ARM is engineered for high-throughput, vibration-free sortation of fragile optical and micro-electronic components across designated cleanroom bays without manual fixtures.
            </p>
          </div>

          {/* Three Industrial Sorting Bays */}
          <div className="grid g3" style={{ gap: 20, marginBottom: 32 }}>
            {WORKCELL_BAYS.map((bay) => (
              <div
                key={bay.name}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: `1px solid ${bay.color}40`,
                  borderRadius: 14,
                  padding: 22,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: bay.color, fontFamily: 'var(--mono)' }}>{bay.tag}</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--mono)' }}>{bay.coord}</span>
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>{bay.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: 13.5, margin: 0 }}>{bay.desc}</p>
              </div>
            ))}
          </div>

          {/* Cleanroom Component Sample Space */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div className="row" style={{ gap: 8, marginBottom: 16 }}>
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
              <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: 0 }}>
                Dynamic Cleanroom Sample Space (Randomized on Reset)
              </h3>
            </div>
            <div className="grid g4" style={{ gap: 16 }}>
              {COMPONENTS.map((c) => (
                <div key={c.name} style={{ background: '#090e17', border: '1px solid #1e293b', borderRadius: 10, padding: 14 }}>
                  <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#0284c7', fontFamily: 'var(--mono)', marginBottom: 4 }}>{c.shape}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE NEURAL ARCHITECTURE PIPELINE */}
      <section id="architecture" className="sect" aria-labelledby="pipeline-heading" style={{ paddingTop: 48 }}>
        <div className="col" style={{ gap: 8, marginBottom: 28, textAlign: 'center', alignItems: 'center' }}>
          <span className="pill info" style={{ fontWeight: 700, fontSize: 12 }}>END-TO-END PIPELINE</span>
          <h2 id="pipeline-heading" style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)' }}>
            Interactive AI Brain & Execution Pipeline
          </h2>
          <p className="lead" style={{ maxWidth: '64ch' }}>
            Click on any pipeline node below to inspect real-time tensor dimensions, inference latency, loss formulations, and paper citations.
          </p>
        </div>

        <AIBrainPipeline
          busy={false}
          perceptionConfidence={0.984}
          manipulability={0.762}
          epsilon={0.05}
        />
      </section>

      {/* 5. EMPIRICAL BENCHMARKS & RELIABILITY */}
      <section className="sect" aria-labelledby="benchmarks-heading" style={{ paddingTop: 32 }}>
        <div className="grid g2" style={{ alignItems: 'center', gap: 44 }}>
          <div className="col" style={{ gap: 16 }}>
            <span className="pill ok" style={{ fontWeight: 700, fontSize: 12, alignSelf: 'flex-start' }}>EMPIRICAL RIGOR</span>
            <h2 id="benchmarks-heading" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)' }}>
              86.7% Success Rate. <br />
              7× Collision Reduction.
            </h2>
            <p className="muted" style={{ fontSize: '1.02rem', lineHeight: 1.65 }}>
              Standard reinforcement learning struggles with sparse rewards in obstacle-rich workcells. CERBERUS achieves state-of-the-art sample efficiency and collision safety by combining Hindsight Experience Replay (HER) with continuous Yoshikawa manipulability regularization and supervisory penalty modulation.
            </p>

            <div className="col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                  <strong>Hindsight Experience Replay (HER):</strong> Converts 100% of missed grasps into virtual successes via goal relabeling.
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                  <strong>Singularity Avoidance w(q):</strong> Continuous penalty enforces arm poses far from kinematic gimbal deadlocks.
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                  <strong>Jerk Minimization:</strong> Penalizes angular acceleration derivatives to eliminate high-frequency servo oscillations.
                </span>
              </div>
            </div>

            <div className="row" style={{ marginTop: 8 }}>
              <a className="btn primary" href="#/training">Explore Training Curves & Logs</a>
            </div>
          </div>

          {/* Benchmark Bar Chart */}
          <div className="panel body" style={{ height: 340, padding: 20 }} role="img" aria-label="Comparative Robotics Benchmark Chart">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.98rem' }}>Cleanroom Sortation Benchmark (N=15 Workcells)</h3>
              <span className="pill info" style={{ fontSize: 11 }}>Reference Evaluation</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={BENCH} margin={{ left: -16, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--ink-2)' }} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="success" name="Success %" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collision" name="Hazard Collision %" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION / EXECUTIVE FOOTER BANNER */}
      <section className="sect" style={{ paddingTop: 12, paddingBottom: 64 }}>
        <div
          className="panel body row wrap"
          style={{
            padding: '36px 32px',
            gap: 24,
            background: 'linear-gradient(135deg, #0a1450 0%, #1b2f8e 100%)',
            color: '#fff',
            borderColor: '#101d63',
            borderRadius: 18,
            boxShadow: '0 12px 32px rgba(27, 47, 142, 0.25)',
          }}
        >
          <div className="col grow" style={{ gap: 8 }}>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-cyan-300 border border-cyan-400/30 self-start">
              READY FOR EMBODIED DEPLOYMENT
            </span>
            <h2 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)' }}>
              Experience Autonomous Manipulation in Real Time
            </h2>
            <p style={{ color: '#c9d4f7', fontSize: '1.05rem', margin: 0, maxWidth: '58ch' }}>
              Launch the interactive mission console directly in your browser. Issue verbal or typed commands, monitor NASA telemetry gauges, randomize cleanroom workcells, and watch the 3D twin plan and execute.
            </p>
          </div>

          <div className="row wrap" style={{ gap: 12, alignItems: 'center' }}>
            <a className="btn signal" href="#/console" style={{ padding: '0 24px', height: 48, fontSize: 15, fontWeight: 700 }}>
              Launch Mission Console <ArrowRight size={18} />
            </a>
            <a
              className="btn"
              href="https://github.com/darayavahoush/CERBERUS-ARM"
              target="_blank"
              rel="noreferrer"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)', height: 48, padding: '0 20px' }}
            >
              <Code2 size={16} /> GitHub Repository
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
