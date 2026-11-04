import React from 'react';
import { Activity, BookOpenText, FlaskConical, History, Info, LayoutDashboard, Home, Server, Beaker } from 'lucide-react';
import { Link } from '../router';
import { useBackend } from '../api/BackendProvider';
import { Spinner } from './ui';

export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="7" fill="#1B2F8E" />
    <path d="M6 24 L14 12 L22 20" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="23" cy="19" r="3" fill="#F5C518" />
  </svg>
);

export function ConnectionPill() {
  const { mode, connection, retry } = useBackend();
  if (connection.state === 'checking') return <span className="pill info"><Spinner size={12} /> Checking…</span>;
  if (mode === 'mock') return <span className="pill warn" title="Running on in-browser sample data"><span className="dot" /> Sample data</span>;
  if (connection.state === 'online') return <span className="pill ok"><span className="dot" /> Backend live</span>;
  return <button className="pill bad" onClick={retry} style={{ cursor: 'pointer', background: '#fbebea' }}><span className="dot" /> Backend offline · retry</button>;
}

export function SourceToggle() {
  const { mode, setMode } = useBackend();
  return (
    <div className="seg" role="group" aria-label="Data source">
      <button aria-pressed={mode === 'mock'} onClick={() => setMode('mock')}><Beaker size={14} style={{ verticalAlign: -2 }} aria-hidden /> Sample</button>
      <button aria-pressed={mode === 'live'} onClick={() => setMode('live')}><Server size={14} style={{ verticalAlign: -2 }} aria-hidden /> Live</button>
    </div>
  );
}

const NAV = [
  ['/console', 'Console', LayoutDashboard],
  ['/training', 'Training', FlaskConical],
  ['/episodes', 'Episodes', History],
  ['/', 'Home', Home],
  ['/about', 'About', Info],
];

export function DashShell({ title, actions, children }) {
  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="brand"><Logo /> CERBERUS-ARM</Link>
        <nav className="nav" aria-label="Main">
          {NAV.map(([to, label, Icon]) => <Link key={to} to={to}><Icon size={18} aria-hidden /> {label}</Link>)}
        </nav>
        <div className="foot"><Activity size={14} aria-hidden style={{ verticalAlign: -2 }} /> Eye · Muscle · Brain</div>
      </aside>
      <div className="main">
        <div className="top">
          <h1>{title}</h1>
          <div className="end row wrap">{actions}<ConnectionPill /><SourceToggle /></div>
        </div>
        <main id="main" className="page">{children}</main>
      </div>
    </div>
  );
}

export function MarketingShell({ children }) {
  return (
    <>
      <header>
        <div className="mtop">
          <Link to="/" className="brand"><Logo /> CERBERUS-ARM</Link>
          <nav aria-label="Main"><Link to="/">Home</Link><Link to="/about">About</Link><Link to="/console">Console</Link><Link to="/training">Training</Link><Link to="/episodes">Episodes</Link></nav>
          <a className="btn primary small end" href="#/console">Open console</a>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="foot-m row wrap"><BookOpenText size={16} aria-hidden /> CERBERUS-ARM · Autonomous Robotic Manipulation with Language-Guided DRL & MuJoCo Digital Twin. <a className="end" href="https://github.com/darayavahoush/CERBERUS-ARM" target="_blank" rel="noreferrer">Source on GitHub</a></footer>
    </>
  );
}
