import React, { useEffect, useRef, useState } from 'react';
import Stage from './Stage';
import { createMockBackend } from '../api/mock';

const SCRIPT = [
  'Sort the red micro-module into Bay A (SMT Staging)',
  'Route the blue quartz lens to Bay B (AOI Inspection)',
  'Transfer the green optical prism into Bay C (Cleanroom QA)',
  'Safely route the amber sensor hub into Bay B avoiding the laser spindle',
];

// Self-contained looping demo: always runs on the in-browser sample backend.
export default function HeroDemo() {
  const [obs, setObs] = useState(null);
  const [trail, setTrail] = useState([]);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState('Planning');
  const still = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const api = createMockBackend(11);
    let dead = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      let i = 0;
      while (!dead) {
        const text = SCRIPT[i % SCRIPT.length]; i += 1;
        setStatus('Reading instruction'); setTrail([]);
        const planned = await api.plan(text);
        if (dead) return;
        setObs(planned.observation);
        if (still.current) { setTyped(text); setStatus('Paused (reduced motion)'); return; }
        for (let c = 1; c <= text.length && !dead; c += 1) { setTyped(text.slice(0, c)); await sleep(22); }
        await sleep(350); setStatus('Moving');
        let r;
        do {
          r = await api.step(null);
          if (dead) return;
          setObs(r.observation); setTrail((t) => [...t, r.observation.fk.ee].slice(-50));
          await sleep(55);
        } while (!r.terminated && !r.truncated);
        setStatus(r.info.is_success ? 'Placed' : 'Stopped');
        await sleep(1800);
      }
    })();
    return () => { dead = true; };
  }, []);

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="cmd" aria-live="off"><span style={{ opacity: .6 }}>Instruction</span><span className="grow">{typed}<span className="cursor" aria-hidden /></span><span className="pill" style={{ color: '#f5c518', fontSize: 12 }}>{status}</span></div>
      {obs && <Stage observation={obs} obstacles={[]} trail={trail} label="Looping demo of the arm picking an object and placing it in a bay" />}
      <p className="faint" style={{ fontSize: 12.5 }}>Live demo running in your browser on sample data.</p>
    </div>
  );
}
