import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
function PackList({ title, description, packs, activePackId, onSelect, }) {
    return (_jsxs("section", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: title }), _jsx("p", { className: "text-sm text-white/60", children: description })] }), _jsxs("div", { className: "grid gap-3", children: [packs.map((pack) => (_jsxs("div", { className: "p-4 rounded-xl bg-white/5 border border-white/10", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-white font-medium", children: pack.name }), _jsxs("div", { className: "text-xs text-white/50", children: [pack.files.length, " file", pack.files.length === 1 ? '' : 's'] })] }), _jsx("button", { onClick: async () => {
                                            try {
                                                await onSelect(pack.packId);
                                            }
                                            catch (_) { }
                                        }, className: `px-3 py-1 rounded-lg text-sm transition ${activePackId === pack.packId
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`, children: activePackId === pack.packId ? 'Selected' : 'Select' })] }), pack.description && (_jsx("div", { className: "text-xs text-white/50 mt-2", children: pack.description }))] }, pack.id))), packs.length === 0 && (_jsx("div", { className: "p-4 text-center text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl", children: "No packs uploaded yet." }))] })] }));
}
export function SoundSettingsPanel(props) {
    const { loading, error, musicPacks, sfxPacks, voicePacks, currentMusic, currentSfx, currentVoice, countdown, uploadProgress, onSelectMusic, onSelectSfx, onSelectVoice, onToggleCountdown, onCountdownDuration, onCountdownMessage, onUploadPack, } = props;
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [localMessage, setLocalMessage] = useState(countdown.message);
    const [localDuration, setLocalDuration] = useState(countdown.durationSeconds);
    useEffect(() => {
        setLocalMessage(countdown.message);
        setLocalDuration(countdown.durationSeconds);
    }, [countdown.message, countdown.durationSeconds]);
    async function handleUpload() {
        if (!selectedFile)
            return;
        setUploading(true);
        try {
            await onUploadPack(selectedFile);
            setSelectedFile(null);
        }
        finally {
            setUploading(false);
        }
    }
    function handleFileChange(event) {
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("header", { className: "space-y-2", children: [_jsx("h2", { className: "text-2xl font-bold text-white", children: "Sound & Countdown Configuration" }), _jsx("p", { className: "text-sm text-white/60", children: "Manage the music, sound effects, voice announcements, and countdown sequence for the lobby and gameplay experience." }), loading && _jsx("div", { className: "text-xs text-white/50", children: "Loading audio packs\u2026" }), error && _jsx("div", { className: "text-sm text-red-300", children: error })] }), _jsxs("div", { className: "grid xl:grid-cols-2 gap-6", children: [_jsx(PackList, { title: "Lobby Music", description: "Track played while players are joining before the game starts.", packs: musicPacks, activePackId: currentMusic.lobby, onSelect: (packId) => onSelectMusic('lobby', packId) }), _jsx(PackList, { title: "In-Game Music", description: "Background music during active number draws.", packs: musicPacks, activePackId: currentMusic.game, onSelect: (packId) => onSelectMusic('game', packId) }), _jsx(PackList, { title: "Sound Effects", description: "Player join, bingo celebrations, and countdown cues.", packs: sfxPacks, activePackId: currentSfx, onSelect: (packId) => onSelectSfx(packId) }), _jsx(PackList, { title: "Voice Packs", description: "Spoken number announcements and prompts.", packs: voicePacks, activePackId: currentVoice, onSelect: (packId) => onSelectVoice(packId) })] }), _jsxs("section", { className: "p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Countdown" }), _jsx("p", { className: "text-sm text-white/60", children: "Show a pre-game countdown on the big screen before drawing starts." })] }), _jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-white/70", children: "Enabled" }), _jsx("input", { type: "checkbox", checked: countdown.enabled, onChange: (event) => onToggleCountdown(event.target.checked), className: "h-4 w-4" })] })] }), _jsxs("div", { className: "grid md:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs uppercase tracking-wide text-white/60 mb-2", children: "Duration (seconds)" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "number", min: 3, max: 600, value: localDuration, onChange: (event) => setLocalDuration(Number(event.target.value)), onBlur: handleDurationSubmit, className: "w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white", disabled: !countdown.enabled }), _jsx("button", { onClick: handleDurationSubmit, className: "px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-xs text-white", disabled: !countdown.enabled, children: "Save" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs uppercase tracking-wide text-white/60 mb-2", children: "Message" }), _jsx("input", { type: "text", value: localMessage, onChange: (event) => setLocalMessage(event.target.value), onBlur: handleMessageBlur, className: "w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white", placeholder: "Get ready! Game starts soon.", disabled: !countdown.enabled })] })] })] }), _jsxs("section", { className: "p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Upload New Audio Pack" }), _jsxs("p", { className: "text-sm text-white/60", children: ["Upload a ZIP containing ", _jsx("code", { className: "text-white", children: "audio-pack.json" }), " and all referenced audio files."] }), _jsxs("div", { className: "flex flex-wrap gap-3 items-center", children: [_jsx("input", { type: "file", accept: ".zip", onChange: handleFileChange, className: "text-sm text-white", disabled: uploading }), _jsx("button", { onClick: handleUpload, disabled: !selectedFile || uploading, className: "px-4 py-2 rounded-lg bg-brand-primary text-white disabled:opacity-50", children: uploading ? 'Uploading…' : 'Upload Pack' }), selectedFile && (_jsxs("span", { className: "text-xs text-white/60", children: [selectedFile.name, " (", (selectedFile.size / (1024 * 1024)).toFixed(1), " MB)"] }))] }), uploadProgress.length > 0 && (_jsx("div", { className: "space-y-2", children: uploadProgress.map((entry) => (_jsxs("div", { className: "text-sm text-white/70", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: entry.fileName }), _jsxs("span", { children: [Math.round(entry.progress), "%"] })] }), _jsx("div", { className: "w-full h-2 bg-white/10 rounded-full", children: _jsx("div", { className: `h-2 rounded-full ${entry.status === 'error' ? 'bg-red-400' : 'bg-brand-primary'}`, style: { width: `${entry.progress}%` } }) }), entry.status === 'error' && entry.error && (_jsx("div", { className: "text-xs text-red-300", children: entry.error }))] }, entry.packId))) }))] })] }));
}
