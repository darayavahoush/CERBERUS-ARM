import React from 'react';
import { MarketingShell } from '../components/Shell';
import { Img } from '../components/ui';

const STACK = [
  ['Vision (Head 1)', 'PyTorch CoordConv CNN with Grad-CAM & sub-pixel centroid regression'],
  ['Muscle (Head 2)', '3-DOF Dueling Double-DQN + Hindsight Experience Replay (HER, k=4)'],
  ['Brain (Head 3)', 'Local Ollama LangGraph State Machine (Qwen2.5 / Llama3.2) with XAI forensics'],
  ['Physics Engine', 'MuJoCo 3.17 + Runge-Kutta 4th Order (RK4) multi-body dynamics at 500Hz'],
  ['3D Digital Twin', 'Three.js WebGL PBR renderer with OrbitControls & dynamic shadows'],
  ['Backend Stack', 'FastAPI, Uvicorn, LangGraph, PyTorch, NumPy, SciPy'],
  ['Frontend Stack', 'React 19, Vite, Tailwind CSS, Recharts, Lucide'],
];

export default function About() {
  return (
    <MarketingShell>
      <section className="sect">
        <div className="col" style={{ gap: 18, maxWidth: 820 }}>
          <h1 style={{ fontSize: 'clamp(2.1rem, 4.6vw, 3.4rem)' }}>About CERBERUS-ARM</h1>
          <p className="lead" style={{ maxWidth: '60ch' }}>A research project on language-guided robot manipulation: say what you want moved, and a learned controller does it safely.</p>
        </div>
      </section>

      <section className="sect" style={{ paddingTop: 0 }}>
        <div className="grid g2" style={{ gap: 48, alignItems: 'start' }}>
          <div className="prose">
            <h2>The problem</h2>
            <p>Most robot arms either follow fixed scripts or need an engineer to specify every target. Learned controllers are flexible, but they are hard to direct and hard to trust. This project asks a narrower question: can a small arm take an everyday sentence, find the right object, and move it into the right bay without hitting the obstacle in the middle?</p>
            <p>CERBERUS-ARM addresses intelligent robotic arm manipulation by coupling spatial perception, neuro-symbolic reasoning, and closed-loop reinforcement learning into an integrated, industrial-grade architecture. The arm operates as an articulated planar manipulator with an interactive 3D MuJoCo digital twin, navigating complex obstacle envelopes and multi-receptacle sorting workflows.</p>
            <h2>How the parts fit</h2>
            <p>The language model never moves the arm. It turns your request into a plan and adjusts the penalties the controller trains against, such as a heavier collision penalty when you say “carefully”. The vision model reports what is on the table. The reinforcement-learning agent chooses every joint movement.</p>
            <p>After each run the system explains what happened using the recorded numbers, so a failure comes with a reason rather than only a red mark.</p>
          </div>
          <div className="col">
            <div className="panel" style={{ overflow: 'hidden' }}><Img name="architecture" ratio="4 / 3" alt="Diagram of the three parts: language planner, vision network and control agent, feeding the arm" prompt="Clean architecture diagram: instruction → planner → vision → agent → arm → dashboard. Cobalt and white, yellow accents." /></div>
            <div className="panel"><header><h3>Built with</h3></header>
              <div className="body"><dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 18px', margin: 0 }}>{STACK.map(([k, v]) => <React.Fragment key={k}><dt style={{ fontWeight: 600 }}>{k}</dt><dd className="muted" style={{ margin: 0 }}>{v}</dd></React.Fragment>)}</dl></div></div>
          </div>
        </div>
      </section>

      <section className="sect" style={{ paddingTop: 0 }}>
        <div className="grid g2" style={{ gap: 24 }}>
          <div className="panel"><header><h3>Sample data and live data</h3></header><div className="body prose" style={{ fontSize: '.98rem' }}>
            <p>The console starts on sample data generated in your browser, so the whole interface works with nothing else running. Switch to <strong>Live</strong> in the top bar to use the Python backend. If it is not running, you will see a clear banner and can go back to sample data.</p>
            <p>Sample and live episodes are stored separately on your device, so one never mixes into the other.</p></div></div>
          <div className="panel"><header><h3>Run it yourself</h3></header><div className="body">
            <pre style={{ margin: 0, padding: 14, background: 'var(--ink)', color: '#e8eefc', borderRadius: 10, overflowX: 'auto', fontSize: 13 }}>{`# backend
pip install -r requirements.txt
uvicorn backend.app:app --port 8000

# frontend
cd frontend
npm install
npm run dev`}</pre></div></div>
        </div>
      </section>
    </MarketingShell>
  );
}
