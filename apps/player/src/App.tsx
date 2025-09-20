import { useEffect, useState, ReactNode } from 'react';
import { usePlayerStore } from './lib/store';
import { api } from './lib/api';
import { pruneExpiredSnapshots } from './lib/cache';
import { useNavigate, useLocation } from 'react-router-dom';

interface AppProps {
  children: ReactNode;
}

export default function App({ children }: AppProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { auth, connection, resume, clearSession, hydrateFromCache } = usePlayerStore();

  useEffect(() => {
    // Prune expired snapshots on app boot
    pruneExpiredSnapshots();

    // Try to resume on mount
    const tryResume = async () => {
      // First try offline hydration
      hydrateFromCache();

      const resumed = await resume();
      if (resumed) {
        // Navigate to card if we're on home page and successfully resumed
        if (location.pathname === '/') {
          navigate('/card');
        }
      } else {
        // Navigate to home if we're on card page but can't resume
        if (location.pathname === '/card') {
          navigate('/');
        }
      }
      setIsInitialized(true);
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

  if (!isInitialized) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
}