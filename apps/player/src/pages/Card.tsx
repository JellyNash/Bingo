import { useEffect, useState } from 'react';
import { usePlayerStore } from '../lib/store';
import CardGrid from '../components/CardGrid';
import ClaimBar from '../components/ClaimBar';
import WinnersList from '../components/WinnersList';
import StatusBar from '../components/StatusBar';
import ReconnectToast from '../components/ReconnectToast';
import { getWinningPatterns, PATTERN_NAMES } from '../lib/patterns';
import type { BingoPattern } from '../lib/api';

interface CardProps {
  onLogout: () => void;
}

export default function Card({ onLogout }: CardProps) {
  const { card, drawn, winners, status, auth, connection } = usePlayerStore();
  const [selectedPattern, setSelectedPattern] = useState<BingoPattern | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  const [showReconnectToast, setShowReconnectToast] = useState(false);

  // Check for available patterns
  const availablePatterns = getWinningPatterns(card.marks);

  useEffect(() => {
    // Select first available pattern by default
    if (availablePatterns.length > 0 && !selectedPattern) {
      setSelectedPattern(availablePatterns[0]);
    }
  }, [availablePatterns]);

  // Handle reconnection status
  useEffect(() => {
    if (connection.reconnecting) {
      setShowReconnectToast(true);
      setReconnectAttempt(connection.reconnectAttempts || 0);

      // Calculate next retry countdown
      if (connection.reconnectAttempts) {
        const retryDelay = Math.min(1000 * Math.pow(2, connection.reconnectAttempts), 30000);
        let remaining = Math.ceil(retryDelay / 1000);
        setNextRetryIn(remaining);

        const countdown = setInterval(() => {
          remaining--;
          setNextRetryIn(remaining);
          if (remaining <= 0) clearInterval(countdown);
        }, 1000);

        return () => clearInterval(countdown);
      }
    } else if (connection.online) {
      setShowReconnectToast(false);
      setReconnectAttempt(0);
      setNextRetryIn(0);
    }
  }, [connection.reconnecting, connection.online, connection.reconnectAttempts]);

  const handleClaim = async () => {
    if (!selectedPattern || claiming) return;

    setClaiming(true);
    try {
      await usePlayerStore.getState().submitClaim(selectedPattern as BingoPattern);
    } catch (error) {
      console.error('Claim failed:', error);
    } finally {
      setClaiming(false);
    }
  };

  const handleRetryNow = () => {
    // Force reconnection attempt
    usePlayerStore.getState().reconnect();
  };

  const handleDismissToast = () => {
    setShowReconnectToast(false);
  };

  const isCooldown = status.cooldownEndTime && status.cooldownEndTime > Date.now();

  return (
    <div className="h-full w-full flex flex-col">
      <StatusBar onLogout={onLogout} />

      <ReconnectToast
        visible={showReconnectToast}
        attempt={reconnectAttempt}
        maxAttempts={5}
        nextRetryIn={nextRetryIn}
        onRetryNow={handleRetryNow}
        onDismiss={handleDismissToast}
      />

      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Welcome message */}
          <div className="text-center py-2">
            <h1 className="text-xl font-bold">Hi, {auth.nickname}!</h1>
            <p className="text-text-secondary text-sm">
              {drawn.drawnSet.size - 1} numbers drawn
            </p>
          </div>

          {/* Bingo Card */}
          <CardGrid />

          {/* Winners List */}
          {winners.length > 0 && <WinnersList winners={winners} />}

          {/* Pattern selector for claims */}
          {availablePatterns.length > 0 && !isCooldown && (
            <div className="card p-4">
              <label className="block text-text-secondary text-sm mb-2">
                Available Patterns
              </label>
              <select
                value={selectedPattern || ''}
                onChange={(e) => setSelectedPattern(e.target.value as BingoPattern)}
                className="input"
              >
                {availablePatterns.map((pattern) => (
                  <option key={pattern} value={pattern}>
                    {PATTERN_NAMES[pattern]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Debug info in dev */}
          {import.meta.env.DEV && (
            <div className="card p-4 text-xs text-text-muted">
              <div>Game: {auth.gameId}</div>
              <div>Card: {auth.cardId}</div>
              <div>Status: {status.gameStatus}</div>
              <div>Connection: {connection.online ? 'Online' : 'Offline'}</div>
              <div>Drawn: {Array.from(drawn.drawnSet).slice(1, 11).join(', ')}...</div>
            </div>
          )}
        </div>
      </div>

      {/* Claim Bar - fixed at bottom */}
      <ClaimBar
        onClaim={handleClaim}
        disabled={claiming || !selectedPattern || isCooldown || !connection.online}
        claiming={claiming}
        cooldownEndTime={status.cooldownEndTime}
        pattern={selectedPattern ? PATTERN_NAMES[selectedPattern] : ''}
      />
    </div>
  );
}