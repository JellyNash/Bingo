import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types/realtime';

interface Props {
  players: Player[];
  maxVisible?: number;
}

function getAvatarColor(playerId: string): string {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-rose-500'
  ];

  // Simple hash function to consistently assign colors
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash + playerId.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
}

function PlayerCard({ player, index }: { player: Player; index: number }) {
  const avatarColor = getAvatarColor(player.id);

  return (
    <motion.div
      layout
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      exit={{ scale: 0, rotate: 180, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: index * 0.1
      }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="relative group"
    >
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-colors duration-300">
        {/* Avatar */}
        <div className="flex items-center justify-center mb-3">
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={`${player.nickname}'s avatar`}
              className="w-12 h-12 rounded-full border-2 border-white/30"
            />
          ) : (
            <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg border-2 border-white/30`}>
              {player.nickname.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Ready status indicator */}
          {player.isReady && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white"
            >
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </motion.div>
          )}
        </div>

        {/* Player name */}
        <div className="text-center">
          <div className="text-white font-medium text-sm truncate">
            {player.nickname}
          </div>
          <div className="text-white/50 text-xs mt-1">
            {player.isReady ? 'Ready' : 'Joining...'}
          </div>
        </div>

        {/* Join animation sparkles */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: 3 }}
          className="absolute inset-0 pointer-events-none"
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                repeat: 2,
              }}
            />
          ))}
        </motion.div>
      </div>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 via-cyan-400/20 to-cyan-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ filter: 'blur(8px)' }}
      />
    </motion.div>
  );
}

export function PlayerRoster({ players, maxVisible = 12 }: Props) {
  const visiblePlayers = players.slice(0, maxVisible);
  const hiddenCount = Math.max(0, players.length - maxVisible);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Players Joined</h2>
        <div className="text-white/70 text-lg">
          <span className="text-yellow-300 font-semibold">{players.length}</span>
          {players.length === 1 ? ' player' : ' players'} ready to play
        </div>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        <AnimatePresence mode="popLayout">
          {visiblePlayers.map((player, index) => (
            <PlayerCard
              key={player.id}
              player={player}
              index={index}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Show overflow count */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-6"
        >
          <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full border border-white/20">
            <span className="text-white/80">
              +{hiddenCount} more {hiddenCount === 1 ? 'player' : 'players'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {players.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="text-6xl mb-4">👥</div>
          <div className="text-xl text-white/60">Waiting for players to join...</div>
          <div className="text-sm text-white/40 mt-2">
            Players will appear here as they scan the QR code
          </div>
        </motion.div>
      )}
    </div>
  );
}