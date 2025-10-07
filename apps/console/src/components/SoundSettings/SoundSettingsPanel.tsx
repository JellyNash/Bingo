import React, { ChangeEvent, useEffect, useState } from 'react';
import { AudioPack, UploadProgress, CountdownSettings } from '../../hooks/useAudioSettings';

interface SoundSettingsPanelProps {
  loading: boolean;
  error: string | null;
  musicPacks: AudioPack[];
  sfxPacks: AudioPack[];
  voicePacks: AudioPack[];
  currentMusic: { lobby: string | null; game: string | null };
  currentSfx: string | null;
  currentVoice: string | null;
  countdown: CountdownSettings;
  uploadProgress: UploadProgress[];
  onSelectMusic: (slot: 'lobby' | 'game', packId: string | null) => Promise<void>;
  onSelectSfx: (packId: string | null) => Promise<void>;
  onSelectVoice: (packId: string | null) => Promise<void>;
  onToggleCountdown: (enabled: boolean) => Promise<void>;
  onCountdownDuration: (seconds: number) => Promise<void>;
  onCountdownMessage: (message: string) => Promise<void>;
  onUploadPack: (file: File) => Promise<void>;
}

function PackList({
  title,
  description,
  packs,
  activePackId,
  onSelect,
}: {
  title: string;
  description: string;
  packs: AudioPack[];
  activePackId: string | null;
  onSelect: (packId: string | null) => Promise<void> | void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/60">{description}</p>
      </div>
      <div className="grid gap-3">
        {packs.map((pack) => (
          <div key={pack.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{pack.name}</div>
                <div className="text-xs text-white/50">{pack.files.length} file{pack.files.length === 1 ? '' : 's'}</div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await onSelect(pack.packId);
                  } catch (_) {}
                }}
                className={`px-3 py-1 rounded-lg text-sm transition ${activePackId === pack.packId
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
              >
                {activePackId === pack.packId ? 'Selected' : 'Select'}
              </button>
            </div>
            {pack.description && (
              <div className="text-xs text-white/50 mt-2">{pack.description}</div>
            )}
          </div>
        ))}
        {packs.length === 0 && (
          <div className="p-4 text-center text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl">
            No packs uploaded yet.
          </div>
        )}
      </div>
    </section>
  );
}

export function SoundSettingsPanel(props: SoundSettingsPanelProps) {
  const {
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
    onSelectMusic,
    onSelectSfx,
    onSelectVoice,
    onToggleCountdown,
    onCountdownDuration,
    onCountdownMessage,
    onUploadPack,
  } = props;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localMessage, setLocalMessage] = useState(countdown.message);
  const [localDuration, setLocalDuration] = useState(countdown.durationSeconds);

  useEffect(() => {
    setLocalMessage(countdown.message);
    setLocalDuration(countdown.durationSeconds);
  }, [countdown.message, countdown.durationSeconds]);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await onUploadPack(selectedFile);
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }

  async function handleMessageBlur() {
    if (localMessage !== countdown.message) {
      await onCountdownMessage(localMessage);
    }
  }

  async function handleDurationSubmit() {
    if (localDuration !== countdown.durationSeconds) {
      await onCountdownDuration(localDuration);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Sound & Countdown Configuration</h2>
        <p className="text-sm text-white/60">
          Manage the music, sound effects, voice announcements, and countdown sequence for the lobby and gameplay experience.
        </p>
        {loading && <div className="text-xs text-white/50">Loading audio packs…</div>}
        {error && <div className="text-sm text-red-300">{error}</div>}
      </header>

      <div className="grid xl:grid-cols-2 gap-6">
        <PackList
          title="Lobby Music"
          description="Track played while players are joining before the game starts."
          packs={musicPacks}
          activePackId={currentMusic.lobby}
          onSelect={(packId) => onSelectMusic('lobby', packId)}
        />
        <PackList
          title="In-Game Music"
          description="Background music during active number draws."
          packs={musicPacks}
          activePackId={currentMusic.game}
          onSelect={(packId) => onSelectMusic('game', packId)}
        />
        <PackList
          title="Sound Effects"
          description="Player join, bingo celebrations, and countdown cues."
          packs={sfxPacks}
          activePackId={currentSfx}
          onSelect={(packId) => onSelectSfx(packId)}
        />
        <PackList
          title="Voice Packs"
          description="Spoken number announcements and prompts."
          packs={voicePacks}
          activePackId={currentVoice}
          onSelect={(packId) => onSelectVoice(packId)}
        />
      </div>

      <section className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Countdown</h3>
            <p className="text-sm text-white/60">Show a pre-game countdown on the big screen before drawing starts.</p>
          </div>
          <label className="inline-flex items-center gap-2">
            <span className="text-sm text-white/70">Enabled</span>
            <input
              type="checkbox"
              checked={countdown.enabled}
              onChange={(event) => onToggleCountdown(event.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">Duration (seconds)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={3}
                max={600}
                value={localDuration}
                onChange={(event) => setLocalDuration(Number(event.target.value))}
                onBlur={handleDurationSubmit}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                disabled={!countdown.enabled}
              />
              <button
                onClick={handleDurationSubmit}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
                disabled={!countdown.enabled}
              >
                Save
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/60 mb-2">Message</label>
            <input
              type="text"
              value={localMessage}
              onChange={(event) => setLocalMessage(event.target.value)}
              onBlur={handleMessageBlur}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
              placeholder="Get ready! Game starts soon."
              disabled={!countdown.enabled}
            />
          </div>
        </div>
      </section>

      <section className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <h3 className="text-lg font-semibold text-white">Upload New Audio Pack</h3>
        <p className="text-sm text-white/60">
          Upload a ZIP containing <code className="text-white">audio-pack.json</code> and all referenced audio files.
        </p>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="text-sm text-white"
            disabled={uploading}
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload Pack'}
          </button>
          {selectedFile && (
            <span className="text-xs text-white/60">
              {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          )}
        </div>
        {uploadProgress.length > 0 && (
          <div className="space-y-2">
            {uploadProgress.map((entry) => (
              <div key={entry.packId} className="text-sm text-white/70">
                <div className="flex justify-between">
                  <span>{entry.fileName}</span>
                  <span>{Math.round(entry.progress)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full">
                  <div
                    className={`h-2 rounded-full ${entry.status === 'error' ? 'bg-red-400' : 'bg-brand-primary'}`}
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
                {entry.status === 'error' && entry.error && (
                  <div className="text-xs text-red-300">{entry.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
