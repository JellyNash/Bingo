import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { connectConsole } from './lib.socket';
import { apiPost, apiSessionPost, bindGameMasterSession, fetchGameMasterSession, requestScreenLaunch, } from './lib.api';
import { PinAuthForm } from './components/PinAuthForm';
import { GameControls } from './components/GameControls/GameControls';
import { PlayerRoster } from './components/PlayerRoster';
import { SoundSettingsPanel } from './components/SoundSettings/SoundSettingsPanel';
import { useAudioSettings } from './hooks/useAudioSettings';
const Pill = ({ children }) => (_jsx("span", { className: "px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs", children: children }));
function Bar({ show, text }) {
    if (!show)
        return null;
    return (_jsx("div", { className: "fixed top-0 inset-x-0 text-center bg-yellow-500/20 text-yellow-200 py-1 text-sm", children: text }));
}
export default function App() {
    const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const gameIdFromUrl = urlParams.get('g');
    const socketRef = useRef(null);
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [token, setToken] = useState('');
    const [screenToken, setScreenToken] = useState('');
    const [gameId, setGameId] = useState(gameIdFromUrl ?? '');
    const [gamePin, setGamePin] = useState('');
    const [connected, setConnected] = useState(false);
    const [numbers, setNumbers] = useState([]);
    const [claims, setClaims] = useState([]);
    const [players, setPlayers] = useState([]);
    const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
    const [autoIntervalMs, setAutoIntervalMs] = useState(5000);
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState([]);
    const [view, setView] = useState('dashboard');
    const [countdownActive, setCountdownActive] = useState(false);
    const [newPlayerJoined, setNewPlayerJoined] = useState(null);
    const [lastInitializedGameId, setLastInitializedGameId] = useState('');
    const pushLog = useCallback((line) => {
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
        }
        catch (error) {
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
        socket.on('claim:result', (payload) => {
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
        socket.on('state:update', (payload) => {
            if (Array.isArray(payload.drawnNumbers)) {
                setNumbers(payload.drawnNumbers);
            }
            if (Array.isArray(payload.players)) {
                setPlayers(payload.players.map((player) => ({
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
            }
            else {
                setCountdownActive(false);
            }
            if (typeof payload.autoDrawEnabled === 'boolean') {
                setAutoDrawEnabled(payload.autoDrawEnabled);
            }
            if (typeof payload.autoDrawIntervalMs === 'number') {
                setAutoIntervalMs(payload.autoDrawIntervalMs);
            }
        });
        socket.on('player:join', (payload) => {
            const player = {
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
        socket.on('player:leave', (payload) => {
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
    const handleAuthError = useCallback((message) => {
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
        }
        catch (error) {
            pushLog(`Create game failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [pushLog]);
    const handleLaunchBigScreen = useCallback(async () => {
        if (!gameId)
            return;
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
        }
        catch (error) {
            pushLog(`Could not launch big screen: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [gameId, pushLog]);
    const handleDrawNext = useCallback(async () => {
        if (!token || !gameId)
            return;
        setBusy(true);
        try {
            const response = await apiPost(`/games/${gameId}/draw`, token);
            pushLog(`API draw -> ${response?.number ?? '?'}`);
        }
        catch (error) {
            pushLog(`Draw failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [gameId, pushLog, token]);
    const handleToggleAuto = useCallback(async (next) => {
        if (!token || !gameId)
            return;
        setBusy(true);
        try {
            await apiPost(`/games/${gameId}/auto-draw`, token, { enabled: next, intervalMs: autoIntervalMs });
            setAutoDrawEnabled(next);
            pushLog(`Auto-draw ${next ? 'ENABLED' : 'DISABLED'} @ ${autoIntervalMs}ms`);
        }
        catch (error) {
            pushLog(`Auto toggle failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [autoIntervalMs, gameId, pushLog, token]);
    const handlePause = useCallback(async () => {
        if (!token || !gameId)
            return;
        setBusy(true);
        try {
            await apiPost(`/games/${gameId}/pause`, token);
            pushLog('Game paused');
        }
        catch (error) {
            pushLog(`Pause failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [gameId, pushLog, token]);
    const handlePenalty = useCallback(async (playerId) => {
        if (!token || !gameId)
            return;
        setBusy(true);
        try {
            await apiPost(`/games/${gameId}/penalty`, token, { playerId, reason: 'Manual penalty' });
            pushLog(`Penalty applied to ${playerId}`);
        }
        catch (error) {
            pushLog(`Penalty failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [gameId, pushLog, token]);
    const handleStartCountdown = useCallback(async () => {
        if (!gameId)
            return;
        setBusy(true);
        try {
            await apiSessionPost(`/games/${gameId}/open`, { startCountdown: true });
            pushLog('Countdown started');
            setCountdownActive(true);
        }
        catch (error) {
            pushLog(`Countdown failed: ${error?.message ?? 'unknown error'}`);
        }
        finally {
            setBusy(false);
        }
    }, [gameId, pushLog]);
    const handleIntervalChange = useCallback((value) => {
        setAutoIntervalMs(value);
        if (autoDrawEnabled && token && gameId) {
            apiPost(`/games/${gameId}/auto-draw`, token, { enabled: true, intervalMs: value })
                .then(() => pushLog(`Auto-draw interval updated to ${value}ms`))
                .catch((error) => pushLog(`Failed to update interval: ${error?.message ?? 'unknown error'}`));
        }
    }, [autoDrawEnabled, gameId, pushLog, token]);
    const dashboard = (_jsxs("div", { className: "grid lg:grid-cols-3 gap-6", children: [_jsx(GameControls, { busy: busy, connected: connected, gameId: gameId, gamePin: gamePin, autoDrawEnabled: autoDrawEnabled, autoIntervalMs: autoIntervalMs, onNewGame: handleCreateGame, onDrawNext: handleDrawNext, onToggleAuto: handleToggleAuto, onIntervalChange: handleIntervalChange, onPause: handlePause, onLaunchScreen: handleLaunchBigScreen, onStartCountdown: handleStartCountdown, countdownActive: countdownActive, countdownEnabled: audioSettings.countdown.enabled }), _jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 lg:col-span-2", children: [_jsx("header", { children: _jsx("div", { className: "text-sm text-white/70", children: "Recent Draws" }) }), _jsxs("div", { className: "grid grid-cols-6 gap-2", children: [numbers.slice(-24).reverse().map((n, index) => (_jsx("div", { className: "h-12 rounded-xl grid place-items-center bg-white/10 border border-white/10 text-white font-medium", children: labelNumber(n) }, `${n}-${index}`))), numbers.length === 0 && (_jsx("div", { className: "text-sm text-white/60 col-span-6 text-center py-6", children: "No numbers drawn yet." }))] })] }), _jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3", children: [_jsx("header", { children: _jsx("div", { className: "text-sm text-white/70", children: "Recent Claims" }) }), _jsxs("div", { className: "space-y-2", children: [claims.map((claim, index) => (_jsxs("div", { className: "p-3 rounded-xl bg-white/10 border border-white/10", children: [_jsx("div", { className: "text-sm text-white font-medium", children: claim.nickname ?? 'Player' }), _jsx("div", { className: "text-xs text-white/50", children: claim.pattern ?? '-' }), _jsx("div", { className: `text-xs mt-1 ${claim.win ? 'text-emerald-300' : 'text-red-300'}`, children: claim.win ? 'APPROVED' : 'DENIED' })] }, index))), claims.length === 0 && (_jsx("div", { className: "p-4 text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl text-center", children: "No claims yet." }))] })] }), _jsx(PlayerRoster, { players: players, onPenalty: handlePenalty, busy: busy }), _jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/5 p-4 lg:col-span-3", children: [_jsx("header", { className: "text-sm text-white/70 mb-3", children: "Recent Activity" }), _jsx("div", { className: "text-xs text-white/70 whitespace-pre-wrap max-h-48 overflow-auto", children: log.join('\n') })] })] }));
    if (!sessionLoaded) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center", children: _jsx("div", { className: "text-white", children: "Loading\u2026" }) }));
    }
    if (!isAuthenticated) {
        return _jsx(PinAuthForm, { onSuccess: handleAuthSuccess, onError: handleAuthError });
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white", children: [_jsx(Bar, { show: !connected, text: "Reconnecting\u2026" }), authError && (_jsx("div", { className: "fixed top-10 inset-x-0 mx-auto max-w-lg px-4", children: _jsx("div", { className: "p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-sm text-red-200 text-center", children: authError }) })), _jsxs("main", { className: "max-w-6xl mx-auto px-6 py-8 space-y-6", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("h1", { className: "text-xl font-semibold", children: "GameMaster Console" }), _jsxs("nav", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setView('dashboard'), className: `px-3 py-1 rounded-lg text-sm transition ${view === 'dashboard' ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`, children: "Dashboard" }), _jsx("button", { onClick: () => setView('sound-settings'), className: `px-3 py-1 rounded-lg text-sm transition ${view === 'sound-settings' ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`, children: "Sound Settings" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Pill, { children: ["Game ID: ", gameId || '—'] }), _jsxs(Pill, { children: ["PIN: ", gamePin || '—'] }), _jsx(Pill, { children: connected ? 'Connected' : 'Offline' })] })] }), view === 'dashboard' ? (dashboard) : (_jsx(SoundSettingsPanel, { loading: audioSettings.loading, error: audioSettings.error, musicPacks: audioSettings.musicPacks, sfxPacks: audioSettings.sfxPacks, voicePacks: audioSettings.voicePacks, currentMusic: audioSettings.currentMusic, currentSfx: audioSettings.currentSfx, currentVoice: audioSettings.currentVoice, countdown: audioSettings.countdown, uploadProgress: audioSettings.uploadProgress, onSelectMusic: audioSettings.selectMusicPack, onSelectSfx: audioSettings.selectSfxPack, onSelectVoice: audioSettings.selectVoicePack, onToggleCountdown: audioSettings.setCountdownEnabled, onCountdownDuration: audioSettings.setCountdownDuration, onCountdownMessage: audioSettings.setCountdownMessage, onUploadPack: audioSettings.uploadPack }))] }), _jsx(AnimatePresence, { children: newPlayerJoined && (_jsx(motion.div, { initial: { y: -80, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -80, opacity: 0 }, className: "fixed top-0 inset-x-0 flex justify-center pt-8", children: _jsxs("div", { className: "px-6 py-3 rounded-2xl bg-emerald-500/90 text-white shadow-2xl border border-emerald-300/70", children: ["\uD83C\uDF89 ", newPlayerJoined.nickname, " joined the game!"] }) })) })] }));
}
function labelNumber(n) {
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
