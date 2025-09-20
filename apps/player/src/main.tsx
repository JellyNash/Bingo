import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Join from './pages/Join';
import Card from './pages/Card';
import './index.css';
// Note: Service worker registration handled by VitePWA plugin

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