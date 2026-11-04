import React, { lazy, Suspense } from 'react';
import { BackendProvider } from './api/BackendProvider';
import { SimProvider } from './lib/SimProvider';
import { useRoute } from './router';
import { DashShell } from './components/Shell';
import { EmptyState } from './components/ui';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Console = lazy(() => import('./pages/Console'));
const Training = lazy(() => import('./pages/Training'));
const Episodes = lazy(() => import('./pages/Episodes'));

const ROUTES = { '/': Home, '/about': About, '/console': Console, '/training': Training, '/episodes': Episodes };

export default function App() {
  const path = useRoute();
  const Page = ROUTES[path];
  return (
    <BackendProvider>
      <SimProvider>
        <a className="skip" href="#main">Skip to content</a>
        {Page ? <Suspense fallback={<div className="route-loading" role="status">Loading page…</div>}><Page /></Suspense> : <DashShell title="Not found"><EmptyState title="That page doesn’t exist" body="Check the address, or head back to the console." action={<a className="btn primary" href="#/console">Open console</a>} /></DashShell>}
      </SimProvider>
    </BackendProvider>
  );
}
