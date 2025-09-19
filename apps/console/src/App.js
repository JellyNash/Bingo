import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { connectConsole } from "./lib.socket";
import { apiPost } from "./lib.api";
export default function App() {
    const [token, setToken] = useState("");
    const [connected, setConnected] = useState(false);
    const [gameState, setGameState] = useState({
        status: "lobby",
        drawnNumbers: [],
        totalPlayers: 0,
        activePlayers: 0
    });
    const [claims, setClaims] = useState([]);
    const [autoDrawInterval, setAutoDrawInterval] = useState(null);
    const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [showReconnect, setShowReconnect] = useState(false);
    const socketRef = useRef(null);
    const autoDrawRef = useRef(null);
    // Initialize socket connection
    useEffect(() => {
        if (!token)
            return;
        try {
            const socket = connectConsole("/console", token);
            socketRef.current = socket;
            socket.on("connect", () => {
                console.log("Connected to GameMaster Console");
                setConnected(true);
                setShowReconnect(false);
            });
            socket.on("disconnect", () => {
                console.log("Disconnected from GameMaster Console");
                setConnected(false);
                setShowReconnect(true);
            });
            socket.on("state:update", (data) => {
                setGameState(data);
            });
            socket.on("draw:next", (data) => {
                setGameState(prev => ({
                    ...prev,
                    currentNumber: data.value,
                    drawnNumbers: [...prev.drawnNumbers, data.value]
                }));
                setIsDrawing(false);
            });
            socket.on("claim:result", (data) => {
                if (data.nickname && data.pattern !== undefined && data.win !== undefined) {
                    const newClaim = {
                        id: data.claimId || Date.now(),
                        nickname: data.nickname,
                        pattern: data.pattern,
                        win: data.win,
                        cardId: data.cardId || 0,
                        timestamp: new Date().toLocaleTimeString()
                    };
                    setClaims(prev => [newClaim, ...prev.slice(0, 9)]); // Keep last 10 claims
                }
            });
            return () => {
                socket.disconnect();
            };
        }
        catch (error) {
            console.error("Failed to connect:", error);
            setShowReconnect(true);
        }
    }, [token]);
    // Auto-draw functionality
    useEffect(() => {
        if (autoDrawEnabled && gameState.status === "active" && connected) {
            autoDrawRef.current = setInterval(() => {
                handleDrawNext();
            }, (autoDrawInterval || 5) * 1000);
        }
        else {
            if (autoDrawRef.current) {
                clearInterval(autoDrawRef.current);
                autoDrawRef.current = null;
            }
        }
        return () => {
            if (autoDrawRef.current) {
                clearInterval(autoDrawRef.current);
            }
        };
    }, [autoDrawEnabled, autoDrawInterval, gameState.status, connected]);
    const handleDrawNext = async () => {
        if (!connected || isDrawing || gameState.status !== "active")
            return;
        setIsDrawing(true);
        try {
            await apiPost("/game/draw", token);
        }
        catch (error) {
            console.error("Failed to draw next number:", error);
            setIsDrawing(false);
        }
    };
    const handlePauseGame = async () => {
        try {
            await apiPost("/game/pause", token);
        }
        catch (error) {
            console.error("Failed to pause game:", error);
        }
    };
    const handleResumeGame = async () => {
        try {
            await apiPost("/game/resume", token);
        }
        catch (error) {
            console.error("Failed to resume game:", error);
        }
    };
    const handleStartGame = async () => {
        try {
            await apiPost("/game/start", token);
        }
        catch (error) {
            console.error("Failed to start game:", error);
        }
    };
    const handleEndGame = async () => {
        try {
            await apiPost("/game/end", token);
        }
        catch (error) {
            console.error("Failed to end game:", error);
        }
    };
    const toggleAutoDraw = () => {
        setAutoDrawEnabled(!autoDrawEnabled);
    };
    if (!token) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-card border border-white/20 rounded-xl p-8 w-full max-w-md", children: [_jsx("h1", { className: "text-2xl font-bold text-center mb-6 text-accent", children: "GameMaster Console" }), _jsxs("div", { className: "space-y-4", children: [_jsx("input", { type: "text", placeholder: "Enter JWT Token", value: token, onChange: (e) => setToken(e.target.value), className: "w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:border-accent focus:outline-none" }), _jsx("button", { onClick: () => token && setToken(token), disabled: !token, className: "w-full bg-accent text-black font-semibold py-3 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed", children: "Connect" })] })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-accent", children: "GameMaster Console" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: `flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`, children: [_jsx("div", { className: `w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}` }), connected ? 'Connected' : 'Disconnected'] }), _jsxs("div", { className: "text-sm text-white/70", children: ["Players: ", gameState.activePlayers, "/", gameState.totalPlayers] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-6", children: [_jsxs("div", { className: "bg-card border border-white/20 rounded-xl p-8 text-center", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Current Number" }), _jsx(motion.div, { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, className: "text-8xl font-bold text-accent mb-4", children: gameState.currentNumber || "--" }, gameState.currentNumber), _jsxs("div", { className: "text-sm text-white/70", children: [gameState.drawnNumbers.length, " numbers drawn"] })] }), _jsxs("div", { className: "bg-card border border-white/20 rounded-xl p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Draw Controls" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mb-6", children: [_jsx("button", { onClick: handleDrawNext, disabled: !connected || isDrawing || gameState.status !== "active", className: "bg-accent text-black font-semibold py-4 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: isDrawing ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" }), "Drawing..."] })) : ("Draw Next") }), _jsx("button", { onClick: gameState.status === "paused" ? handleResumeGame : handlePauseGame, disabled: !connected || gameState.status === "lobby" || gameState.status === "finished", className: "bg-yellow-500 text-black font-semibold py-4 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed", children: gameState.status === "paused" ? "Resume" : "Pause" })] }), _jsx("div", { className: "border-t border-white/20 pt-4", children: _jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: autoDrawEnabled, onChange: toggleAutoDraw, className: "w-4 h-4" }), _jsx("span", { children: "Auto-Draw" })] }), _jsxs("select", { value: autoDrawInterval || 5, onChange: (e) => setAutoDrawInterval(Number(e.target.value)), className: "bg-white/10 border border-white/20 rounded px-3 py-1 text-sm", children: [_jsx("option", { value: 3, children: "3s" }), _jsx("option", { value: 5, children: "5s" }), _jsx("option", { value: 10, children: "10s" }), _jsx("option", { value: 15, children: "15s" }), _jsx("option", { value: 30, children: "30s" })] })] }) })] }), _jsxs("div", { className: "bg-card border border-white/20 rounded-xl p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Game Controls" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx("button", { onClick: handleStartGame, disabled: !connected || gameState.status !== "lobby", className: "bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed", children: "Start Game" }), _jsx("button", { onClick: handleEndGame, disabled: !connected || gameState.status === "lobby" || gameState.status === "finished", className: "bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed", children: "End Game" })] })] })] }), _jsxs("div", { className: "bg-card border border-white/20 rounded-xl p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Recent Claims" }), _jsxs("div", { className: "space-y-3 max-h-96 overflow-y-auto", children: [_jsx(AnimatePresence, { children: claims.map((claim) => (_jsxs(motion.div, { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, className: `p-3 rounded-lg border ${claim.win
                                                ? 'bg-green-500/20 border-green-500/50'
                                                : 'bg-red-500/20 border-red-500/50'}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "font-semibold", children: claim.nickname }), _jsx("span", { className: "text-xs text-white/70", children: claim.timestamp })] }), _jsxs("div", { className: "text-sm text-white/80", children: ["Pattern: ", claim.pattern] }), _jsxs("div", { className: "text-xs text-white/60", children: ["Card #", claim.cardId, " \u2022 ", claim.win ? 'WINNER' : 'Invalid'] })] }, claim.id))) }), claims.length === 0 && (_jsx("div", { className: "text-center text-white/50 py-8", children: "No claims yet" }))] })] })] }), _jsxs("div", { className: "mt-6 bg-card border border-white/20 rounded-xl p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Drawn Numbers" }), _jsx("div", { className: "flex flex-wrap gap-2", children: gameState.drawnNumbers.map((number, index) => (_jsx(motion.span, { initial: { scale: 0 }, animate: { scale: 1 }, className: `w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold ${number === gameState.currentNumber
                                ? 'bg-accent text-black'
                                : 'bg-white/10 text-white/70'}`, children: number }, `${number}-${index}`))) })] }), _jsx(AnimatePresence, { children: showReconnect && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 bg-black/80 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-card border border-white/20 rounded-xl p-8 text-center", children: [_jsx("div", { className: "w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" }), _jsx("h3", { className: "text-xl font-semibold mb-2", children: "Reconnecting..." }), _jsx("p", { className: "text-white/70 mb-4", children: "Lost connection to server" }), _jsx("button", { onClick: () => window.location.reload(), className: "bg-accent text-black px-6 py-2 rounded-lg font-semibold hover:bg-accent/90", children: "Reload Page" })] }) })) }), _jsxs("div", { className: "fixed bottom-4 right-4 bg-card border border-white/20 rounded-lg p-3 text-xs", children: [_jsx("div", { className: "text-white/70 mb-2", children: "Shortcuts:" }), _jsxs("div", { className: "space-y-1 text-white/50", children: [_jsxs("div", { children: [_jsx("kbd", { children: "Space" }), " Draw Next"] }), _jsxs("div", { children: [_jsx("kbd", { children: "P" }), " Pause/Resume"] }), _jsxs("div", { children: [_jsx("kbd", { children: "A" }), " Toggle Auto-Draw"] })] })] })] }));
}
// Keyboard shortcuts
if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
        if (e.target instanceof HTMLInputElement)
            return;
        switch (e.code) {
            case "Space":
                e.preventDefault();
                // Trigger draw next
                break;
            case "KeyP":
                e.preventDefault();
                // Trigger pause/resume
                break;
            case "KeyA":
                e.preventDefault();
                // Toggle auto-draw
                break;
        }
    });
}
