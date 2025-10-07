import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { connectConsole } from './lib.socket';
import {
  apiPost,
  apiSessionPost,
  bindGameMasterSession,
  fetchGameMasterSession,
  requestScreenLaunch,
} from './lib.api';
import { PinAuthForm } from './components/PinAuthForm';
import { GameControls } from './components/GameControls/GameControls';
import { PlayerRoster } from './components/PlayerRoster';
import { SoundSettingsPanel } from './components/SoundSettings/SoundSettingsPanel';
import { useAudioSettings } from './hooks/useAudioSettings';

interface ClaimEventPayload {
  claimId?: number;
  nickname?: string;
  pattern?: string;
  result?: 'approved' | 'denied';
  status?: 'approved' | 'denied';
}

interface Claim {
  claimId?: number;
  nickname?: string;
  pattern?: string;
  win?: boolean;
}

interface Player {
  id: string;
  nickname: string;
  strikes: number;
  status: string;
  joinedAt?: string;
}

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs">{children}</span>
);

function Bar({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div className="fixed top-0 inset-x-0 text-center bg-yellow-500/20 text-yellow-200 py-1 text-sm">
      {text}
    </div>
  );
}

export default function App() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const gameIdFromUrl = urlParams.get('g');

  const socketRef = useRef<ReturnType<typeof connectConsole> | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState('');
  const [screenToken, setScreenToken] = useState('');
  const [gameId, setGameId] = useState<string>(gameIdFromUrl ?? '');
  const [gamePin, setGamePin] = useState('');
  const [connected, setConnected] = useState(false);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [autoIntervalMs, setAutoIntervalMs] = useState(5000);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [view, setView] = useState<'dashboard' | 'sound-settings'>('dashboard');
  const [countdownActive, setCountdownActive] = useState(false);
  const [newPlayerJoined, setNewPlayerJoined] = useState<Player | null>(null);
  const [lastInitializedGameId, setLastInitializedGameId] = useState('');

  const pushLog = useCallback((line: string) => {
    setLog((entries) => [new Date().toLocaleTimeString() + '  ' + line, ...entries].slice(0, 14));
  }, []);

  const audioSettings = useAudioSettings(gameId || null, {
    onError: (message) => pushLog(`Audio settings error: ${message}`),
  });

  useEffect(() => {
    setNumbers([]);
    setClaims([]);
    setPlayers([]);
  }, [gameId]);

  const syncSession = useCallback(async () => {
    try {
      const session = await fetchGameMasterSession();
      setIsAuthenticated(true);
      setSessionLoaded(true);

      if (session.currentGameId) {
        setGameId(session.currentGameId);
      }

      if (session.hostToken) {
        setToken(session.hostToken);
      }

      if (session.screenToken) {
        setScreenToken(session.screenToken);
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setToken('');
      setScreenToken('');
      setSessionLoaded(true);
      if (error?.message) {
        pushLog(`Session sync failed: ${error.message}`);
      }
    }
  }, [pushLog]);

  useEffect(() => {
    syncSession();
  }, [syncSession]);

  useEffect(() => {
    if (!isAuthenticated || !sessionLoaded || !gameId) {
      return;
    }

    if (gameId === lastInitializedGameId) {
      return;
    }

    setLastInitializedGameId(gameId);
    audioSettings.refreshPacks();
    audioSettings.refreshSettings();
  }, [audioSettings, gameId, isAuthenticated, lastInitializedGameId, sessionLoaded]);

  useEffect(() => {
    if (!isAuthenticated || !sessionLoaded) {
      return;
    }

    if (gameIdFromUrl && !gameId) {
      setGameId(gameIdFromUrl);
    }

    if (gameIdFromUrl && !token) {
      bindGameMasterSession(gameIdFromUrl)
        .then(({ hostToken, screenToken: newScreenToken }) => {
          if (hostToken) {
            setToken(hostToken);
          }
          if (newScreenToken) {
            setScreenToken(newScreenToken);
          }
        })
        .catch(() => {
          pushLog(`Unable to bind session to game ${gameIdFromUrl}`);
        });
    }
  }, [gameId, gameIdFromUrl, isAuthenticated, pushLog, sessionLoaded, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = connectConsole('/console', token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      pushLog('Connected to realtime server');
    });

    socket.on('disconnect', () => setConnected(false));
    socket.io.on('reconnect_attempt', () => setConnected(false));
    socket.io.on('reconnect', () => setConnected(true));

    socket.on('draw:next', ({ value }) => {
      setNumbers((prev) => [...prev, value]);
      pushLog(`Draw: ${value}`);
    });

    socket.on('claim:result', (payload: ClaimEventPayload) => {
      const outcome = payload.result ?? payload.status;
      pushLog(`Claim result: ${payload.nickname ?? '?'} • ${outcome === 'approved' ? 'APPROVED' : 'DENIED'} (${payload.pattern ?? '-'})`);
      setClaims((current) => [
        {
          claimId: payload.claimId,
          nickname: payload.nickname,
          pattern: payload.pattern,
          win: outcome === 'approved',
        },
        ...current,
      ].slice(0, 6));
    });

    socket.on('state:update', (payload: any) => {
      if (Array.isArray(payload.drawnNumbers)) {
        setNumbers(payload.drawnNumbers);
      }
      if (Array.isArray(payload.players)) {
        setPlayers(payload.players.map((player: any) => ({
          id: player.id,
          nickname: player.nickname,
          status: player.status,
          strikes: player.strikes ?? 0,
          joinedAt: player.joinedAt,
        })));
      }
      if (typeof payload.pin === 'string') {
        setGamePin(payload.pin);
      }
      if (typeof payload.playerCount === 'number') {
        pushLog(`Players connected: ${payload.playerCount}`);
      }
      if (payload.audioSettings?.countdownEnabled !== undefined) {
        setCountdownActive(Boolean(payload.countdownState?.active));
      }
      if (payload.countdownState?.active) {
        setCountdownActive(true);
      } else {
        setCountdownActive(false);
      }
      if (typeof payload.autoDrawEnabled === 'boolean') {
        setAutoDrawEnabled(payload.autoDrawEnabled);
      }
      if (typeof payload.autoDrawIntervalMs === 'number') {
        setAutoIntervalMs(payload.autoDrawIntervalMs);
      }
    });

    socket.on('player:join', (payload: { player: any; totalCount?: number }) => {
      const player: Player = {
        id: payload.player.id,
        nickname: payload.player.nickname,
        status: payload.player.status,
        strikes: payload.player.strikes ?? 0,
        joinedAt: payload.player.joinedAt,
      };
      setPlayers((current) => {
        const others = current.filter((p) => p.id !== player.id);
        return [...others, player];
      });
      setNewPlayerJoined(player);
      pushLog(`${player.nickname} joined the game`);
      setTimeout(() => setNewPlayerJoined(null), 3000);
    });

    socket.on('player:leave', (payload: { playerId: string }) => {
      setPlayers((current) => current.filter((p) => p.id !== payload.playerId));
      pushLog(`Player left: ${payload.playerId}`);
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [pushLog, token]);

  const handleAuthSuccess = useCallback(() => {
    setAuthError('');
    syncSession().catch(() => setIsAuthenticated(true));
  }, [syncSession]);

  const handleAuthError = useCallback((message: string) => {
    setAuthError(message);
    pushLog(`Auth error: ${message}`);
  }, [pushLog]);

  const handleCreateGame = useCallback(async () => {
    setBusy(true);
    try {
      const response = await apiSessionPost('/games', {
        name: 'New Bingo Game',
        winnerLimit: 3,
        autoDrawEnabled: false,
        autoDrawInterval: 5,
      });

      const createdGame = response.game;
      const tokens = response.tokens;

      if (!createdGame?.id) {
        throw new Error('Invalid game response');
      }

      setGameId(createdGame.id);

      if (tokens?.hostToken) {
        setToken(tokens.hostToken);
      }
      if (tokens?.screenToken) {
        setScreenToken(tokens.screenToken);
      }

      await apiSessionPost(`/games/${createdGame.id}/open`);

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('g', createdGame.id);
      window.history.replaceState({}, '', newUrl.toString());

      pushLog(`Created game ${createdGame.id}`);
    } catch (error: any) {
      pushLog(`Create game failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [pushLog]);

  const handleLaunchBigScreen = useCallback(async () => {
    if (!gameId) return;
    setBusy(true);
    try {
      const { hostToken: refreshedHostToken, screenToken: refreshedScreenToken, screenUrl } = await requestScreenLaunch(gameId);
      if (refreshedHostToken) {
        setToken(refreshedHostToken);
      }
      if (refreshedScreenToken) {
        setScreenToken(refreshedScreenToken);
      }
      window.open(screenUrl, '_blank', 'noopener');
      pushLog('Launched big screen');
    } catch (error: any) {
      pushLog(`Could not launch big screen: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [gameId, pushLog]);

  const handleDrawNext = useCallback(async () => {
    if (!token || !gameId) return;
    setBusy(true);
    try {
      const response = await apiPost(`/games/${gameId}/draw`, token);
      pushLog(`API draw -> ${response?.number ?? '?'}`);
    } catch (error: any) {
      pushLog(`Draw failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [gameId, pushLog, token]);

  const handleToggleAuto = useCallback(async (next: boolean) => {
    if (!token || !gameId) return;
    setBusy(true);
    try {
      await apiPost(`/games/${gameId}/auto-draw`, token, { enabled: next, intervalMs: autoIntervalMs });
      setAutoDrawEnabled(next);
      pushLog(`Auto-draw ${next ? 'ENABLED' : 'DISABLED'} @ ${autoIntervalMs}ms`);
    } catch (error: any) {
      pushLog(`Auto toggle failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [autoIntervalMs, gameId, pushLog, token]);

  const handlePause = useCallback(async () => {
    if (!token || !gameId) return;
    setBusy(true);
    try {
      await apiPost(`/games/${gameId}/pause`, token);
      pushLog('Game paused');
    } catch (error: any) {
      pushLog(`Pause failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [gameId, pushLog, token]);

  const handlePenalty = useCallback(async (playerId: string) => {
    if (!token || !gameId) return;
    setBusy(true);
    try {
      await apiPost(`/games/${gameId}/penalty`, token, { playerId, reason: 'Manual penalty' });
      pushLog(`Penalty applied to ${playerId}`);
    } catch (error: any) {
      pushLog(`Penalty failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [gameId, pushLog, token]);

  const handleStartCountdown = useCallback(async () => {
    if (!gameId) return;
    setBusy(true);
    try {
      await apiSessionPost(`/games/${gameId}/open`, { startCountdown: true });
      pushLog('Countdown started');
      setCountdownActive(true);
    } catch (error: any) {
      pushLog(`Countdown failed: ${error?.message ?? 'unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [gameId, pushLog]);

  const handleIntervalChange = useCallback((value: number) => {
    setAutoIntervalMs(value);
    if (autoDrawEnabled && token && gameId) {
      apiPost(`/games/${gameId}/auto-draw`, token, { enabled: true, intervalMs: value })
        .then(() => pushLog(`Auto-draw interval updated to ${value}ms`))
        .catch((error: any) => pushLog(`Failed to update interval: ${error?.message ?? 'unknown error'}`));
    }
  }, [autoDrawEnabled, gameId, pushLog, token]);

  const dashboard = (
    <div className="grid lg:grid-cols-3 gap-6">
      <GameControls
        busy={busy}
        connected={connected}
        gameId={gameId}
        gamePin={gamePin}
        autoDrawEnabled={autoDrawEnabled}
        autoIntervalMs={autoIntervalMs}
        onNewGame={handleCreateGame}
        onDrawNext={handleDrawNext}
        onToggleAuto={handleToggleAuto}
        onIntervalChange={handleIntervalChange}
        onPause={handlePause}
        onLaunchScreen={handleLaunchBigScreen}
        onStartCountdown={handleStartCountdown}
        countdownActive={countdownActive}
        countdownEnabled={audioSettings.countdown.enabled}
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 lg:col-span-2">
        <header>
          <div className="text-sm text-white/70">Recent Draws</div>
        </header>
        <div className="grid grid-cols-6 gap-2">
          {numbers.slice(-24).reverse().map((n, index) => (
            <div key={`${n}-${index}`} className="h-12 rounded-xl grid place-items-center bg-white/10 border border-white/10 text-white font-medium">
              {labelNumber(n)}
            </div>
          ))}
          {numbers.length === 0 && (
            <div className="text-sm text-white/60 col-span-6 text-center py-6">
              No numbers drawn yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <header>
          <div className="text-sm text-white/70">Recent Claims</div>
        </header>
        <div className="space-y-2">
          {claims.map((claim, index) => (
            <div key={index} className="p-3 rounded-xl bg-white/10 border border-white/10">
              <div className="text-sm text-white font-medium">{claim.nickname ?? 'Player'}</div>
              <div className="text-xs text-white/50">{claim.pattern ?? '-'}</div>
              <div className={`text-xs mt-1 ${claim.win ? 'text-emerald-300' : 'text-red-300'}`}>
                {claim.win ? 'APPROVED' : 'DENIED'}
              </div>
            </div>
          ))}
          {claims.length === 0 && (
            <div className="p-4 text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl text-center">
              No claims yet.
            </div>
          )}
        </div>
      </section>

      <PlayerRoster players={players} onPenalty={handlePenalty} busy={busy} />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-3">
        <header className="text-sm text-white/70 mb-3">Recent Activity</header>
        <div className="text-xs text-white/70 whitespace-pre-wrap max-h-48 overflow-auto">
          {log.join('\n')}
        </div>
      </section>
    </div>
  );

  if (!sessionLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-white">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinAuthForm onSuccess={handleAuthSuccess} onError={handleAuthError} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Bar show={!connected} text="Reconnecting…" />

      {authError && (
        <div className="fixed top-10 inset-x-0 mx-auto max-w-lg px-4">
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-sm text-red-200 text-center">
            {authError}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">GameMaster Console</h1>
            <nav className="flex gap-2">
              <button
                onClick={() => setView('dashboard')}
                className={`px-3 py-1 rounded-lg text-sm transition ${view === 'dashboard' ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView('sound-settings')}
                className={`px-3 py-1 rounded-lg text-sm transition ${view === 'sound-settings' ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
              >
                Sound Settings
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Pill>Game ID: {gameId || '—'}</Pill>
            <Pill>PIN: {gamePin || '—'}</Pill>
            <Pill>{connected ? 'Connected' : 'Offline'}</Pill>
          </div>
        </header>

        {view === 'dashboard' ? (
          dashboard
        ) : (
          <SoundSettingsPanel
            loading={audioSettings.loading}
            error={audioSettings.error}
            musicPacks={audioSettings.musicPacks}
            sfxPacks={audioSettings.sfxPacks}
            voicePacks={audioSettings.voicePacks}
            currentMusic={audioSettings.currentMusic}
            currentSfx={audioSettings.currentSfx}
            currentVoice={audioSettings.currentVoice}
            countdown={audioSettings.countdown}
            uploadProgress={audioSettings.uploadProgress}
            onSelectMusic={audioSettings.selectMusicPack}
            onSelectSfx={audioSettings.selectSfxPack}
            onSelectVoice={audioSettings.selectVoicePack}
            onToggleCountdown={audioSettings.setCountdownEnabled}
            onCountdownDuration={audioSettings.setCountdownDuration}
            onCountdownMessage={audioSettings.setCountdownMessage}
            onUploadPack={audioSettings.uploadPack}
          />
        )}
      </main>

      <AnimatePresence>
        {newPlayerJoined && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-0 inset-x-0 flex justify-center pt-8"
          >
            <div className="px-6 py-3 rounded-2xl bg-emerald-500/90 text-white shadow-2xl border border-emerald-300/70">
              🎉 {newPlayerJoined.nickname} joined the game!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function labelNumber(n: number) {
  if (n <= 15) return `B${n}`;
  if (n <= 30) return `I${n}`;
  if (n <= 45) return `N${n}`;
  if (n <= 60) return `G${n}`;
  return `O${n}`;
}
