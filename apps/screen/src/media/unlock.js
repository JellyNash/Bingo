import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export function useAudioUnlock(audioContext) {
    const [unlocked, setUnlocked] = useState(false);
    useEffect(() => {
        // Check if already unlocked from previous session
        const savedUnlock = localStorage.getItem('audioUnlocked');
        if (savedUnlock === '1') {
            setUnlocked(true);
            // Still need to resume context
            if (audioContext?.state === 'suspended') {
                audioContext.resume();
            }
        }
    }, [audioContext]);
    const unlock = async () => {
        if (unlocked)
            return;
        try {
            if (audioContext) {
                // Resume context
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                // Play silent buffer (iOS Safari quirk)
                const buffer = audioContext.createBuffer(1, 1, 22050);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);
                console.log('Audio context unlocked');
            }
            // Save unlock state
            localStorage.setItem('audioUnlocked', '1');
            setUnlocked(true);
        }
        catch (error) {
            console.error('Failed to unlock audio:', error);
            throw error;
        }
    };
    return { unlocked, unlock };
}
export function AudioUnlockOverlay({ show, onUnlock }) {
    if (!show)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm", children: _jsx("button", { onClick: onUnlock, className: "group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-1 transition-all hover:scale-105", children: _jsxs("div", { className: "relative rounded-xl bg-gray-900 px-8 py-6 text-center", children: [_jsx("div", { className: "mb-3", children: _jsx("svg", { className: "mx-auto h-12 w-12 text-white opacity-80", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m0-9.9a5 5 0 00-1.414 1.414M8.464 8.464L12 12l3.536 3.536M12 3v9m0 0v9" }) }) }), _jsx("h2", { className: "mb-2 text-2xl font-bold text-white", children: "Enable Sound" }), _jsx("p", { className: "mb-4 text-sm text-gray-300", children: "Tap to enable audio for the best bingo experience" }), _jsxs("div", { className: "inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white", children: [_jsxs("svg", { className: "h-4 w-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v.01M17.66 6.34l-.01.01M20 12h-.01M17.66 17.66l-.01.01M12 20v-.01M6.34 17.66l.01.01M4 12h.01M6.34 6.34l.01.01" })] }), _jsx("span", { children: "Click to Continue" })] })] }) }) }));
}
