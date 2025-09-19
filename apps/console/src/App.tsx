import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { connectConsole, ServerToClientEvents } from "./lib.socket";
import { apiPost } from "./lib.api";
import type { Socket } from "socket.io-client";

interface GameState {
  status: "lobby" | "active" | "paused" | "finished";
  currentNumber?: number;
  drawnNumbers: number[];
  totalPlayers: number;
  activePlayers: number;
}

interface Claim {
  id: number;
  nickname: string;
  pattern: string;
  win: boolean;
  cardId: number;
  timestamp: string;
}

export default function App() {
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    status: "lobby",
    drawnNumbers: [],
    totalPlayers: 0,
    activePlayers: 0
  });
  const [claims, setClaims] = useState<Claim[]>([]);
  const [autoDrawInterval, setAutoDrawInterval] = useState<number | null>(null);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);

  const socketRef = useRef<Socket<ServerToClientEvents> | null>(null);
  const autoDrawRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!token) return;

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
          const newClaim: Claim = {
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
    } catch (error) {
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
    } else {
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
    if (!connected || isDrawing || gameState.status !== "active") return;

    setIsDrawing(true);
    try {
      await apiPost("/game/draw", token);
    } catch (error) {
      console.error("Failed to draw next number:", error);
      setIsDrawing(false);
    }
  };

  const handlePauseGame = async () => {
    try {
      await apiPost("/game/pause", token);
    } catch (error) {
      console.error("Failed to pause game:", error);
    }
  };

  const handleResumeGame = async () => {
    try {
      await apiPost("/game/resume", token);
    } catch (error) {
      console.error("Failed to resume game:", error);
    }
  };

  const handleStartGame = async () => {
    try {
      await apiPost("/game/start", token);
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  const handleEndGame = async () => {
    try {
      await apiPost("/game/end", token);
    } catch (error) {
      console.error("Failed to end game:", error);
    }
  };

  const toggleAutoDraw = () => {
    setAutoDrawEnabled(!autoDrawEnabled);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-white/20 rounded-xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6 text-accent">
            GameMaster Console
          </h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter JWT Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => token && setToken(token)}
              disabled={!token}
              className="w-full bg-accent text-black font-semibold py-3 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-accent">GameMaster Console</h1>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="text-sm text-white/70">
            Players: {gameState.activePlayers}/{gameState.totalPlayers}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Number Display */}
          <div className="bg-card border border-white/20 rounded-xl p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">Current Number</h2>
            <motion.div
              key={gameState.currentNumber}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-8xl font-bold text-accent mb-4"
            >
              {gameState.currentNumber || "--"}
            </motion.div>
            <div className="text-sm text-white/70">
              {gameState.drawnNumbers.length} numbers drawn
            </div>
          </div>

          {/* Draw Controls */}
          <div className="bg-card border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Draw Controls</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={handleDrawNext}
                disabled={!connected || isDrawing || gameState.status !== "active"}
                className="bg-accent text-black font-semibold py-4 rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDrawing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Drawing...
                  </>
                ) : (
                  "Draw Next"
                )}
              </button>

              <button
                onClick={gameState.status === "paused" ? handleResumeGame : handlePauseGame}
                disabled={!connected || gameState.status === "lobby" || gameState.status === "finished"}
                className="bg-yellow-500 text-black font-semibold py-4 rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gameState.status === "paused" ? "Resume" : "Pause"}
              </button>
            </div>

            {/* Auto Draw */}
            <div className="border-t border-white/20 pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDrawEnabled}
                    onChange={toggleAutoDraw}
                    className="w-4 h-4"
                  />
                  <span>Auto-Draw</span>
                </label>
                <select
                  value={autoDrawInterval || 5}
                  onChange={(e) => setAutoDrawInterval(Number(e.target.value))}
                  className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm"
                >
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                </select>
              </div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="bg-card border border-white/20 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Game Controls</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleStartGame}
                disabled={!connected || gameState.status !== "lobby"}
                className="bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Game
              </button>

              <button
                onClick={handleEndGame}
                disabled={!connected || gameState.status === "lobby" || gameState.status === "finished"}
                className="bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                End Game
              </button>
            </div>
          </div>
        </div>

        {/* Claims Feed */}
        <div className="bg-card border border-white/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Claims</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {claims.map((claim) => (
                <motion.div
                  key={claim.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`p-3 rounded-lg border ${
                    claim.win
                      ? 'bg-green-500/20 border-green-500/50'
                      : 'bg-red-500/20 border-red-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{claim.nickname}</span>
                    <span className="text-xs text-white/70">{claim.timestamp}</span>
                  </div>
                  <div className="text-sm text-white/80">
                    Pattern: {claim.pattern}
                  </div>
                  <div className="text-xs text-white/60">
                    Card #{claim.cardId} • {claim.win ? 'WINNER' : 'Invalid'}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {claims.length === 0 && (
              <div className="text-center text-white/50 py-8">
                No claims yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawn Numbers */}
      <div className="mt-6 bg-card border border-white/20 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Drawn Numbers</h2>
        <div className="flex flex-wrap gap-2">
          {gameState.drawnNumbers.map((number, index) => (
            <motion.span
              key={`${number}-${index}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-semibold ${
                number === gameState.currentNumber
                  ? 'bg-accent text-black'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {number}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Reconnection Overlay */}
      <AnimatePresence>
        {showReconnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <div className="bg-card border border-white/20 rounded-xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Reconnecting...</h3>
              <p className="text-white/70 mb-4">Lost connection to server</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-accent text-black px-6 py-2 rounded-lg font-semibold hover:bg-accent/90"
              >
                Reload Page
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts */}
      <div className="fixed bottom-4 right-4 bg-card border border-white/20 rounded-lg p-3 text-xs">
        <div className="text-white/70 mb-2">Shortcuts:</div>
        <div className="space-y-1 text-white/50">
          <div><kbd>Space</kbd> Draw Next</div>
          <div><kbd>P</kbd> Pause/Resume</div>
          <div><kbd>A</kbd> Toggle Auto-Draw</div>
        </div>
      </div>
    </div>
  );
}

// Keyboard shortcuts
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;

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