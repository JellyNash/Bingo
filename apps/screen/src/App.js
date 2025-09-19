import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { connectSocket } from "./lib.socket";
function useQuery() {
    return new URLSearchParams(window.location.search);
}
const Background = () => (_jsxs("div", { className: "absolute inset-0 -z-10 overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 opacity-20", style: { background: "radial-gradient(circle at 20% 20%, #22d3ee 0%, transparent 40%), radial-gradient(circle at 80% 30%, #a78bfa 0%, transparent 35%)" } }), _jsx(motion.div, { className: "absolute inset-0", animate: { backgroundPosition: ["0% 0%", "100% 100%"] }, transition: { repeat: Infinity, duration: 40, ease: "linear" }, style: { backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 10px, transparent 10px 20px)" } })] }));
const CurrentNumber = ({ value }) => (_jsxs(motion.div, { initial: { scale: 0.6, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.8, opacity: 0 }, transition: { type: "spring", stiffness: 200, damping: 20 }, className: "text-center", children: [_jsx("div", { className: "text-8xl md:text-9xl font-black tracking-wider drop-shadow-[0_0_30px_rgba(94,234,212,0.35)]", children: value ? letterFor(value) + " " + value : "—" }), _jsx("div", { className: "mt-2 text-accent/80", children: "Now Drawing" })] }, value ?? "blank"));
function letterFor(n) {
    if (n <= 15)
        return "B";
    if (n <= 30)
        return "I";
    if (n <= 45)
        return "N";
    if (n <= 60)
        return "G";
    return "O";
}
const RecentStrip = ({ recent }) => (_jsx("div", { className: "mt-8 flex justify-center gap-2 flex-wrap max-w-5xl mx-auto", children: recent.slice(-12).reverse().map((n) => (_jsx(motion.div, { initial: { y: 10, opacity: 0 }, animate: { y: 0, opacity: 1 }, className: "w-14 h-14 rounded-2xl grid place-items-center bg-white/5 border border-white/10 backdrop-blur", children: _jsxs("div", { className: "text-2xl font-semibold", children: [letterFor(n), n] }) }, n + "-" + Math.random()))) }));
const WinnerBanner = ({ show, payload, onHide }) => (_jsx(AnimatePresence, { children: show && (_jsx(motion.div, { className: "fixed inset-0 grid place-items-center bg-black/50 backdrop-blur-sm", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onHide, children: _jsxs(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, transition: { type: "spring", stiffness: 200, damping: 18 }, className: "px-10 py-8 rounded-3xl bg-white/10 border border-white/20 text-center", children: [_jsx("div", { className: "text-6xl font-extrabold text-accent drop-shadow", children: "BINGO!" }), _jsx("div", { className: "mt-3 text-xl opacity-90", children: payload?.nickname ? `Winner: ${payload.nickname}` : "Winner detected" }), payload?.pattern && _jsxs("div", { className: "mt-1 opacity-70", children: ["Pattern: ", payload.pattern] }), _jsx("div", { className: "mt-4 text-sm opacity-60", children: "(click to dismiss)" })] }) })) }));
const ReconnectingBar = ({ show }) => show ? (_jsx("div", { className: "fixed top-0 inset-x-0 text-center bg-yellow-500/20 text-yellow-200 py-1 text-sm", children: "Reconnecting\u2026" })) : null;
export default function App() {
    const q = useQuery();
    const gameId = q.get("g") ?? "42"; // allow ?g=42
    const token = q.get("token") ?? ""; // pass a JWT via ?token=...
    const [connected, setConnected] = useState(false);
    const [current, setCurrent] = useState(undefined);
    const [recent, setRecent] = useState([]);
    const [win, setWin] = useState();
    const [showWin, setShowWin] = useState(false);
    useEffect(() => {
        if (!token)
            return;
        const socket = connectSocket("/screen", token);
        socket.on("connect", () => setConnected(true));
        socket.io.on("reconnect_attempt", () => setConnected(false));
        socket.io.on("reconnect", () => setConnected(true));
        socket.on("state:update", (data) => { }); // reserved
        socket.on("draw:next", (data) => {
            setCurrent(data.value);
            setRecent((r) => [...r, data.value]);
        });
        socket.on("claim:result", (payload) => {
            setWin(payload);
            setShowWin(true);
            // auto-hide after 5s
            setTimeout(() => setShowWin(false), 5000);
        });
        // join room is handled by server via JWT {gameId}
        return () => { socket.close(); };
    }, [token, gameId]);
    // Fullscreen hotkey
    useEffect(() => {
        const onKey = (e) => {
            if (e.key.toLowerCase() === "f") {
                document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
            }
            if (e.key.toLowerCase() === "c") {
                // chroma key: toggle green bg
                document.body.classList.toggle("bg-[#00FF00]");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);
    return (_jsxs("div", { className: "relative min-h-full px-6 py-10", children: [_jsx(Background, {}), _jsx(ReconnectingBar, { show: !connected }), _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "text-center text-sm opacity-60", children: ["Game #", gameId, " \u2022 Press ", _jsx("kbd", { children: "F" }), " for Fullscreen \u2022 ", _jsx("kbd", { children: "C" }), " Chroma"] }), _jsxs("div", { className: "mt-4", children: [_jsx(AnimatePresence, { mode: "wait", children: _jsx(CurrentNumber, { value: current }, current ?? -1) }), _jsx(RecentStrip, { recent: recent })] })] }), _jsx(WinnerBanner, { show: showWin, payload: win, onHide: () => setShowWin(false) })] }));
}
