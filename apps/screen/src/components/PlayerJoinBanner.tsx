import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/realtime';

interface Props {
  player: Player | null;
  onComplete?: () => void;
}

export function PlayerJoinBanner({ player, onComplete }: Props) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {player && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.6
          }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-8"
        >
          <motion.div
            className="bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-lg border border-green-400/50 rounded-2xl px-8 py-4 shadow-2xl"
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: [
                '0 20px 40px rgba(34, 197, 94, 0.3)',
                '0 25px 50px rgba(34, 197, 94, 0.5)',
                '0 20px 40px rgba(34, 197, 94, 0.3)'
              ]
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }}
          >
            <div className="flex items-center space-x-4">
              {/* Animated join icon */}
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.6, repeat: 2 }}
                className="text-4xl"
              >
                🎉
              </motion.div>

              {/* Player info */}
              <div className="text-white">
                <div className="text-2xl font-bold">
                  {player.nickname} joined!
                </div>
                <div className="text-green-100 text-sm">
                  Welcome to the game
                </div>
              </div>

              {/* Animated check mark */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            </div>

            {/* Celebration particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [-10, -30, 10],
                    x: [0, Math.random() * 40 - 20, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Background overlay with subtle blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/10 backdrop-blur-sm -z-10"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}