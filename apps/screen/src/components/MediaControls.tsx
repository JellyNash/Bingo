import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MediaEngine, MediaVolumes } from '../media/types';

interface MediaControlsProps {
  engine: MediaEngine | null;
  packs?: Array<{ url: string; name: string }>;
  currentPack?: string;
  onPackChange?: (packUrl: string) => void;
}

export function MediaControls({
  engine,
  packs = [],
  currentPack,
  onPackChange
}: MediaControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [volumes, setVolumes] = useState<MediaVolumes>({
    voice: 1.0,
    sfx: 0.9,
    music: 0.6,
    master: 1.0
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  useEffect(() => {
    if (engine) {
      // Load saved volumes
      const savedVolumes = engine.getVolumes();
      if (savedVolumes) {
        setVolumes(savedVolumes);
      }
    }
  }, [engine]);

  const handleVolumeChange = (key: keyof MediaVolumes, value: number) => {
    const newVolumes = { ...volumes, [key]: value };
    setVolumes(newVolumes);
    engine?.setVolumes({ [key]: value });
  };

  const toggleMusic = () => {
    engine?.musicToggle();
    setIsMusicPlaying(!isMusicPlaying);
  };

  const handlePackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const packUrl = e.target.value;
    if (packUrl && onPackChange) {
      onPackChange(packUrl);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-40 rounded-full bg-white/10 p-3 backdrop-blur-sm transition-all hover:bg-white/20"
        aria-label="Toggle audio controls"
      >
        <svg
          className="h-6 w-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      {/* Controls Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 z-40 w-80 rounded-2xl bg-gray-900/95 p-6 backdrop-blur-lg shadow-2xl"
          >
            <h3 className="mb-4 text-lg font-semibold text-white">Audio Controls</h3>

            {/* Volume Sliders */}
            <div className="space-y-4">
              {/* Voice Volume */}
              <VolumeSlider
                label="Voice"
                value={volumes.voice}
                onChange={(v) => handleVolumeChange('voice', v)}
                icon="🎙️"
              />

              {/* SFX Volume */}
              <VolumeSlider
                label="Sound Effects"
                value={volumes.sfx}
                onChange={(v) => handleVolumeChange('sfx', v)}
                icon="🔊"
              />

              {/* Music Volume */}
              <VolumeSlider
                label="Music"
                value={volumes.music}
                onChange={(v) => handleVolumeChange('music', v)}
                icon="🎵"
              />

              {/* Master Volume */}
              <VolumeSlider
                label="Master"
                value={volumes.master}
                onChange={(v) => handleVolumeChange('master', v)}
                icon="🔈"
              />
            </div>

            {/* Music Toggle */}
            <button
              onClick={toggleMusic}
              className={`mt-4 w-full rounded-lg px-4 py-2 font-medium transition-all ${
                isMusicPlaying
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {isMusicPlaying ? 'Music Playing' : 'Music Stopped'}
            </button>

            {/* Pack Selector */}
            {packs.length > 0 && (
              <div className="mt-4">
                <label className="mb-1 block text-sm text-gray-400">Voice Pack</label>
                <select
                  value={currentPack || ''}
                  onChange={handlePackChange}
                  className="w-full rounded-lg bg-gray-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Pack...</option>
                  {packs.map((pack) => (
                    <option key={pack.url} value={pack.url}>
                      {pack.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Volume Slider Component
interface VolumeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  icon?: string;
}

function VolumeSlider({ label, value, onChange, icon }: VolumeSliderProps) {
  const percentage = Math.round(value * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-gray-300">
          {icon && <span>{icon}</span>}
          {label}
        </span>
        <span className="text-xs text-gray-400">{percentage}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={percentage}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-full cursor-pointer accent-blue-500"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #374151 ${percentage}%, #374151 100%)`
        }}
      />
    </div>
  );
}