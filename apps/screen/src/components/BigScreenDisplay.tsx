import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LobbyView } from '../views/LobbyView';
import { CountdownOverlay } from '../views/CountdownOverlay';
import { LiveGameView } from '../views/LiveGameView';
import { PlayerJoinBanner } from './PlayerJoinBanner';
import { Player, BigScreenStage } from '../types/realtime';

interface Props {
  gamePin: string;
  currentNumber?: number;
  recentNumbers: number[];
  playerCount: number;
  gameStatus: 'waiting' | 'countdown' | 'active' | 'paused' | 'completed';
  qrCodeUrl?: string;
  players?: Player[];
  countdownState?: {
    active: boolean;
    startedAt?: number;
    durationSeconds: number;
    message?: string;
  };
  newPlayerJoined?: Player | null;
  onNewPlayerDismissed?: () => void;
}

export function BigScreenDisplay({
  gamePin,
  currentNumber,
  recentNumbers,
  playerCount,
  gameStatus,
  qrCodeUrl,
  players = [],
  countdownState,
  newPlayerJoined,
  onNewPlayerDismissed,
}: Props) {
  const [stage, setStage] = useState<BigScreenStage>({ stage: 'lobby' });
  const [showCountdown, setShowCountdown] = useState(false);

  // Determine current stage based on game status
  useEffect(() => {
    const newStage: BigScreenStage['stage'] =
      gameStatus === 'waiting' ? 'lobby' :
      gameStatus === 'countdown' ? 'countdown' :
      gameStatus === 'active' || gameStatus === 'paused' ? 'game' :
      'completed';

    if (newStage !== stage.stage) {
      setStage(prev => ({
        stage: newStage,
        previousStage: prev.stage,
        transitionStartedAt: Date.now()
      }));
    }
  }, [gameStatus, stage.stage]);

  // Handle countdown display
  useEffect(() => {
    if (countdownState?.active) {
      setShowCountdown(true);
    } else {
      setShowCountdown(false);
    }
  }, [countdownState?.active, countdownState?.startedAt]);

  const handleCountdownComplete = () => {
    setShowCountdown(false);
  };

  // Handle player join banner dismissal
  const handlePlayerJoinDismissed = () => {
    onNewPlayerDismissed?.();
  };

  // Render the appropriate view based on current stage
  const renderCurrentView = () => {
    switch (stage.stage) {
      case 'lobby':
        return (
          <LobbyView
            gamePin={gamePin}
            qrCodeUrl={qrCodeUrl}
            players={players}
            playerCount={playerCount}
            isQRLoading={!qrCodeUrl}
          />
        );

      case 'game':
        return (
          <LiveGameView
            currentNumber={currentNumber}
            recentNumbers={recentNumbers}
            gamePin={gamePin}
            playerCount={playerCount}
            gameStatus={gameStatus === 'active' ? 'active' : 'paused'}
          />
        );

      case 'completed':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 text-white flex items-center justify-center"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-8xl font-black mb-8"
              >
                🎉 GAME COMPLETE! 🎉
              </motion.div>
              <div className="text-4xl font-bold mb-4">
                Congratulations to all winners!
              </div>
              <div className="text-xl text-white/80">
                Thank you for playing BINGO
              </div>
            </div>
          </motion.div>
        );

      default:
        return (
          <LobbyView
            gamePin={gamePin}
            qrCodeUrl={qrCodeUrl}
            players={players}
            playerCount={playerCount}
            isQRLoading={!qrCodeUrl}
          />
        );
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Main view with stage transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.stage}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="w-full h-full"
        >
          {renderCurrentView()}
        </motion.div>
      </AnimatePresence>

      {/* Countdown overlay */}
      <CountdownOverlay
        isVisible={showCountdown}
        countdown={countdownState}
        onComplete={handleCountdownComplete}
      />

      {/* Player join banner */}
      <PlayerJoinBanner
        player={newPlayerJoined || null}
        onComplete={handlePlayerJoinDismissed}
      />

      {/* Stage transition indicator (development helper) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black/50 text-white p-2 rounded text-xs">
          Stage: {stage.stage}
          {stage.previousStage && ` (from ${stage.previousStage})`}
        </div>
      )}
    </div>
  );
}
