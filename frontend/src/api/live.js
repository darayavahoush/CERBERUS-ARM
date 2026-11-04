// Thin client for the FastAPI backend (backend/app.py). Same surface as api/mock.js.
export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

async function req(path, { method = 'GET', body, timeout = 15000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(path, {
      method, signal: ctl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let detail = '';
      try { detail = JSON.stringify((await res.json()).detail ?? ''); } catch { /* not json */ }
      throw new ApiError(`${res.status} ${detail || res.statusText}`.trim(), res.status);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') throw new ApiError('The backend took too long to answer.');
    throw new ApiError('Cannot reach the backend on port 8000.');
  } finally {
    clearTimeout(timer);
  }
}

export const liveApi = {
  id: 'live',
  // Any failure here means the backend is not serving; the dev proxy answers 500 when it is down.
  status: () => req('/api/status', { timeout: 6000 }).catch(() => { throw new ApiError('Cannot reach the backend on port 8000.'); }),
  reset: (body = {}) => req('/api/env/reset', { method: 'POST', body: { task_id: 1, ...body } }),
  step: (action = null) => req('/api/env/step', { method: 'POST', body: { action } }),
  plan: (instruction) => req('/api/task/plan', { method: 'POST', body: { instruction }, timeout: 60000 }),
  inspect: () => req('/api/perception/inspect', { method: 'POST' }),
  explain: (telemetry) => req('/api/explain', { method: 'POST', body: { telemetry }, timeout: 60000 }),
  train: (episodes = 5) => req(`/api/train/step?episodes=${episodes}`, { method: 'POST', timeout: 180000 }),
  benchmark: () => req('/api/benchmark', { timeout: 240000 }),
  episodes: () => req('/api/episodes'),
  recordEpisode: (episode) => req('/api/episodes', { method: 'POST', body: episode }),
  trainHistory: () => req('/api/train/history'),
};
