import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectConsole } from "./lib.socket";
import { apiPost } from "./lib.api";
import { motion, AnimatePresence } from "framer-motion";

type Claim = { claimId?: number; nickname?: string; pattern?: string; win?: boolean };

const Bar = ({ show, text }: { show: boolean; text: string }) =>
  show ? <div className="fixed top-0 inset-x-0 text-center bg-yellow-500/20 text-yellow-200 py-1 text-sm">{text}</div> : null;

const Pill = ({ children }: { children: React.ReactNode }) =>
  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs">{children}</span>;

export default function App() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token") ?? "";
  const gameId = params.get("g") ?? "42";

  const [connected, setConnected] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [auto, setAuto] = useState(false);
  const [intervalMs, setIntervalMs] = useState(5000);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    const s = connectConsole("/console", token);
    s.on("connect", () => setConnected(true));
    s.io.on("reconnect_attempt", () => setConnected(false));
    s.io.on("reconnect", () => setConnected(true));

    s.on("draw:next", ({ value }) => {
      setNumbers((n) => [...n, value]);
      pushLog(`Draw: ${value}`);
    });

    s.on("claim:result", (payload) => {
      // when server broadcasts resolved claims, show in a feed
      pushLog(`Claim result: ${payload.nickname ?? "?"} • ${payload.win ? "APPROVED" : "DENIED"} (${payload.pattern ?? "-"})`);
      // keep a short feed only
      setClaims((c) => [{ claimId: payload.claimId, nickname: payload.nickname, pattern: payload.pattern, win: payload.win }, ...c].slice(0, 6));
    });

    return () => {
      s.close();
    };
  }, [token]);

  function pushLog(line: string) {
    setLog((l) => [new Date().toLocaleTimeString() + "  " + line, ...l].slice(0, 12));
  }

  async function drawNext() {
    setBusy(true);
    try {
      const r = await apiPost(`/games/${gameId}/draw`, token);
      pushLog(`API draw -> ${r?.number ?? "?"}`);
    } catch (e: any) {
      pushLog(`Draw failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAuto(next: boolean) {
    setBusy(true);
    try {
      await apiPost(`/games/${gameId}/auto-draw`, token, { enabled: next, intervalMs });
      setAuto(next);
      pushLog(`Auto-draw ${next ? "ENABLED" : "DISABLED"} @ ${intervalMs}ms`);
    } catch (e: any) {
      pushLog(`Auto toggle failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function pause() {
    setBusy(true);
    try {
      await apiPost(`/games/${gameId}/pause`, token);
      pushLog(`Paused`);
    } catch (e: any) {
      pushLog(`Pause failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full p-6">
      <Bar show={!connected} text="Reconnecting…" />

      <header className="flex items-center justify-between">
        <div className="text-lg font-semibold">GameMaster Console</div>
        <div className="flex items-center gap-2">
          <Pill>Game #{gameId}</Pill>
          <Pill>{connected ? "Connected" : "Offline"}</Pill>
        </div>
      </header>

      <div className="mt-6 grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm opacity-70">Controls</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={drawNext} disabled={busy || !connected}
              className="px-4 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40">Draw Next</button>

            <button onClick={() => toggleAuto(!auto)} disabled={busy || !connected}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20">{auto ? "Disable Auto-Draw" : "Enable Auto-Draw"}</button>

            <button onClick={pause} disabled={busy || !connected}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20">Pause</button>
          </div>

          <div className="mt-4">
            <label className="text-sm opacity-70">Auto interval (ms)</label>
            <input type="range" min={2000} max={10000} step={250} value={intervalMs}
                   onChange={(e) => setIntervalMs(+e.target.value)} className="w-full" />
            <div className="text-sm opacity-70 mt-1">{intervalMs} ms</div>
          </div>
        </section>

        {/* Drawn numbers */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm opacity-70 mb-3">Recent Draws</div>
          <div className="grid grid-cols-6 gap-2">
            {numbers.slice(-24).reverse().map((n, i) => (
              <div key={i} className="h-12 rounded-xl grid place-items-center bg-card border border-white/10">
                <div className="font-semibold">{label(n)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Claims feed */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm opacity-70 mb-3">Claims (latest)</div>
          <ul className="space-y-2">
            {claims.map((c, i) => (
              <li key={i} className="p-3 rounded-xl bg-card border border-white/10">
                <div className="text-sm">{c.nickname ?? "Player"} • {c.pattern ?? "-"}</div>
                <div className={`text-xs ${c.win ? "text-emerald-300" : "text-red-300"}`}>{c.win ? "APPROVED" : "DENIED"}</div>
              </li>
            ))}
            {!claims.length && <div className="text-sm opacity-50">No claims yet</div>}
          </ul>
        </section>
      </div>

      {/* Log */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm opacity-70 mb-3">Recent Activity</div>
        <pre className="text-xs whitespace-pre-wrap opacity-80">{log.join("\n")}</pre>
      </section>

      <footer className="mt-6 text-xs opacity-60">
        Open with: <kbd>?g=42&token=&lt;JWT&gt;</kbd>
      </footer>
    </div>
  );
}

function label(n: number) {
  if (n <= 15) return `B${n}`;
  if (n <= 30) return `I${n}`;
  if (n <= 45) return `N${n}`;
  if (n <= 60) return `G${n}`;
  return `O${n}`;
}