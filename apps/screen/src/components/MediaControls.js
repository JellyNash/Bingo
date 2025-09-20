import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export function MediaControls({ engine, packs = [], currentPack, onPackChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [volumes, setVolumes] = useState({
        voice: 1.0,
        sfx: 0.9,
        music: 0.6,
        master: 1.0
    });
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    useEffect(() => {
        if (engine) {
            // Load saved volumes
            const savedVolumes = engine.getVolumes();
            if (savedVolumes) {
                setVolumes(savedVolumes);
            }
        }
    }, [engine]);
    const handleVolumeChange = (key, value) => {
        const newVolumes = { ...volumes, [key]: value };
        setVolumes(newVolumes);
        engine?.setVolumes({ [key]: value });
    };
    const toggleMusic = () => {
        engine?.musicToggle();
        setIsMusicPlaying(!isMusicPlaying);
    };
    const handlePackChange = (e) => {
        const packUrl = e.target.value;
        if (packUrl && onPackChange) {
            onPackChange(packUrl);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setIsOpen(!isOpen), className: "fixed bottom-4 left-4 z-40 rounded-full bg-white/10 p-3 backdrop-blur-sm transition-all hover:bg-white/20", "aria-label": "Toggle audio controls", children: _jsx("svg", { className: "h-6 w-6 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" }) }) }), _jsx(AnimatePresence, { children: isOpen && (_jsxs(motion.div, { initial: { opacity: 0, y: 100 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 100 }, className: "fixed bottom-20 left-4 z-40 w-80 rounded-2xl bg-gray-900/95 p-6 backdrop-blur-lg shadow-2xl", children: [_jsx("h3", { className: "mb-4 text-lg font-semibold text-white", children: "Audio Controls" }), _jsxs("div", { className: "space-y-4", children: [_jsx(VolumeSlider, { label: "Voice", value: volumes.voice, onChange: (v) => handleVolumeChange('voice', v), icon: "\uD83C\uDF99\uFE0F" }), _jsx(VolumeSlider, { label: "Sound Effects", value: volumes.sfx, onChange: (v) => handleVolumeChange('sfx', v), icon: "\uD83D\uDD0A" }), _jsx(VolumeSlider, { label: "Music", value: volumes.music, onChange: (v) => handleVolumeChange('music', v), icon: "\uD83C\uDFB5" }), _jsx(VolumeSlider, { label: "Master", value: volumes.master, onChange: (v) => handleVolumeChange('master', v), icon: "\uD83D\uDD08" })] }), _jsx("button", { onClick: toggleMusic, className: `mt-4 w-full rounded-lg px-4 py-2 font-medium transition-all ${isMusicPlaying
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`, children: isMusicPlaying ? 'Music Playing' : 'Music Stopped' }), packs.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "mb-1 block text-sm text-gray-400", children: "Voice Pack" }), _jsxs("select", { value: currentPack || '', onChange: handlePackChange, className: "w-full rounded-lg bg-gray-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "Select Pack..." }), packs.map((pack) => (_jsx("option", { value: pack.url, children: pack.name }, pack.url)))] })] })), _jsx("button", { onClick: () => setIsOpen(false), className: "absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-800 hover:text-white", children: _jsx("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] })) })] }));
}
function VolumeSlider({ label, value, onChange, icon }) {
    const percentage = Math.round(value * 100);
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-1 flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-2 text-sm text-gray-300", children: [icon && _jsx("span", { children: icon }), label] }), _jsxs("span", { className: "text-xs text-gray-400", children: [percentage, "%"] })] }), _jsx("input", { type: "range", min: "0", max: "100", value: percentage, onChange: (e) => onChange(Number(e.target.value) / 100), className: "w-full cursor-pointer accent-blue-500", style: {
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #374151 ${percentage}%, #374151 100%)`
                } })] }));
}
