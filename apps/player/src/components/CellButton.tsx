import { useState } from 'react';
import { usePlayerStore } from '../lib/store';

interface CellButtonProps {
  position: number;
  number: number;
  isFree: boolean;
  isMarked: boolean;
  isDrawn: boolean;
}

export default function CellButton({
  position,
  number,
  isFree,
  isMarked,
  isDrawn,
}: CellButtonProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleClick = async () => {
    if (isFree) return; // FREE space is always marked

    if (!isDrawn) {
      // Number not drawn yet - show error animation
      setShowError(true);
      setTimeout(() => setShowError(false), 500);

      // Optional: Vibrate if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      return;
    }

    setIsToggling(true);
    try {
      await usePlayerStore.getState().toggleMark(position);
    } catch (error) {
      console.error('Failed to toggle mark:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={`
        relative aspect-square min-h-[44px] rounded-lg font-bold text-lg
        transition-all transform active:scale-95
        ${isFree ? 'bg-brand-primary text-text-inverse cursor-default' : ''}
        ${!isFree && isDrawn && isMarked ? 'bg-brand-secondary text-surface-base' : ''}
        ${!isFree && isDrawn && !isMarked ? 'bg-surface-overlay text-text-primary hover:bg-surface-glow' : ''}
        ${!isFree && !isDrawn ? 'bg-surface-raised text-text-muted cursor-not-allowed' : ''}
        ${showError ? 'animate-shake bg-feedback-danger/20' : ''}
        ${isToggling ? 'opacity-75' : ''}
      `}
      aria-pressed={isMarked}
      aria-label={isFree ? 'FREE space' : `${number}${isMarked ? ' marked' : ''}`}
    >
      {isFree ? 'FREE' : number}

      {/* Marked indicator */}
      {isMarked && !isFree && (
        <div className="absolute inset-0 rounded-lg pointer-events-none">
          <svg
            className="absolute top-1 right-1 w-4 h-4 text-surface-base"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}