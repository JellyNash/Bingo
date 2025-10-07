import React from 'react';

interface GameControlsProps {
  busy: boolean;
  connected: boolean;
  gameId: string;
  gamePin: string;
  autoDrawEnabled: boolean;
  autoIntervalMs: number;
  onNewGame: () => void;
  onDrawNext: () => void;
  onToggleAuto: (next: boolean) => void;
  onIntervalChange: (value: number) => void;
  onPause: () => void;
  onLaunchScreen: () => void;
  onStartCountdown: () => void;
  countdownActive: boolean;
  countdownEnabled: boolean;
}

export function GameControls(props: GameControlsProps) {
  const {
    busy,
    connected,
    gameId,
    gamePin,
    autoDrawEnabled,
    autoIntervalMs,
    onNewGame,
    onDrawNext,
    onToggleAuto,
    onIntervalChange,
    onPause,
    onLaunchScreen,
    onStartCountdown,
    countdownActive,
    countdownEnabled,
  } = props;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
      <header>
        <div className="text-sm text-white/70">Controls</div>
        <div className="text-xs text-white/40">PIN: {gamePin || '—'} • Game ID: {gameId || '—'}</div>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onNewGame}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-brand-primary/20 hover:bg-brand-primary/30 border border-brand-primary/40 text-sm"
        >
          Create Game
        </button>

        <button
          onClick={onDrawNext}
          disabled={busy || !connected}
          className="px-4 py-2 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/40 text-sm"
        >
          Draw Next
        </button>

        <button
          onClick={() => onToggleAuto(!autoDrawEnabled)}
          disabled={busy || !connected}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
        >
          {autoDrawEnabled ? 'Disable Auto Draw' : 'Enable Auto Draw'}
        </button>

        <button
          onClick={onPause}
          disabled={busy || !connected}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
        >
          Pause Game
        </button>

        <button
          onClick={onLaunchScreen}
          disabled={busy || !gameId}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm"
        >
          Launch Big Screen
        </button>

        <button
          onClick={onStartCountdown}
          disabled={busy || !connected || countdownActive || !countdownEnabled}
          className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-sm"
        >
          {countdownActive ? 'Countdown Running' : 'Start Countdown'}
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-white/60">Auto draw interval (ms)</label>
        <input
          type="range"
          min={2000}
          max={10000}
          step={250}
          value={autoIntervalMs}
          onChange={(event) => onIntervalChange(Number(event.target.value))}
          className="w-full"
        />
        <div className="text-xs text-white/60">{autoIntervalMs} ms</div>
      </div>
    </section>
  );
}
