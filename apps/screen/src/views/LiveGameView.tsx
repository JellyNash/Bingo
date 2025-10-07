import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  currentNumber?: number;
  recentNumbers: number[];
  gamePin: string;
  playerCount: number;
  gameStatus: 'active' | 'paused';
}

function letterFor(n: number): string {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
}

function getBingoGrid(): number[][] {
  const grid: number[][] = [];

  // B column: 1-15
  const bColumn = Array.from({length: 15}, (_, i) => i + 1);

  // I column: 16-30
  const iColumn = Array.from({length: 15}, (_, i) => i + 16);

  // N column: 31-45
  const nColumn = Array.from({length: 15}, (_, i) => i + 31);

  // G column: 46-60
  const gColumn = Array.from({length: 15}, (_, i) => i + 46);

  // O column: 61-75
  const oColumn = Array.from({length: 15}, (_, i) => i + 61);

  // Combine into 15 rows of 5 numbers each
  for (let row = 0; row < 15; row++) {
    grid.push([
      bColumn[row],
      iColumn[row],
      nColumn[row],
      gColumn[row],
      oColumn[row]
    ]);
  }

  return grid;
}

function NumberCard({ number, isDrawn, isRecent }: {
  number: number;
  isDrawn: boolean;
  isRecent: boolean;
}) {
  return (
    <motion.div
      className={`
        aspect-square rounded-lg border-2 flex flex-col items-center justify-center
        text-xs sm:text-sm font-bold transition-all duration-300
        ${isDrawn
          ? 'bg-yellow-400 border-yellow-300 text-black shadow-lg'
          : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
        }
        ${isRecent ? 'ring-4 ring-green-400 ring-opacity-75' : ''}
      `}
      animate={isRecent ? {
        scale: [1, 1.1, 1],
        rotate: [0, 2, -2, 0],
      } : {}}
      transition={isRecent ? {
        duration: 0.6,
        repeat: 3,
        ease: 'easeInOut'
      } : {}}
      whileHover={{ scale: 1.05 }}
    >
      <span className={`text-xs ${isDrawn ? 'text-black/70' : 'text-white/50'}`}>
        {letterFor(number)}
      </span>
      <span className="text-lg font-black">
        {number}
      </span>
    </motion.div>
  );
}

export function LiveGameView({ currentNumber, recentNumbers, gamePin, playerCount, gameStatus }: Props) {
  const bingoGrid = getBingoGrid();
  const drawnNumbers = new Set(recentNumbers);
  const isRecent = (num: number) => recentNumbers.slice(-3).includes(num);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-screen p-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black tracking-widest bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              BINGO
            </h1>
            <p className={`mt-1 text-lg font-semibold ${
              gameStatus === 'active' ? 'text-emerald-300' : 'text-orange-300'
            }`}>
              {gameStatus === 'active' ? 'Game in Progress' : 'Game Paused'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-200">PIN: {gamePin}</p>
            <p className="text-sm text-white/60">Players: {playerCount}</p>
          </div>
        </header>

        <div className="flex-1 flex gap-8">
          {/* Left side - Current number and recent draws */}
          <div className="w-1/3 flex flex-col">
            {/* Current Number Display */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg mb-6">
              <h2 className="text-center text-sm uppercase tracking-[0.4em] text-white/60 mb-4">
                Current Draw
              </h2>

              <div className="text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentNumber ?? 'waiting'}
                    initial={{ scale: 0.6, opacity: 0, rotateY: -90 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  >
                    {currentNumber ? (
                      <div className="text-8xl font-black tracking-wider">
                        <span className="text-yellow-300 mr-3">{letterFor(currentNumber)}</span>
                        <span>{currentNumber}</span>
                      </div>
                    ) : (
                      <div className="text-7xl font-black text-white/20">—</div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Game status indicator */}
              <div className="mt-6 text-center">
                <motion.div
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                    gameStatus === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  }`}
                  animate={gameStatus === 'active' ? {
                    boxShadow: [
                      '0 0 10px rgba(34, 197, 94, 0.3)',
                      '0 0 20px rgba(34, 197, 94, 0.6)',
                      '0 0 10px rgba(34, 197, 94, 0.3)'
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    gameStatus === 'active' ? 'bg-emerald-400' : 'bg-orange-400'
                  }`} />
                  {gameStatus === 'active' ? 'Live' : 'Paused'}
                </motion.div>
              </div>
            </div>

            {/* Recent Numbers */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-lg">
              <h3 className="text-sm uppercase tracking-[0.4em] text-white/60 mb-4">
                Recent Draws
              </h3>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                <AnimatePresence>
                  {recentNumbers.slice(-10).reverse().map((num, idx) => (
                    <motion.div
                      key={`recent-${num}-${recentNumbers.length - idx}`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/20"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-cyan-300 font-semibold text-sm">
                          {letterFor(num)}
                        </span>
                        <span className="text-xl font-bold">{num}</span>
                      </div>
                      <span className="text-xs text-white/50">
                        #{recentNumbers.length - idx}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {recentNumbers.length === 0 && (
                  <div className="text-white/40 text-center py-8">
                    Numbers will appear here as they are drawn
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Bingo Grid */}
          <div className="flex-1">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-lg h-full">
              <h2 className="text-center text-sm uppercase tracking-[0.4em] text-white/60 mb-6">
                Bingo Board
              </h2>

              {/* BINGO Header */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {['B', 'I', 'N', 'G', 'O'].map((letter, index) => (
                  <motion.div
                    key={letter}
                    className="aspect-square bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-2xl font-black text-white shadow-lg"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.2,
                      ease: 'easeInOut',
                    }}
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>

              {/* Number Grid */}
              <div className="grid grid-cols-5 gap-1 sm:gap-2">
                {bingoGrid.map((row, rowIndex) =>
                  row.map((number, colIndex) => (
                    <NumberCard
                      key={`${rowIndex}-${colIndex}-${number}`}
                      number={number}
                      isDrawn={drawnNumbers.has(number)}
                      isRecent={isRecent(number)}
                    />
                  ))
                )}
              </div>

              {/* Progress indicator */}
              <div className="mt-6 text-center">
                <div className="text-sm text-white/60 mb-2">
                  Numbers Called: {recentNumbers.length} / 75
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(recentNumbers.length / 75) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}