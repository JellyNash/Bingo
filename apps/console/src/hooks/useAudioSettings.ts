import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getGameAudioSettings,
  listAudioPacks,
  updateGameAudioSettings,
  uploadAudioPack,
} from '../lib.api';

export type AudioPackType = 'music' | 'sfx' | 'voice';

export interface AudioFile {
  id: string;
  name: string;
  cueKey: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  url?: string | null;
}

export interface AudioPack {
  id: string;
  packId: string;
  name: string;
  description?: string;
  type: AudioPackType;
  scope: string;
  locale?: string;
  files: AudioFile[];
}

export interface UploadProgress {
  packId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface CountdownSettings {
  enabled: boolean;
  durationSeconds: number;
  message: string;
}

interface UseAudioSettingsOptions {
  onError?: (message: string) => void;
}

export function useAudioSettings(gameId: string | null, options?: UseAudioSettingsOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [musicPacks, setMusicPacks] = useState<AudioPack[]>([]);
  const [sfxPacks, setSfxPacks] = useState<AudioPack[]>([]);
  const [voicePacks, setVoicePacks] = useState<AudioPack[]>([]);
  const [currentMusic, setCurrentMusic] = useState<{ lobby: string | null; game: string | null }>({ lobby: null, game: null });
  const [currentSfx, setCurrentSfx] = useState<string | null>(null);
  const [currentVoice, setCurrentVoice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<CountdownSettings>({ enabled: true, durationSeconds: 10, message: '' });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const emitError = useCallback((message: string) => {
    setError(message);
    options?.onError?.(message);
    setTimeout(() => {
      setError((prev) => (prev === message ? null : prev));
    }, 4000);
  }, [options]);

  const normalizePack = useCallback((pack: any): AudioPack => {
    const files: AudioFile[] = Array.isArray(pack.assets)
      ? pack.assets.map((asset: any) => ({
          id: asset.id,
          name: asset.filename,
          cueKey: asset.cueKey,
          duration: typeof asset.duration === 'number' ? asset.duration : undefined,
          size: typeof asset.fileSize === 'number' ? asset.fileSize : undefined,
          mimeType: asset.mimeType ?? undefined,
          url: null,
        }))
      : [];

    return {
      id: pack.id,
      packId: pack.packId,
      name: pack.name,
      description: pack.description ?? undefined,
      type: (pack.type ?? '').toLowerCase() as AudioPackType,
      scope: pack.scope,
      locale: pack.locale ?? undefined,
      files,
    };
  }, []);

  const refreshPacks = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      const response = await listAudioPacks();
      const packs = Array.isArray(response?.packs) ? response.packs.map(normalizePack) : [];
      setMusicPacks(packs.filter((p: AudioPack) => p.type === 'music'));
      setSfxPacks(packs.filter((p: AudioPack) => p.type === 'sfx'));
      setVoicePacks(packs.filter((p: AudioPack) => p.type === 'voice'));
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to load audio packs');
    } finally {
      setLoading(false);
    }
  }, [emitError, gameId, normalizePack]);

  const refreshSettings = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await getGameAudioSettings(gameId);
      const settings = response?.settings ?? {};
      setCountdown({
        enabled: Boolean(settings.countdownEnabled ?? true),
        durationSeconds: settings.countdownDurationSeconds ?? 10,
        message: settings.countdownMessage ?? '',
      });
      const packs = settings?.packs ?? {};
      setCurrentMusic({
        lobby: packs.lobbyMusic?.packId ?? null,
        game: packs.inGameMusic?.packId ?? null,
      });
      setCurrentSfx(packs.sfx?.packId ?? null);
      setCurrentVoice(packs.voice?.packId ?? null);
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to load audio settings');
    }
  }, [emitError, gameId]);

  useEffect(() => {
    if (!gameId) return;
    setMusicPacks([]);
    setSfxPacks([]);
    setVoicePacks([]);
    setUploadProgress([]);
    refreshPacks();
    refreshSettings();
  }, [gameId, refreshPacks, refreshSettings]);

  const applySettings = useCallback(async (payload: Record<string, unknown>) => {
    if (!gameId) return;
    await updateGameAudioSettings(gameId, payload);
    await refreshSettings();
  }, [gameId, refreshSettings]);

  const selectMusicPack = useCallback(async (slot: 'lobby' | 'game', packId: string | null) => {
    const field = slot === 'lobby' ? 'lobbyMusicPackId' : 'inGameMusicPackId';
    try {
      await applySettings({ [field]: packId });
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to update music pack');
      throw err;
    }
  }, [applySettings, emitError]);

  const selectSfxPack = useCallback(async (packId: string | null) => {
    try {
      await applySettings({ sfxPackId: packId });
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to update sound effects pack');
      throw err;
    }
  }, [applySettings, emitError]);

  const selectVoicePack = useCallback(async (packId: string | null) => {
    try {
      await applySettings({ voicePackId: packId });
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to update voice pack');
      throw err;
    }
  }, [applySettings, emitError]);

  const setCountdownEnabled = useCallback(async (enabled: boolean) => {
    try {
      await applySettings({ countdownEnabled: enabled });
      setCountdown((prev) => ({ ...prev, enabled }));
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to update countdown setting');
      throw err;
    }
  }, [applySettings, emitError]);

  const setCountdownDuration = useCallback(async (seconds: number) => {
    const clamped = Math.max(3, Math.min(600, Math.round(seconds)));
    try {
      await applySettings({ countdownDurationSeconds: clamped });
      setCountdown((prev) => ({ ...prev, durationSeconds: clamped }));
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to update countdown duration');
      throw err;
    }
  }, [applySettings, emitError]);

  const setCountdownMessage = useCallback(async (message: string) => {
    try {
      await applySettings({ countdownMessage: message });
      setCountdown((prev) => ({ ...prev, message }));
    } catch (err: any) {
      emitError(err?.message ?? 'Failed to update countdown message');
      throw err;
    }
  }, [applySettings, emitError]);

  const uploadPack = useCallback(async (file: File) => {
    const packId = `upload-${Date.now()}`;
    setUploadProgress((entries) => [...entries, {
      packId,
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await uploadAudioPack(formData, (progress) => {
        setUploadProgress((entries) => entries.map((entry) =>
          entry.packId === packId ? { ...entry, progress } : entry
        ));
      });

      setUploadProgress((entries) => entries.map((entry) =>
        entry.packId === packId ? { ...entry, progress: 100, status: 'processing' } : entry
      ));

      await refreshPacks();

      setUploadProgress((entries) => entries.filter((entry) => entry.packId !== packId));
    } catch (err: any) {
      const message = err?.message ?? 'Upload failed';
      emitError(message);
      setUploadProgress((entries) => entries.map((entry) =>
        entry.packId === packId ? { ...entry, status: 'error', error: message } : entry
      ));
      throw err;
    }
  }, [emitError, refreshPacks]);

  return useMemo(() => ({
    loading,
    error,
    musicPacks,
    sfxPacks,
    voicePacks,
    currentMusic,
    currentSfx,
    currentVoice,
    countdown,
    uploadProgress,
    refreshPacks,
    refreshSettings,
    selectMusicPack,
    selectSfxPack,
    selectVoicePack,
    setCountdownEnabled,
    setCountdownDuration,
    setCountdownMessage,
    uploadPack,
  }), [
    loading,
    error,
    musicPacks,
    sfxPacks,
    voicePacks,
    currentMusic,
    currentSfx,
    currentVoice,
    countdown,
    uploadProgress,
    refreshPacks,
    refreshSettings,
    selectMusicPack,
    selectSfxPack,
    selectVoicePack,
    setCountdownEnabled,
    setCountdownDuration,
    setCountdownMessage,
    uploadPack,
  ]);
}
