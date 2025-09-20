interface Winner {
  playerId: string;
  nickname: string;
  rank: number;
  pattern: string;
}

interface WinnersListProps {
  winners: Winner[];
}

export default function WinnersList({ winners }: WinnersListProps) {
  if (winners.length === 0) return null;

  const sortedWinners = [...winners].sort((a, b) => a.rank - b.rank);

  return (
    <div className="card p-4">
      <h2 className="font-bold text-brand-secondary mb-3">🎉 Winners</h2>
      <div className="space-y-2">
        {sortedWinners.slice(0, 5).map((winner, index) => (
          <div
            key={`${winner.playerId}-${index}`}
            className="flex items-center justify-between p-2 rounded-lg bg-surface-overlay"
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold
                  ${winner.rank === 1 ? 'bg-yellow-500 text-surface-base' : ''}
                  ${winner.rank === 2 ? 'bg-gray-400 text-surface-base' : ''}
                  ${winner.rank === 3 ? 'bg-orange-600 text-surface-base' : ''}
                  ${winner.rank > 3 ? 'bg-surface-glow text-text-secondary' : ''}
                `}
              >
                {winner.rank}
              </div>
              <div>
                <div className="font-medium">{winner.nickname}</div>
                <div className="text-text-muted text-xs">{winner.pattern}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}