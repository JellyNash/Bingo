import { usePlayerStore } from '../lib/store';

interface StatusBarProps {
  onLogout: () => void;
}

export default function StatusBar({ onLogout }: StatusBarProps) {
  const { status, connection, auth } = usePlayerStore();

  const getStatusColor = () => {
    if (!connection.online) return 'bg-gray-500';
    if (connection.reconnecting) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!connection.online) return 'Offline';
    if (connection.reconnecting) return 'Reconnecting...';
    return 'Connected';
  };

  const getGameStatusBadge = () => {
    switch (status.gameStatus) {
      case 'LOBBY':
        return 'bg-surface-glow text-text-muted';
      case 'OPEN':
        return 'bg-brand-primary/20 text-brand-primary';
      case 'ACTIVE':
        return 'bg-feedback-success/20 text-feedback-success';
      case 'PAUSED':
        return 'bg-feedback-warning/20 text-feedback-warning';
      case 'ENDED':
        return 'bg-surface-overlay text-text-secondary';
      default:
        return 'bg-surface-raised text-text-muted';
    }
  };

  return (
    <div className="bg-surface-raised border-b border-border-subtle p-3">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-text-secondary">{getStatusText()}</span>
          </div>

          {/* Game status */}
          <div className={`px-2 py-1 rounded text-xs font-medium ${getGameStatusBadge()}`}>
            {status.gameStatus}
          </div>

          {/* Strikes indicator */}
          {status.strikes !== undefined && status.strikes > 0 && (
            <div className="px-2 py-1 rounded text-xs font-medium bg-feedback-danger/20 text-feedback-danger">
              {status.strikes} strike{status.strikes !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
          aria-label="Leave game"
        >
          Leave
        </button>
      </div>
    </div>
  );
}