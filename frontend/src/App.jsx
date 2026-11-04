import React from 'react';
import { BackendProvider } from './api/BackendProvider';
import { SimProvider } from './lib/SimProvider';
import { useRoute } from './router';
import Home from './pages/Home';
import About from './pages/About';
import Console from './pages/Console';
import Training from './pages/Training';
import Episodes from './pages/Episodes';
import { DashShell } from './components/Shell';
import { EmptyState } from './components/ui';

const ROUTES = { '/': Home, '/about': About, '/console': Console, '/training': Training, '/episodes': Episodes };

export default function App() {
  const path = useRoute();
  const Page = ROUTES[path];
  return (
    <BackendProvider>
      <SimProvider>
        <a className="skip" href="#main">Skip to content</a>
        {Page ? <Page /> : <DashShell title="Not found"><EmptyState title="That page doesn’t exist" body="Check the address, or head back to the console." action={<a className="btn primary" href="#/console">Open console</a>} /></DashShell>}
      </SimProvider>
    </BackendProvider>
  );
}
