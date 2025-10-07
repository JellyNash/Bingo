import React, { FormEvent, useState } from 'react';
import { authenticateWithPin } from '../lib.api';

interface PinAuthFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function PinAuthForm({ onSuccess, onError }: PinAuthFormProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    try {
      await authenticateWithPin(pin.trim());
      onSuccess();
    } catch (error: any) {
      onError(error?.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="bg-white/10 p-8 rounded-2xl border border-white/20 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-6">GameMaster Console</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-white/80 mb-2">
              Enter GameMaster PIN
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-accent disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
          >
            {loading ? 'Authenticating…' : 'Access Console'}
          </button>
        </form>
      </div>
    </div>
  );
}
