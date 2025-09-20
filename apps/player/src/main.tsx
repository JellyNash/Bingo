import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Join from './pages/Join';
import Card from './pages/Card';
import { analytics } from '../../shared/analytics';
import './index.css';
// Note: Service worker registration handled by VitePWA plugin

// Initialize analytics
analytics.init({
  baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
  app: 'player',
  env: (import.meta.env.VITE_ENV as 'offline' | 'cloud') || 'offline',
  flushInterval: 5000,
  maxBatch: 40,
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
  debug: import.meta.env.DEV
});

// Track PWA installation
if ('serviceWorker' in navigator) {
  window.addEventListener('appinstalled', () => {
    analytics.track('pwa.install', {});
  });
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App><Join /></App>
  },
  {
    path: '/card',
    element: <App><Card onLogout={() => window.location.href = '/'} /></App>
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);