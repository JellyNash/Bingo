import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  qrCodeUrl?: string;
  gamePin: string;
  isLoading?: boolean;
}

export function QRHero({ qrCodeUrl, gamePin, isLoading = false }: Props) {
  return (
    <div className="flex flex-col items-center justify-center">
      {/* QR Code Section - Takes 40-50% of viewport */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative"
      >
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-white/20">
          {qrCodeUrl && !isLoading ? (
            <motion.img
              src={qrCodeUrl}
              alt="Join game QR code"
              className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] xl:w-[32rem] xl:h-[32rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <div className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[28rem] lg:h-[28rem] xl:w-[32rem] xl:h-[32rem] flex items-center justify-center">
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <div className="text-6xl mb-4">📱</div>
                  <div className="text-lg">Loading QR code...</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animated border effect */}
        <motion.div
          className="absolute inset-0 rounded-3xl border-4 border-cyan-400/50"
          animate={{
            boxShadow: [
              '0 0 20px rgba(34, 211, 238, 0.3)',
              '0 0 40px rgba(34, 211, 238, 0.6)',
              '0 0 20px rgba(34, 211, 238, 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* PIN Display */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-8 text-center"
      >
        <div className="text-white/60 text-2xl font-semibold tracking-widest uppercase mb-2">
          Game PIN
        </div>
        <motion.div
          className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-widest text-yellow-300"
          animate={{
            textShadow: [
              '0 0 20px rgba(253, 224, 71, 0.5)',
              '0 0 30px rgba(253, 224, 71, 0.8)',
              '0 0 20px rgba(253, 224, 71, 0.5)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {gamePin || '——————'}
        </motion.div>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-6 text-center text-white/70"
      >
        <div className="text-xl sm:text-2xl font-medium mb-2">
          Scan QR code or visit bingo.game
        </div>
        <div className="text-lg sm:text-xl opacity-80">
          Enter PIN: <span className="font-bold text-yellow-300">{gamePin}</span>
        </div>
      </motion.div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -40, -20],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}