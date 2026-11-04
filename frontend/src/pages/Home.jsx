import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import SuperheroComic from '../components/SuperheroComic';
import { Img } from '../components/ui';

const AIBrainPipeline = lazy(() => import('../components/AIBrainPipeline'));

function DeferredPipeline(props) {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !('IntersectionObserver' in window)) { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '280px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={sectionRef} className="pipeline-lazy-slot">{visible ? <Suspense fallback={<div className="pipeline-loading" role="status">Loading interactive pipeline…</div>}><AIBrainPipeline {...props} /></Suspense> : <div className="pipeline-loading">Interactive pipeline loads as you scroll to it.</div>}</div>;
}

const HEADS = [
  {
    k: 'Head 1: The Eye',
    subtitle: 'Spatial CoordConv Multi-Task CNN',
    c: '#0ea5e9',
    icon: Eye,
    img: 'head-eye',
    title: 'Spatial Visual Grounding',
    body: 'Injects explicit Cartesian coordinate channels [X, Y] into convolutional feature maps, then predicts component shape, color, and normalized position from each rendered workspace image.',
    badge: 'Shape · color · XY',
    features: ['Grad-CAM Attention Heatmaps', 'Multi-Task Loss Balancing', 'Sub-Pixel Centroid Regression'],
  },
  {
    k: 'Head 2: The Muscle',
    subtitle: 'DQfD · Dueling Double-DQN + HER',
    c: '#10b981',
    icon: Zap,
    img: 'head-muscle',
    title: 'Reinforcement Learning Policy',
    body: 'A goal-conditioned Dueling Double-DQN learns from both reward and expert demonstrations. Hindsight Experience Replay adds useful goals from each trajectory, while a language-conditioned safety shield masks unsafe actions before the policy moves.',
    badge: '9 actions · HER + DQfD',
    features: ['Expert-Margin Policy Learning', 'Hindsight Goal Relabeling', 'Swept-Collision Action Shield'],
  },
  {
    k: 'Head 3: The Brain',
    subtitle: 'Local LangGraph LLM Reasoner',
    c: '#f59e0b',
    icon: Brain,
    img: 'head-brain',
    title: 'Neuro-Symbolic Task Planning',
    body: 'A local LangGraph supervisor compiles instructions into validated object, destination, subgoal, and safety constraints. Those constraints tune reward shaping and an action shield; the DQN still chooses each environment action.',
    badge: 'Local Ollama · guarded plans',
    features: ['Plan Validation & Goal Grounding', 'Language-Conditioned Action Mask', 'Outcome Feedback to DRL'],
  },
];

const BENCH = [
  { name: 'Random', success: 0, collision: 81.7, jerk: 3.328 },
  { name: 'Geometric reference', success: 78.3, collision: 0, jerk: 3.265 },
  { name: 'Trained DQfD + shield', success: 28.3, collision: 0, jerk: 3.116 },
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
    desc: 'Graphite package, color-coded lid, gold leads, and a keyed alignment mark.',
    color: '#94a3b8',
  },
  {
    name: 'Quartz Focusing Lens',
    shape: 'Sphere',
    desc: 'Refractive quartz shell with inner optic and concentric calibration rings.',
    color: '#38bdf8',
  },
  {
    name: 'Dispersive Optical Prism',
    shape: 'Triangular Prism',
    desc: 'Triangular optical glass with a facet marker and three fiducial corners.',
    color: '#f43f5e',
  },
  {
    name: 'Fiducial Sensor Star',
    shape: 'Five-point star',
    desc: 'Anodized five-point pod with a central glass sensor and five fasteners.',
    color: '#10b981',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('benchmarks');

  return (
    <MarketingShell>
      <div className="marketing-page">
      {/* 1. CINEMATIC HERO SECTION */}
      <section className="sect tight hero-wrap">
        <div className="hero-grid-bg" aria-hidden="true" /><div className="hero-orb hero-orb-one" aria-hidden="true" /><div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="hero" style={{ alignItems: 'start', gap: 36 }}>
          {/* Left Hero Column: Typographic Branding & Technical Specs */}
          <div className="col hero-copy" style={{ gap: 20 }}>
            <div className="row wrap" style={{ gap: 8 }}>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-sm">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                CERBERUS-ARM // CLEANROOM HERO
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                3-DOF Cleanroom Workcell
              </span>
            </div>

            <div className="col" style={{ gap: 6 }}>
              <h1 style={{ fontSize: 'clamp(2.4rem, 4.6vw, 3.8rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
                Three intelligence heads. <br />
                <span style={{ color: 'var(--blueprint-2)', textShadow: '0 0 24px rgba(42, 68, 181, 0.25)' }}>
                  One cleanroom hero.
                </span>
              </h1>
              <p style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                See. Think. Pick. Place.
              </p>
            </div>

            <p className="lead" style={{ fontSize: '1.08rem', lineHeight: 1.65, color: 'var(--ink-2)' }}>
              Meet CERBERUS: an original robotic-arm superhero for delicate cleanroom sorting. Its vision CNN spots the target, a local LangGraph brain sets the mission and safety rules, and a goal-conditioned DQfD policy chooses how the arm moves.
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
                  3D
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>MuJoCo Digital Twin</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 16 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 800, color: '#10b981' }}>
                  3
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Destination Bays</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 16 }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.45rem', fontWeight: 800, color: '#f59e0b' }}>
                  9
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Discrete Actions</div>
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
          <div className="col hero-visual" style={{ width: '100%' }}>
            <div className="hero-demo-frame"><div className="demo-topline"><span className="demo-mark"><Activity size={13} /> CERBERUS <i>SEEDED SAMPLE MISSION</i></span><span className="demo-window"><i /><i /><i /></span></div><HeroDemo /></div>
          </div>
        </div>
        <div className="hero-facts sect"><span>SUPERPOWERS, WITH SAFETY CHECKS</span><div><b>Vision</b> finds the target</div><div><b>Shield</b> blocks collisions</div><div><b>DQN</b> chooses the move</div></div>
      </section>

      <SuperheroComic />

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
            Click a node to explore the model flow, tensor shapes, and learning methods. Latencies and live values shown in the illustration are examples, not measured run telemetry.
          </p>
        </div>

        <DeferredPipeline
          busy={false}
          perceptionConfidence={0.964}
          manipulability={0.707}
          epsilon={0.05}
        />
      </section>

      {/* 5. EMPIRICAL BENCHMARKS & RELIABILITY */}
      <section className="sect" aria-labelledby="benchmarks-heading" style={{ paddingTop: 32 }}>
        <div className="grid g2" style={{ alignItems: 'center', gap: 44 }}>
          <div className="col" style={{ gap: 16 }}>
            <span className="pill ok" style={{ fontWeight: 700, fontSize: 12, alignSelf: 'flex-start' }}>EMPIRICAL RIGOR</span>
            <h2 id="benchmarks-heading" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)' }}>
              Held-out results, clearly reported. <br />
              28.3% learned success. Still improving.
            </h2>
            <p className="muted" style={{ fontSize: '1.02rem', lineHeight: 1.65 }}>
              Measured on 60 matched held-out scenes (20 per task, seed 2027). The shielded DQfD policy improved to 28.3% success with no collisions; the geometric reference reached 78.3%. The learned policy is improving, and the remaining transfer gap stays visible.
            </p>

            <div className="col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                  <strong>Hindsight Experience Replay (HER):</strong> Relabels valid achieved object positions as alternate goals for replay.
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                  <strong>Manipulability guidance:</strong> The action shield filters candidate moves below the configured threshold.
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#10b981', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--ink)' }}>
                  <strong>Motion smoothness:</strong> The reward penalizes abrupt joint changes; held-out jerk is reported below.
                </span>
              </div>
            </div>

            <div className="row" style={{ marginTop: 8 }}>
              <a className="btn primary" href="#/training">Explore Training Curves & Logs</a>
            </div>
          </div>

          {/* Benchmark Bar Chart */}
          <div className="panel body analytics-card landing-benchmark" style={{ height: 360, padding: 20 }} aria-label="Comparative robotics benchmark chart">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.98rem' }}>Matched held-out scenes · 60 total</h3>
              <span className="pill info" style={{ fontSize: 11 }}>20 per task · seed 2027</span>
            </div>
            <div className="metric-switch" role="group" aria-label="Benchmark metric"><button aria-pressed={activeTab === 'success'} onClick={() => setActiveTab('success')}>Success rate</button><button aria-pressed={activeTab === 'collision'} onClick={() => setActiveTab('collision')}>Collision rate</button><button aria-pressed={activeTab === 'jerk'} onClick={() => setActiveTab('jerk')}>Motion jerk</button></div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={BENCH} margin={{ left: -16, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-2)' }} />
                <YAxis domain={activeTab === 'jerk' ? [0, 6] : [0, 100]} tick={{ fontSize: 11, fill: 'var(--ink-2)' }} unit={activeTab === 'jerk' ? '' : '%'} />
                <Tooltip />
                <Bar dataKey={activeTab} name={activeTab === 'success' ? 'Success %' : activeTab === 'collision' ? 'Hazard Collision %' : 'Motion Jerk Index'} fill={activeTab === 'success' ? '#10b981' : activeTab === 'collision' ? '#ef4444' : '#3b82f6'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="analytics-foot"><span><i className="legend-dot" /> Measured; see docs/training</span><span>Success/collision % · jerk mean per episode</span></div>
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
      </div>
    </MarketingShell>
  );
}
