// Tiny persisted stores (localStorage) for episode history and training runs.
import { useSyncExternalStore } from 'react';

function makeStore(key, limit) {
  let cache;
  const listeners = new Set();
  const read = () => {
    if (cache) return cache;
    try { cache = JSON.parse(localStorage.getItem(key)) || []; } catch { cache = []; }
    return cache;
  };
  const write = (next) => {
    cache = next.slice(-limit);
    try { localStorage.setItem(key, JSON.stringify(cache)); } catch { /* quota or private mode */ }
    listeners.forEach((l) => l());
  };
  return {
    get: read,
    add: (item) => write([...read(), item]),
    addMany: (items) => write([...read(), ...items]),
    clear: (pred) => write(pred ? read().filter((x) => !pred(x)) : []),
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
  };
}

export const episodeStore = makeStore('cerberus.episodes', 300);
export const trainStore = makeStore('cerberus.trainruns', 200);
export const useEpisodes = () => useSyncExternalStore(episodeStore.subscribe, episodeStore.get);
export const useTrainRuns = () => useSyncExternalStore(trainStore.subscribe, trainStore.get);
