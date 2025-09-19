import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { connectConsole } from "./lib.socket";
import { apiPost } from "./lib.api";
const Bar = ({ show, text }) => show ? _jsx("div", { className: "fixed top-0 inset-x-0 text-center bg-yellow-500/20 text-yellow-200 py-1 text-sm", children: text }) : null;
const Pill = ({ children }) => _jsx("span", { className: "px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs", children: children });
export default function App() {
    const params = new URLSearchParams(location.search);
    const token = params.get("token") ?? "";
    const gameId = params.get("g") ?? "42";
    const [connected, setConnected] = useState(false);
    const [numbers, setNumbers] = useState([]);
    const [claims, setClaims] = useState([]);
    const [auto, setAuto] = useState(false);
    const [intervalMs, setIntervalMs] = useState(5000);
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState([]);
    useEffect(() => {
        if (!token)
            return;
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
    function pushLog(line) {
        setLog((l) => [new Date().toLocaleTimeString() + "  " + line, ...l].slice(0, 12));
    }
    async function drawNext() {
        setBusy(true);
        try {
            const r = await apiPost(`/games/${gameId}/draw`, token);
            pushLog(`API draw -> ${r?.number ?? "?"}`);
        }
        catch (e) {
            pushLog(`Draw failed: ${e.message}`);
        }
        finally {
            setBusy(false);
        }
    }
    async function toggleAuto(next) {
        setBusy(true);
        try {
            await apiPost(`/games/${gameId}/auto-draw`, token, { enabled: next, intervalMs });
            setAuto(next);
            pushLog(`Auto-draw ${next ? "ENABLED" : "DISABLED"} @ ${intervalMs}ms`);
        }
        catch (e) {
            pushLog(`Auto toggle failed: ${e.message}`);
        }
        finally {
            setBusy(false);
        }
    }
    async function pause() {
        setBusy(true);
        try {
            await apiPost(`/games/${gameId}/pause`, token);
            pushLog(`Paused`);
        }
        catch (e) {
            pushLog(`Pause failed: ${e.message}`);
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs("div", { className: "min-h-full p-6", children: [_jsx(Bar, { show: !connected, text: "Reconnecting\u2026" }), _jsxs("header", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-lg font-semibold", children: "GameMaster Console" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Pill, { children: ["Game #", gameId] }), _jsx(Pill, { children: connected ? "Connected" : "Offline" })] })] }), _jsxs("div", { className: "mt-6 grid lg:grid-cols-3 gap-6", children: [_jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsx("div", { className: "text-sm opacity-70", children: "Controls" }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [_jsx("button", { onClick: drawNext, disabled: busy || !connected, className: "px-4 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40", children: "Draw Next" }), _jsx("button", { onClick: () => toggleAuto(!auto), disabled: busy || !connected, className: "px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20", children: auto ? "Disable Auto-Draw" : "Enable Auto-Draw" }), _jsx("button", { onClick: pause, disabled: busy || !connected, className: "px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20", children: "Pause" })] }), _jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "text-sm opacity-70", children: "Auto interval (ms)" }), _jsx("input", { type: "range", min: 2000, max: 10000, step: 250, value: intervalMs, onChange: (e) => setIntervalMs(+e.target.value), className: "w-full" }), _jsxs("div", { className: "text-sm opacity-70 mt-1", children: [intervalMs, " ms"] })] })] }), _jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsx("div", { className: "text-sm opacity-70 mb-3", children: "Recent Draws" }), _jsx("div", { className: "grid grid-cols-6 gap-2", children: numbers.slice(-24).reverse().map((n, i) => (_jsx("div", { className: "h-12 rounded-xl grid place-items-center bg-card border border-white/10", children: _jsx("div", { className: "font-semibold", children: label(n) }) }, i))) })] }), _jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsx("div", { className: "text-sm opacity-70 mb-3", children: "Claims (latest)" }), _jsxs("ul", { className: "space-y-2", children: [claims.map((c, i) => (_jsxs("li", { className: "p-3 rounded-xl bg-card border border-white/10", children: [_jsxs("div", { className: "text-sm", children: [c.nickname ?? "Player", " \u2022 ", c.pattern ?? "-"] }), _jsx("div", { className: `text-xs ${c.win ? "text-emerald-300" : "text-red-300"}`, children: c.win ? "APPROVED" : "DENIED" })] }, i))), !claims.length && _jsx("div", { className: "text-sm opacity-50", children: "No claims yet" })] })] })] }), _jsxs("section", { className: "mt-6 rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsx("div", { className: "text-sm opacity-70 mb-3", children: "Recent Activity" }), _jsx("pre", { className: "text-xs whitespace-pre-wrap opacity-80", children: log.join("\n") })] }), _jsxs("footer", { className: "mt-6 text-xs opacity-60", children: ["Open with: ", _jsx("kbd", { children: "?g=42&token=<JWT>" })] })] }));
}
function label(n) {
    if (n <= 15)
        return `B${n}`;
    if (n <= 30)
        return `I${n}`;
    if (n <= 45)
        return `N${n}`;
    if (n <= 60)
        return `G${n}`;
    return `O${n}`;
}
