import { useState } from 'react';
import { usePlayerStore } from '../lib/store';
import PinInput from '../components/PinInput';
import NicknameInput from '../components/NicknameInput';

interface JoinProps {
  onSuccess: () => void;
}

export default function Join({ onSuccess }: JoinProps) {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { join } = usePlayerStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pin.length !== 6) {
      setError('PIN must be 6 digits');
      return;
    }

    if (nickname.trim().length < 2) {
      setError('Nickname must be at least 2 characters');
      return;
    }

    if (nickname.length > 32) {
      setError('Nickname must be 32 characters or less');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await join(pin, nickname);
      if (success) {
        onSuccess();
      } else {
        setError('Failed to join game. Please check your PIN.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-center mb-8">Join Bingo Game</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Game PIN
              </label>
              <PinInput
                value={pin}
                onChange={setPin}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">
                Your Nickname
              </label>
              <NicknameInput
                value={nickname}
                onChange={setNickname}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-feedback-danger/10 text-feedback-danger text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 6 || nickname.trim().length < 2}
              className="btn-primary w-full"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-sm mt-6">
          Get the game PIN from your host
        </p>
      </div>
    </div>
  );
}