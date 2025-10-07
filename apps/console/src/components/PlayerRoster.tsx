import React from 'react';

type Player = {
  id: string;
  nickname: string;
  strikes: number;
  status: string;
  joinedAt?: string;
};

interface PlayerRosterProps {
  players: Player[];
  onPenalty: (playerId: string) => void;
  busy: boolean;
}

export function PlayerRoster({ players, onPenalty, busy }: PlayerRosterProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <header>
        <div className="text-sm text-white/70">Players</div>
        <div className="text-xs text-white/40">{players.length} connected</div>
      </header>

      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {players.map((player) => (
          <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-white/10 border border-white/10">
            <div>
              <div className="text-sm text-white font-medium">{player.nickname}</div>
              <div className="text-xs text-white/50">{player.status} • strikes: {player.strikes}</div>
              {player.joinedAt && (
                <div className="text-[10px] text-white/30">Joined {new Date(player.joinedAt).toLocaleTimeString()}</div>
              )}
            </div>
            <button
              onClick={() => onPenalty(player.id)}
              disabled={busy}
              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs text-red-200 disabled:opacity-50"
            >
              Penalty
            </button>
          </div>
        ))}
        {players.length === 0 && (
          <div className="p-6 text-center text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl">
            Waiting for players to join.
          </div>
        )}
      </div>
    </section>
  );
}
