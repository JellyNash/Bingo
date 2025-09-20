import { useEffect, useState } from 'react';

interface ClaimBarProps {
  onClaim: () => void;
  disabled: boolean;
  claiming: boolean;
  cooldownEndTime?: number;
  pattern?: string;
}

export default function ClaimBar({
  onClaim,
  disabled,
  claiming,
  cooldownEndTime,
  pattern,
}: ClaimBarProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (!cooldownEndTime) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, cooldownEndTime - Date.now());
      setCooldownRemaining(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        setCooldownRemaining(0);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [cooldownEndTime]);

  const isOnCooldown = cooldownRemaining > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-raised border-t border-border-subtle p-4">
      <div className="max-w-2xl mx-auto">
        {isOnCooldown ? (
          <div className="text-center">
            <div className="text-feedback-warning font-bold mb-1">
              Cooldown Active
            </div>
            <div className="text-text-secondary text-sm">
              Wait {cooldownRemaining} seconds before claiming again
            </div>
          </div>
        ) : (
          <button
            onClick={onClaim}
            disabled={disabled}
            className="btn-primary w-full"
          >
            {claiming ? (
              'Checking...'
            ) : pattern ? (
              `Claim ${pattern}!`
            ) : (
              'No Pattern Available'
            )}
          </button>
        )}
      </div>
    </div>
  );
}