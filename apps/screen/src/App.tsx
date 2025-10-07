import React, { useEffect, useState, useRef } from "react";
import { connectSocket } from "./lib.socket";
import { BigScreenDisplay } from "./components/BigScreenDisplay";
import { establishScreenSession, getGameQRCode, getUrlParams, cleanUrlParams } from "./lib/api";
import { getAudioController } from "./audio/engine";
import { Player } from "./types/realtime";

interface GameState {
  gameId: string;
  pin: string;
  status: 'waiting' | 'countdown' | 'active' | 'paused' | 'completed';
  currentNumber?: number;
  drawnNumbers: number[];
  players: Player[];
  playerCount: number;
  countdownState?: {
    active: boolean;
    startedAt?: number;
    durationSeconds: number;
    message?: string;
  };
}

function mapStatus(status?: string): GameState['status'] {
  switch (status) {
    case 'COUNTDOWN':
      return 'countdown';
    case 'ACTIVE':
      return 'active';
    case 'PAUSED':
      return 'paused';
    case 'COMPLETED':
      return 'completed';
    default:
      return 'waiting';
  }
}

function normalizePlayer(data: any): Player {
  return {
    id: data?.id ?? data?.playerId ?? '',
    nickname: data?.nickname ?? 'Player',
    status: data?.status ?? 'ACTIVE',
    strikes: typeof data?.strikes === 'number' ? data.strikes : 0,
    joinedAt: data?.joinedAt ?? new Date().toISOString(),
    avatar: data?.avatar ?? null,
  };
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    gameId: '',
    pin: '',
    status: 'waiting',
    drawnNumbers: [],
    players: [],
    playerCount: 0
  });
  const [qrCode, setQrCode] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [newPlayerJoined, setNewPlayerJoined] = useState<Player | null>(null);
  const audioController = useRef(getAudioController());

  // Initialize screen and establish session
  useEffect(() => {
    const initScreen = async () => {
      try {
        const params = getUrlParams();
        const launchToken = params.get('launch');

        if (!launchToken) {
          throw new Error('No launch token provided. This screen must be launched from the console.');
        }

        // Establish session with backend
        const session = await establishScreenSession(launchToken);
        setToken(session.token);

        // Update game state with initial data
        setGameState(prev => ({
          ...prev,
          gameId: session.gameId,
        }));

        // Clean URL to remove sensitive token
        cleanUrlParams(['launch']);

        // Get QR code for the game
        // Note: We'll need to get the PIN from the game state first
        // This will be updated when we receive the state via WebSocket

        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize screen:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize screen');
        setLoading(false);
      }
    };

    initScreen();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!token || loading) return;

    const socket = connectSocket("/screen", token);

    // Connection handlers
    socket.on("connect", () => {
      console.log("Screen connected to server");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Screen disconnected from server");
      setConnected(false);
    });

    socket.io.on("reconnect_attempt", () => {
      setConnected(false);
    });

    socket.io.on("reconnect", () => {
      setConnected(true);
    });

    // Game state updates
    socket.on("state:update", (data: any) => {
      console.log("State update received:", data);
      setGameState(prev => ({
        ...prev,
        status: mapStatus(data.status),
        pin: typeof data.pin === 'string' ? data.pin : prev.pin,
        drawnNumbers: Array.isArray(data.drawnNumbers) ? data.drawnNumbers : prev.drawnNumbers,
        players: (() => {
          const roster = Array.isArray(data.playerRoster)
            ? data.playerRoster
            : Array.isArray(data.players)
              ? data.players
              : prev.players;
          return Array.isArray(roster) ? roster.map(normalizePlayer) : prev.players;
        })(),
        playerCount: typeof data.playerCount === 'number'
          ? data.playerCount
          : (Array.isArray(data.playerRoster) ? data.playerRoster.length : prev.playerCount),
        countdownState: (() => {
          if (data.countdownState) {
            const durationSeconds = typeof data.countdownState.durationSeconds === 'number'
              ? data.countdownState.durationSeconds
              : prev.countdownState?.durationSeconds ?? 0;

            return {
              active: Boolean(data.countdownState.active),
              startedAt: data.countdownState.startedAt ? new Date(data.countdownState.startedAt).getTime() : undefined,
              durationSeconds,
              message: data.countdownState.message ?? prev.countdownState?.message,
            };
          }

          return prev.countdownState;
        })(),
      }));

      // If we got a PIN and don't have QR code yet, fetch it
      if (data.pin && !qrCode) {
        getGameQRCode(data.pin)
          .then(qr => setQrCode(qr))
          .catch(err => console.error('Failed to get QR code:', err));
      }

      // Handle status changes with audio cues
      if (data.status && mapStatus(data.status) !== gameState.status) {
        const newStatus = mapStatus(data.status);
        switch (newStatus) {
          case 'waiting':
            audioController.current.handleMediaCue('music:lobby');
            break;
          case 'countdown':
            audioController.current.handleMediaCue('music:countdown');
            audioController.current.handleMediaCue('voice:countdown');
            break;
          case 'active':
            audioController.current.handleMediaCue('music:game');
            audioController.current.handleMediaCue('sfx:game:start');
            break;
          case 'paused':
            audioController.current.handleMediaCue('sfx:game:pause');
            break;
          case 'completed':
            audioController.current.handleMediaCue('sfx:game:complete');
            break;
        }
      }
    });

    // Handle player join events
    (socket as any).on("player:join", (data: { player: any; totalCount?: number }) => {
      const joinedPlayer = normalizePlayer(data.player);
      console.log("Player joined:", joinedPlayer);
      setGameState(prev => {
        const existing = prev.players.filter(p => p.id !== joinedPlayer.id);
        const updatedPlayers = [...existing, joinedPlayer];
        return {
          ...prev,
          players: updatedPlayers,
          playerCount: typeof data.totalCount === 'number' ? data.totalCount : updatedPlayers.length,
        };
      });

      setNewPlayerJoined(joinedPlayer);
      audioController.current.handleMediaCue('sfx:player:join');

      setTimeout(() => {
        setNewPlayerJoined(null);
      }, 3000);
    });

    // Handle player leave events
    (socket as any).on("player:leave", (data: { playerId: string; totalCount?: number }) => {
      console.log("Player left:", data.playerId);
      setGameState(prev => ({
        ...prev,
        players: prev.players.filter(p => p.id !== data.playerId),
        playerCount: typeof data.totalCount === 'number' ? data.totalCount : Math.max(prev.playerCount - 1, 0)
      }));

      audioController.current.handleMediaCue('sfx:player:leave');
    });

    // Handle new number draws
    socket.on("draw:next", (data: { value: number; letter?: string }) => {
      console.log("New number drawn:", data.value);
      setGameState(prev => ({
        ...prev,
        currentNumber: data.value,
        drawnNumbers: [...prev.drawnNumbers, data.value]
      }));

      // Play number draw sound
      audioController.current.handleMediaCue('sfx:number:draw');
    });

    // Handle direct media cue events from server
    (socket as any).on("media:cue", (data: { type: string; packId?: string; cueKey?: string; volume?: number; fadeInMs?: number }) => {
      console.log("Media cue received:", data);
      audioController.current.handleMediaCue(data.type, data.volume, data.fadeInMs);
    });

    // Request initial state
    return () => {
      socket.close();
    };
  }, [token, loading, gameState.gameId, qrCode]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-3xl font-bold mb-4">Initializing Big Screen...</div>
          <div className="text-lg opacity-70">Please wait</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 max-w-md">
          <div className="text-red-300 text-xl font-bold mb-2">Screen Initialization Failed</div>
          <div className="text-white">{error}</div>
          <div className="text-sm text-gray-400 mt-4">
            This screen must be launched from the game console with a valid token.
          </div>
        </div>
      </div>
    );
  }

  // Disconnected warning banner
  const DisconnectedBanner = () => {
    if (connected) return null;
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-600/90 text-white px-4 py-2 text-center z-50">
        <div className="font-semibold">Connection Lost - Attempting to reconnect...</div>
      </div>
    );
  };

  // Handle new player dismissal
  const handleNewPlayerDismissed = () => {
    setNewPlayerJoined(null);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioController.current.dispose();
    };
  }, []);

  // Main display
  return (
    <>
      <DisconnectedBanner />
      <BigScreenDisplay
        gamePin={gameState.pin}
        currentNumber={gameState.currentNumber}
        recentNumbers={gameState.drawnNumbers}
        playerCount={gameState.playerCount}
        gameStatus={gameState.status}
        qrCodeUrl={qrCode}
        players={gameState.players}
        countdownState={gameState.countdownState}
        newPlayerJoined={newPlayerJoined}
        onNewPlayerDismissed={handleNewPlayerDismissed}
      />
    </>
  );
}
