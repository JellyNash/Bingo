import React from "react";
import ReactDOM from "react-dom/client";
import { analytics } from "../../shared/analytics";
import "./index.css";
import App from "./App";

// Initialize analytics for Big Screen Display
analytics.init({
  baseUrl: import.meta.env.VITE_API_BASE || 'http://localhost:4000',
  app: 'screen',
  env: (import.meta.env.VITE_ENV as 'offline' | 'cloud') || 'offline',
  flushInterval: 10000, // Less frequent for display-only app
  maxBatch: 20,
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED !== 'false',
  debug: import.meta.env.DEV
});

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);