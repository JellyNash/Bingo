import React from "react";
import ReactDOM from "react-dom/client";
import { analytics } from "../../shared/analytics";
import "./index.css";
import App from "./App";

// Initialize analytics for GameMaster Console
analytics.init({
  baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
  app: 'console',
  env: (import.meta.env.VITE_ENV as 'offline' | 'cloud') || 'offline',
  flushInterval: 5000,
  maxBatch: 30,
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
  debug: import.meta.env.DEV
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);