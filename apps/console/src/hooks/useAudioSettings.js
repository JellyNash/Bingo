import { useCallback, useEffect, useMemo, useState } from 'react';
import { getGameAudioSettings, listAudioPacks, updateGameAudioSettings, uploadAudioPack, } from '../lib.api';
export function useAudioSettings(gameId, options) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [musicPacks, setMusicPacks] = useState([]);
    const [sfxPacks, setSfxPacks] = useState([]);
    const [voicePacks, setVoicePacks] = useState([]);
    const [currentMusic, setCurrentMusic] = useState({ lobby: null, game: null });
    const [currentSfx, setCurrentSfx] = useState(null);
    const [currentVoice, setCurrentVoice] = useState(null);
    const [countdown, setCountdown] = useState({ enabled: true, durationSeconds: 10, message: '' });
    const [uploadProgress, setUploadProgress] = useState([]);
    const emitError = useCallback((message) => {
        setError(message);
        options?.onError?.(message);
        setTimeout(() => {
            setError((prev) => (prev === message ? null : prev));
        }, 4000);
    }, [options]);
    const normalizePack = useCallback((pack) => {
        const files = Array.isArray(pack.assets)
            ? pack.assets.map((asset) => ({
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
            type: (pack.type ?? '').toLowerCase(),
            scope: pack.scope,
            locale: pack.locale ?? undefined,
            files,
        };
    }, []);
    const refreshPacks = useCallback(async () => {
        if (!gameId)
            return;
        setLoading(true);
        try {
            const response = await listAudioPacks();
            const packs = Array.isArray(response?.packs) ? response.packs.map(normalizePack) : [];
            setMusicPacks(packs.filter((p) => p.type === 'music'));
            setSfxPacks(packs.filter((p) => p.type === 'sfx'));
            setVoicePacks(packs.filter((p) => p.type === 'voice'));
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to load audio packs');
        }
        finally {
            setLoading(false);
        }
    }, [emitError, gameId, normalizePack]);
    const refreshSettings = useCallback(async () => {
        if (!gameId)
            return;
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
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to load audio settings');
        }
    }, [emitError, gameId]);
    useEffect(() => {
        if (!gameId)
            return;
        setMusicPacks([]);
        setSfxPacks([]);
        setVoicePacks([]);
        setUploadProgress([]);
        refreshPacks();
        refreshSettings();
    }, [gameId, refreshPacks, refreshSettings]);
    const applySettings = useCallback(async (payload) => {
        if (!gameId)
            return;
        await updateGameAudioSettings(gameId, payload);
        await refreshSettings();
    }, [gameId, refreshSettings]);
    const selectMusicPack = useCallback(async (slot, packId) => {
        const field = slot === 'lobby' ? 'lobbyMusicPackId' : 'inGameMusicPackId';
        try {
            await applySettings({ [field]: packId });
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to update music pack');
            throw err;
        }
    }, [applySettings, emitError]);
    const selectSfxPack = useCallback(async (packId) => {
        try {
            await applySettings({ sfxPackId: packId });
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to update sound effects pack');
            throw err;
        }
    }, [applySettings, emitError]);
    const selectVoicePack = useCallback(async (packId) => {
        try {
            await applySettings({ voicePackId: packId });
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to update voice pack');
            throw err;
        }
    }, [applySettings, emitError]);
    const setCountdownEnabled = useCallback(async (enabled) => {
        try {
            await applySettings({ countdownEnabled: enabled });
            setCountdown((prev) => ({ ...prev, enabled }));
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to update countdown setting');
            throw err;
        }
    }, [applySettings, emitError]);
    const setCountdownDuration = useCallback(async (seconds) => {
        const clamped = Math.max(3, Math.min(600, Math.round(seconds)));
        try {
            await applySettings({ countdownDurationSeconds: clamped });
            setCountdown((prev) => ({ ...prev, durationSeconds: clamped }));
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to update countdown duration');
            throw err;
        }
    }, [applySettings, emitError]);
    const setCountdownMessage = useCallback(async (message) => {
        try {
            await applySettings({ countdownMessage: message });
            setCountdown((prev) => ({ ...prev, message }));
        }
        catch (err) {
            emitError(err?.message ?? 'Failed to update countdown message');
            throw err;
        }
    }, [applySettings, emitError]);
    const uploadPack = useCallback(async (file) => {
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
                setUploadProgress((entries) => entries.map((entry) => entry.packId === packId ? { ...entry, progress } : entry));
            });
            setUploadProgress((entries) => entries.map((entry) => entry.packId === packId ? { ...entry, progress: 100, status: 'processing' } : entry));
            await refreshPacks();
            setUploadProgress((entries) => entries.filter((entry) => entry.packId !== packId));
        }
        catch (err) {
            const message = err?.message ?? 'Upload failed';
            emitError(message);
            setUploadProgress((entries) => entries.map((entry) => entry.packId === packId ? { ...entry, status: 'error', error: message } : entry));
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
