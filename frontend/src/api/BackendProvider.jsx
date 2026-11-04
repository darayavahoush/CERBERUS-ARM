import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createMockBackend } from './mock';
import { liveApi } from './live';

const Ctx = createContext(null);
export const useBackend = () => useContext(Ctx);

const KEY = 'cerberus.mode';
const initialMode = () => {
  try { return localStorage.getItem(KEY) || import.meta.env.VITE_BACKEND_MODE || 'mock'; } catch { return 'mock'; }
};

// mode: 'mock' (in-browser) | 'live' (FastAPI). connection describes the active source.
export function BackendProvider({ children }) {
  const [mode, setModeState] = useState(initialMode);
  const mockRef = useRef(null);
  if (!mockRef.current) mockRef.current = createMockBackend();
  const api = mode === 'live' ? liveApi : mockRef.current;

  const [connection, setConnection] = useState({ state: 'checking', status: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setConnection((c) => ({ ...c, state: 'checking', error: null }));
    api.status()
      .then((status) => !cancelled && setConnection({ state: 'online', status, error: null }))
      .catch((e) => !cancelled && setConnection({ state: 'offline', status: null, error: e.message }));
    return () => { cancelled = true; };
  }, [api, tick]);

  // While live, re-check every 10s so a dropped backend shows up without a click
  useEffect(() => {
    if (mode !== 'live') return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, [mode]);

  const setMode = useCallback((m) => {
    try { localStorage.setItem(KEY, m); } catch { /* storage unavailable */ }
    setModeState(m);
  }, []);

  const value = useMemo(() => ({
    mode, setMode, api, connection, retry: () => setTick((t) => t + 1), refreshStatus: () => setTick((t) => t + 1),
  }), [mode, setMode, api, connection]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
