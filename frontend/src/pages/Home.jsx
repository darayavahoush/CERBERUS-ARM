import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, Brain, Dumbbell, Eye } from 'lucide-react';
import { MarketingShell } from '../components/Shell';
import HeroDemo from '../components/HeroDemo';
import { Img } from '../components/ui';

const HEADS = [
  { k: 'Eye', c: 'var(--eye)', icon: Eye, img: 'head-eye', title: 'Sees the table', body: 'A vision network finds each object’s shape, colour and position from the camera frame, and shows where it was looking with an attention heatmap.', prompt: 'Overhead macro photo of a robot arm workspace, small coloured cubes, spheres and stars on a matte grey table, soft teal rim light, shallow depth of field, no text.' },
  { k: 'Muscle', c: 'var(--muscle)', icon: Dumbbell, img: 'head-muscle', title: 'Learns the motion', body: 'A reinforcement-learning agent (Dueling Double DQN with hindsight replay) turns “get the cube there” into joint moves, and learns to avoid the pillar and awkward arm poses.', prompt: 'Close-up of a two-joint industrial robot arm gripping a small cube, dramatic violet side light, dark background, clean product photography, no text.' },
  { k: 'Brain', c: 'var(--brain)', icon: Brain, img: 'head-brain', title: 'Understands the request', body: 'A local language model turns your sentence into a short plan and tunes the penalties. It also writes a plain-English debrief of what happened after each run.', prompt: 'Abstract blueprint-style illustration of a sentence turning into a step plan, cobalt blue and white line art, yellow accent, no readable text.' },
];

const BENCH = [
  { name: 'Random', success: 6.7, collision: 46.7 },
  { name: 'Standard D3QN', success: 53.3, collision: 20 },
  { name: 'Full system', success: 86.7, collision: 6.7 },
];

export default function Home() {
  return (
    <MarketingShell>
      <section className="sect tight">
        <div className="hero" style={{ paddingTop: 28 }}>
          <div className="col" style={{ gap: 22 }}>
            <h1>Tell the arm what to move. It works out how.</h1>
            <p className="lead">CERBERUS-ARM is a robot arm that reads a plain-language instruction, finds the right object on the table, and learns to carry it to the right bay without hitting anything.</p>
            <div className="row wrap">
              <a className="btn primary" href="#/console">Open the console <ArrowRight size={16} aria-hidden /></a>
              <a className="btn" href="#/about">How it works</a>
            </div>
            <p className="faint" style={{ fontSize: 13.5 }}>Runs on sample data in your browser. Connect the Python backend any time from the top bar.</p>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section className="sect" aria-labelledby="heads">
        <div className="col" style={{ gap: 8, marginBottom: 28 }}><h2 id="heads">Three parts, one arm</h2><p className="lead">Each part does one job and can be inspected on its own in the console.</p></div>
        <div className="grid g3">
          {HEADS.map(({ k, c, icon: I, img, title, body, prompt }) => (
            <article key={k} className="panel head-card">
              <div className="art"><Img name={img} alt={`${k}: ${title}`} prompt={prompt} /></div>
              <div className="txt"><span className="kicker" style={{ color: c }}><i style={{ background: c }} /><I size={16} aria-hidden /> {k}</span><h3>{title}</h3><p className="muted">{body}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="sect">
          <h2 style={{ marginBottom: 28 }}>From sentence to placed object</h2>
          <div className="flow">
            {[['You type', '“Carefully move the blue sphere to the red bin.”'], ['The planner reads it', 'It picks the target, the bay and how cautious to be.'], ['The arm moves', 'The learned policy chooses a joint move every step, 60 times a second in the live system.'], ['You get a debrief', 'Success or failure, the path taken, and a short explanation.']].map(([t, d], i) => (
              <div key={t}><span style={{ color: 'var(--signal)', fontWeight: 700 }}>Step {i + 1}</span><h3>{t}</h3><p className="muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="sect" aria-labelledby="bench">
        <div className="grid g2" style={{ alignItems: 'center', gap: 40 }}>
          <div className="col" style={{ gap: 14 }}>
            <h2 id="bench">It beats the usual approach</h2>
            <p className="muted">On the same 15 scenes, the full system placed the object far more often and hit the pillar far less than random movement or a standard DQN. These are the reference results shipped with the project; rerun them any time on the Training page.</p>
            <a className="btn" href="#/training">See training and benchmarks</a>
          </div>
          <div className="panel body" style={{ height: 300 }} role="img" aria-label="Bar chart: success rate 6.7 percent random, 53.3 percent standard D3QN, 86.7 percent full system">
            <ResponsiveContainer><BarChart data={BENCH} margin={{ left: -18 }}><CartesianGrid stroke="#e6eaf0" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 12 }} /><Tooltip /><Legend /><Bar dataKey="success" name="Success %" fill="#17784d" isAnimationActive={false} /><Bar dataKey="collision" name="Collision %" fill="#c7352b" isAnimationActive={false} /></BarChart></ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="sect" aria-labelledby="inside" style={{ paddingTop: 0 }}>
        <h2 id="inside" style={{ marginBottom: 24 }}>Inside the console</h2>
        <div className="grid g2" style={{ alignItems: 'center', gap: 40 }}>
          <div className="panel" style={{ overflow: 'hidden' }}><Img name="console-screenshot" ratio="16 / 10" alt="Screenshot of the CERBERUS-ARM console" prompt="Clean screenshot of the console page at 1440px wide with a finished episode." /></div>
          <ul className="col" style={{ listStyle: 'none', padding: 0, margin: 0, gap: 16 }}>
            {[['Workspace', 'Watch the arm move on a live blueprint of the table. Click any object to plan a move for it.'], ['Vision check', 'See what the camera detects and where the model looked.'], ['Decision telemetry', 'Follow how the policy scores each action, step by step.'], ['Training and episodes', 'Track learning curves and keep a history of every run, with export.']].map(([t, d]) => <li key={t}><h3>{t}</h3><p className="muted">{d}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="sect" style={{ paddingTop: 0 }}>
        <div className="panel body row wrap" style={{ padding: 28, gap: 18, background: 'var(--blueprint)', color: '#fff', borderColor: '#101d63' }}>
          <div className="grow"><h2>Try an instruction</h2><p style={{ color: '#c9d4f7', marginTop: 6 }}>No setup needed. The console starts on sample data.</p></div>
          <a className="btn signal" href="#/console">Open the console</a>
        </div>
      </section>
    </MarketingShell>
  );
}
