import React from 'react';
import { motion } from 'framer-motion';
import { QRHero } from '../components/QRHero';
import { PlayerRoster } from '../components/PlayerRoster';
import { Player } from '../types/realtime';

interface Props {
  gamePin: string;
  qrCodeUrl?: string;
  players: Player[];
  playerCount: number;
  isQRLoading?: boolean;
}

export function LobbyView({ gamePin, qrCodeUrl, players, playerCount, isQRLoading = false }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between p-8"
        >
          <div>
            <h1 className="text-6xl font-black tracking-widest bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              BINGO
            </h1>
            <p className="mt-2 text-xl font-semibold text-yellow-300">
              Waiting for Players
            </p>
          </div>

          <div className="text-right">
            <div className="text-white/60 text-lg">Players Connected</div>
            <motion.div
              className="text-4xl font-black text-cyan-300"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {playerCount}
            </motion.div>
          </div>
        </motion.header>

        {/* Main content area */}
        <main className="flex-1 flex flex-col lg:flex-row gap-12 p-8">
          {/* Left side - QR Hero (40-50% of viewport) */}
          <motion.section
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:w-1/2 flex items-center justify-center"
          >
            <QRHero
              qrCodeUrl={qrCodeUrl}
              gamePin={gamePin}
              isLoading={isQRLoading}
            />
          </motion.section>

          {/* Right side - Player Roster */}
          <motion.section
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:w-1/2 flex items-center justify-center"
          >
            <div className="w-full max-w-4xl">
              <PlayerRoster players={players} maxVisible={16} />
            </div>
          </motion.section>
        </main>

        {/* Footer with instructions */}
        <motion.footer
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="p-8 text-center"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <span className="text-white/80">Scan QR code with phone camera</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <span className="text-white/80">Or visit bingo.game and enter PIN</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <span className="text-white/80">Wait for game to start!</span>
              </div>
            </div>

            {/* Minimum players notice */}
            {playerCount < 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-yellow-300/80 text-sm"
              >
                Waiting for at least 2 players to start the game
              </motion.div>
            )}
          </div>
        </motion.footer>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -60, -20],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}