import React, { useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Brain, Check, ChevronLeft, ChevronRight, Code2, Copy, Cpu, Eye, Layers, ShieldCheck, Sparkles, Workflow, Zap } from 'lucide-react';
import { MarketingShell, SourceToggle } from '../components/Shell';
import { useBackend } from '../api/BackendProvider';
import { Img } from '../components/ui';

const FLOW = [
  { title: 'You describe the goal', short: 'Natural language', icon: Workflow, color: '#72dfba', label: '01 · INTENT', headline: 'Start with what you want done.', body: 'Type a request in plain language. The local planner extracts the object, destination and constraints, so “carefully” can change how the controller weighs safety.', signal: 'Input: a sentence', output: 'Target + constraints' },
  { title: 'The Eye grounds the scene', short: 'Spatial perception', icon: Eye, color: '#42c6dd', label: '02 · PERCEPTION', headline: 'Find the right object in space.', body: 'The CoordConv vision model estimates shape, colour and position from the workspace image. Attention maps let you inspect what informed the prediction.', signal: 'Input: workspace frame', output: 'Objects + coordinates' },
  { title: 'The Muscle chooses a move', short: 'Learned control', icon: Zap, color: '#b39aff', label: '03 · CONTROL', headline: 'Choose a useful next action.', body: 'The goal-conditioned D3QN policy scores its available actions against the current state and target, with training that rewards completion and discourages collisions.', signal: 'Input: state + goal', output: 'Joint action' },
  { title: 'The twin runs the physics', short: 'MuJoCo + RK4', icon: Cpu, color: '#ffbd72', label: '04 · EXECUTION', headline: 'Close the loop and review.', body: 'MuJoCo advances the articulated arm, returns a fresh observation and records the result. Episode telemetry makes the run inspectable from the console.', signal: 'Input: joint action', output: 'New state + telemetry' },
];

const STACK = [
  { name: 'CoordConv + multi-task CNN', group: 'Intelligence', detail: 'Spatial object detection with Grad-CAM attention.' },
  { name: 'Dueling Double DQN + HER', group: 'Intelligence', detail: 'Goal-conditioned policy learning with hindsight replay.' },
  { name: 'Ollama + LangGraph', group: 'Intelligence', detail: 'Local language planning and structured subgoals.' },
  { name: 'MuJoCo 3.17 + RK4', group: 'Simulation', detail: 'Rigid-body contact simulation and integration.' },
  { name: 'Three.js + WebGL', group: 'Simulation', detail: 'Interactive 3D digital twin and rendering.' },
  { name: 'FastAPI + Uvicorn', group: 'Application', detail: 'HTTP and WebSocket backend services.' },
  { name: 'React 19 + Vite', group: 'Application', detail: 'Responsive operator interface and dev server.' },
  { name: 'Recharts + Lucide', group: 'Application', detail: 'Telemetry charts and accessible interface icons.' },
];
const FILTERS = ['All', 'Intelligence', 'Simulation', 'Application'];
const COMMAND = 'python -m uvicorn backend.app:app --host 127.0.0.1 --port 8001';

export default function About() {
  const [activeStep, setActiveStep] = useState(0);
  const [filter, setFilter] = useState('All');
  const [copied, setCopied] = useState(false);
  const { mode, connection } = useBackend();
  const step = FLOW[activeStep];
  const StepIcon = step.icon;

  const changeStep = (next) => setActiveStep((next + FLOW.length) % FLOW.length);
  const onStepKeyDown = (event) => {
    let next = activeStep;
    if (event.key === 'ArrowRight') next = (activeStep + 1) % FLOW.length;
    if (event.key === 'ArrowLeft') next = (activeStep + FLOW.length - 1) % FLOW.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = FLOW.length - 1;
    if (next !== activeStep) {
      event.preventDefault();
      changeStep(next);
      window.requestAnimationFrame(() => document.getElementById(`flow-tab-${next}`)?.focus());
    }
  };
  const copyCommand = async () => {
    try { await navigator.clipboard.writeText(COMMAND); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  };

  return <MarketingShell><div className="about-page">
    <section className="about-hero"><div className="about-hero-grid" aria-hidden="true"/><div className="about-hero-inner"><div className="about-hero-copy"><span className="about-eyebrow"><Sparkles size={14}/> SYSTEM TOUR <i/> OPEN-SOURCE ROBOTICS</span><h1>Intelligence you<br/>can <span>follow.</span></h1><p>See how a sentence becomes a safe, inspectable robot action — from the first instruction to the final episode report.</p><div className="about-hero-actions"><a className="btn about-cta" href="#/console">Explore the console <ArrowRight size={16}/></a><a className="about-source" href="https://github.com/darayavahoush/CERBERUS-ARM" target="_blank" rel="noreferrer"><Code2 size={16}/> Browse the source <ArrowUpRight size={14}/></a></div></div><div className="about-status-card"><div className="about-status-head"><span><i className={mode==='mock'?'status-light online':connection.state==='online'?'status-light online':''}/>{mode==='mock'?'SAMPLE READY':connection.state==='checking'?'CHECKING RUNTIME':connection.state==='online'?'API CONNECTED':'API OFFLINE'}</span><span className="about-status-source">{mode==='live'?'LIVE':'SAMPLE'}</span></div><div className="about-status-main"><div className="status-orbit"><div><Activity size={25}/></div></div><div><b>{mode==='live'&&connection.state==='online'?(connection.status?.physics_engine||'Backend online'):'Browser simulation ready'}</b><small>{mode==='live'&&connection.state==='online'?`Inference device · ${connection.status?.device||'available'}`:mode==='live'?'Switch to Sample or start the API.':'In-browser sample mode is ready to explore.'}</small></div></div><div className="about-status-footer"><span><i className="status-dot"/> VISION</span><span><i className="status-dot purple"/> POLICY</span><span><i className="status-dot amber"/> PLANNER</span><SourceToggle/></div></div></div><div className="about-hero-foot"><span>PERCEPTION</span><i/><span>PLANNING</span><i/><span>CONTROL</span><i/><span>TELEMETRY</span></div></section>

    <section className="about-section about-flow" aria-labelledby="flow-title"><div className="about-section-head"><div><span className="about-kicker">THE SYSTEM, STEP BY STEP</span><h2 id="flow-title">Follow one request<br/>through the stack.</h2></div><p>Pick a stage to see what goes in, what the model does, and what the next stage receives.</p></div><div className="flow-explorer"><div className="flow-steps" role="tablist" aria-label="CERBERUS processing stages" onKeyDown={onStepKeyDown}>{FLOW.map((item,i)=>{const Icon=item.icon;return <button key={item.label} id={`flow-tab-${i}`} className="flow-step" role="tab" aria-selected={activeStep===i} aria-controls="flow-panel" tabIndex={activeStep===i?0:-1} style={{'--step-color':item.color}} onClick={()=>setActiveStep(i)}><span className="flow-step-number">{item.label.slice(0,2)}</span><span className="flow-step-icon"><Icon size={17}/></span><span className="flow-step-name">{item.title}</span><span className="flow-step-short">{item.short}</span></button>})}</div><article className="flow-detail" role="tabpanel" id="flow-panel" aria-labelledby={`flow-tab-${activeStep}`} key={activeStep} style={{'--step-color':step.color}}><div className="flow-detail-icon"><StepIcon size={20}/></div><span className="about-kicker">{step.label}</span><h3>{step.headline}</h3><p>{step.body}</p><div className="flow-io"><div><small>INPUT</small><b>{step.signal.replace('Input: ','')}</b></div><ArrowRight size={17}/><div><small>OUTPUT</small><b>{step.output}</b></div></div><div className="flow-detail-controls"><button className="flow-arrow" onClick={()=>changeStep(activeStep-1)} aria-label="Previous stage"><ChevronLeft size={17}/></button><span>{String(activeStep+1).padStart(2,'0')} <i>/</i> {String(FLOW.length).padStart(2,'0')}</span><button className="flow-arrow" onClick={()=>changeStep(activeStep+1)} aria-label="Next stage"><ChevronRight size={17}/></button></div></article></div></section>

    <section className="about-heads-section"><div className="about-section"><div className="about-section-head"><div><span className="about-kicker">THREE SPECIALISTS, ONE ARM</span><h2>Different jobs.<br/>Shared purpose.</h2></div><p>The heads work together but stay inspectable. Open the console to see their outputs alongside the robot’s motion.</p></div><div className="about-head-grid">{[{name:'The Eye',subtitle:'Perception',img:'head-eye',icon:Eye,color:'#42c6dd',text:'Finds the object, estimates its position and surfaces visual attention.'},{name:'The Muscle',subtitle:'Control',img:'head-muscle',icon:Zap,color:'#b39aff',text:'Selects goal-directed actions and learns from success, failure and replay.'},{name:'The Brain',subtitle:'Planning',img:'head-brain',icon:Brain,color:'#ffbd72',text:'Translates your instruction into a structured plan with safety context.'}].map((head)=><article className="about-head-card" key={head.name}><div className="about-head-art"><Img name={head.img} alt={`${head.name} ${head.subtitle} illustration`} prompt="Robotics perception, control, or planning visualization"/><span style={{'--head-color':head.color}}><head.icon size={13}/>{head.subtitle}</span></div><div className="about-head-copy"><span className="about-kicker" style={{color:head.color}}>{head.name}</span><p>{head.text}</p><a href="#/console">Inspect in console <ArrowRight size={14}/></a></div></article>)}</div></div></section>

    <section className="about-section about-stack-section"><div className="about-section-head"><div><span className="about-kicker">UNDER THE HOOD</span><h2>Built from clear,<br/>inspectable pieces.</h2></div><p>Browse the tools by role. Each layer has a focused job in the perception-to-action loop.</p></div><div className="stack-browser"><div className="stack-filters" role="group" aria-label="Filter technology stack">{FILTERS.map(item=><button key={item} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{item}<span>{item==='All'?STACK.length:STACK.filter(s=>s.group===item).length}</span></button>)}</div><div className="stack-list">{STACK.filter(item=>filter==='All'||item.group===filter).map((item,i)=><div className="stack-row" key={item.name}><span className="stack-index">{String(i+1).padStart(2,'0')}</span><div><b>{item.name}</b><small>{item.detail}</small></div><span className="stack-group">{item.group}</span><Layers size={15}/></div>)}</div></div></section>

    <section className="about-run-section"><div className="about-run-inner"><div className="about-run-copy"><span className="about-kicker">MAKE IT YOURS</span><h2>Run it locally.<br/>Make it move.</h2><p>The browser simulation works with sample data. Start the API to use the local models and physics engine, then switch the data source from the top bar.</p><div className="about-run-points"><span><Check size={15}/> Sample mode works offline</span><span><Check size={15}/> Episodes stay separate by source</span><span><Check size={15}/> Live backend status refreshes automatically</span></div><a className="about-run-link" href="#/training">Explore training & episodes <ArrowRight size={15}/></a></div><div className="about-terminal"><div className="terminal-top"><span><i/><i/><i/></span><b>BACKEND · FASTAPI</b><span className="terminal-live">8001</span></div><div className="terminal-copy"><code>{COMMAND}</code><button onClick={copyCommand} aria-label="Copy backend command">{copied?<Check size={15}/>:<Copy size={15}/>}<span>{copied?'Copied':'Copy'}</span></button></div><div className="terminal-note"><ShieldCheck size={14}/> Run from the repository root after activating its Python environment.</div></div></div></section>
    <footer className="about-footer"><span>CERBERUS-ARM · SYSTEM TOUR</span><a href="#/">Back to the overview <ArrowRight size={14}/></a></footer>
  </div></MarketingShell>;
}
