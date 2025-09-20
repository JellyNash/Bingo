import { useEffect, useState } from 'react';
import { usePlayerStore } from './lib/store';
import { api } from './lib/api';
import Join from './pages/Join';
import Card from './pages/Card';

type AppState = 'INIT' | 'JOIN' | 'READY' | 'ERROR';

export default function App() {
  const [appState, setAppState] = useState<AppState>('INIT');
  const [error, setError] = useState<string>('');

  const { auth, connection, resume, clearSession } = usePlayerStore();

  useEffect(() => {
    // Try to resume on mount
    const tryResume = async () => {
      const resumed = await resume();
      if (resumed) {
        setAppState('READY');
      } else {
        setAppState('JOIN');
      }
    };

    tryResume();

    // Online/offline detection
    const handleOnline = () => {
      usePlayerStore.setState({ connection: { online: true, reconnecting: false } });
    };

    const handleOffline = () => {
      usePlayerStore.setState({ connection: { online: false, reconnecting: false } });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Update API auth when tokens change
    api.setAuth({
      sessionToken: auth.sessionToken,
      resumeToken: auth.resumeToken,
    });
  }, [auth.sessionToken, auth.resumeToken]);

  const handleJoinSuccess = () => {
    setAppState('READY');
  };

  const handleLogout = () => {
    clearSession();
    setAppState('JOIN');
  };

  if (appState === 'INIT') {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (appState === 'JOIN') {
    return <Join onSuccess={handleJoinSuccess} />;
  }

  if (appState === 'READY') {
    return <Card onLogout={handleLogout} />;
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-feedback-danger mb-4">Error: {error}</p>
        <button onClick={() => setAppState('JOIN')} className="btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}