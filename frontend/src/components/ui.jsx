import React, { useState } from 'react';
import { AlertTriangle, Inbox, Loader2, WifiOff } from 'lucide-react';

export const Panel = ({ title, icon: Icon, actions, children, className = '', bodyClass = 'body' }) => (
  <section className={`panel ${className}`}>
    {(title || actions) && (
      <header>{Icon && <Icon size={18} aria-hidden />}<h3>{title}</h3><div className="end row">{actions}</div></header>
    )}
    <div className={bodyClass}>{children}</div>
  </section>
);

export const Stat = ({ label, value, hint }) => (
  <div className="panel stat"><div className="num v">{value}</div><div className="l">{label}</div>{hint && <div className="faint" style={{ fontSize: 12.5 }}>{hint}</div>}</div>
);

export const Spinner = ({ size = 16 }) => <Loader2 size={size} className="spin" aria-hidden />;

export const Skeleton = ({ h = 16, w = '100%' }) => <div className="skel" style={{ height: h, width: w }} aria-hidden />;

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="banner bad" role="alert">
      <AlertTriangle size={18} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
      <div className="grow"><strong>{title}</strong><div>{message}</div></div>
      {onRetry && <button className="btn small" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: '36px 18px' }}>
      <Inbox size={30} aria-hidden style={{ color: 'var(--ink-3)' }} />
      <h3>{title}</h3><p className="muted" style={{ maxWidth: '44ch' }}>{body}</p>{action}
    </div>
  );
}

export function DisconnectedState({ mode, error, onRetry, onUseMock }) {
  return (
    <div className="banner warn" role="alert">
      <WifiOff size={18} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
      <div className="grow">
        <strong>{mode === 'live' ? 'Backend is not reachable' : 'Data source unavailable'}</strong>
        <div>{error || 'Start it with “uvicorn backend.app:app --port 8001”, or switch to sample data.'}</div>
      </div>
      <div className="row wrap"><button className="btn small" onClick={onRetry}>Retry</button>{onUseMock && <button className="btn small primary" onClick={onUseMock}>Use sample data</button>}</div>
    </div>
  );
}

// Image slot: shows /images/<name>.webp|png|jpg, falls back to a labelled placeholder.
// `prompt` is the brief for the image generator (see docs/IMAGE_PROMPTS.md).
export function Img({ name, alt, prompt, ratio = '4 / 3', priority = false }) {
  const exts = ['webp', 'png', 'jpg'];
  const [i, setI] = useState(0);
  if (i >= exts.length) {
    return (
      <div className="placeholder" style={{ aspectRatio: ratio }} role="img" aria-label={alt}>
        <div><strong>{name}</strong><br />Image goes here<br /><span style={{ fontSize: 12 }}>{prompt}</span></div>
      </div>
    );
  }
  return <img src={`/images/${name}.${exts[i]}`} alt={alt} loading={priority ? 'eager' : 'lazy'} onError={() => setI(i + 1)} style={{ aspectRatio: ratio, width: '100%', objectFit: 'cover', display: 'block' }} />;
}

export const ago = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
};
