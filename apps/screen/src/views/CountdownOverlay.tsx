import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownDetails {
  active: boolean;
  startedAt?: number;
  durationSeconds: number;
  message?: string;
}

interface Props {
  isVisible: boolean;
  countdown?: CountdownDetails;
  onComplete?: () => void;
}

export function CountdownOverlay({ isVisible, countdown, onComplete }: Props) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [countdownNumber, setCountdownNumber] = useState<number>(0);

  useEffect(() => {
    if (!isVisible || !countdown?.active || !countdown.startedAt) {
      setTimeRemaining(0);
      setCountdownNumber(0);
      return;
    }

    const durationMs = countdown.durationSeconds * 1000;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - countdown.startedAt!;
      const remaining = Math.max(0, durationMs - elapsed);

      setTimeRemaining(remaining);
      setCountdownNumber(Math.max(0, Math.ceil(remaining / 1000)));

      if (remaining <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [isVisible, countdown?.active, countdown?.startedAt, countdown?.durationSeconds, onComplete]);

  const progress = countdown?.durationSeconds
    ? 1 - timeRemaining / (countdown.durationSeconds * 1000)
    : 0;

  const displayMessage = countdown?.message ?? 'Get ready to play!';

  return (
    <AnimatePresence>
      {isVisible && countdown?.active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0, 0, 0, 0.85) 70%)',
                'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, rgba(0, 0, 0, 0.85) 70%)',
                'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, rgba(0, 0, 0, 0.85) 70%)',
              ]
            }}
            transition={{ duration: countdown.durationSeconds, ease: 'easeInOut' }}
          />

          <div className="relative text-center">
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-8"
            >
              <h1 className="text-6xl font-black text-white mb-4">
                GAME STARTING
              </h1>
              <div className="text-2xl text-white/80">{displayMessage}</div>
            </motion.div>

            <div className="relative">
              <AnimatePresence mode="wait">
                {countdownNumber > 0 ? (
                  <motion.div
                    key={countdownNumber}
                    initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    exit={{ scale: 1.2, opacity: 0, rotateY: 90 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="text-[20rem] font-black text-white leading-none"
                    style={{
                      textShadow: '0 0 100px rgba(255, 255, 255, 0.5)',
                      filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))'
                    }}
                  >
                    {countdownNumber}
                  </motion.div>
                ) : (
                  <motion.div
                    key="go"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="text-[8rem] font-black text-green-400 leading-none"
                    style={{ textShadow: '0 0 60px rgba(34, 197, 94, 0.8)' }}
                  >
                    GO!
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="absolute inset-0 border-8 border-white/30 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-[24rem] h-[24rem]" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="rgba(34, 197, 94, 0.8)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  style={{
                    pathLength: progress,
                    rotate: -90,
                    transformOrigin: 'center',
                  }}
                  animate={{ pathLength: progress }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </svg>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
