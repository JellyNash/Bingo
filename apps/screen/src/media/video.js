import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export function IntroVideo({ videoUrl = '/videos/intro.mp4', onEnded }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [showSkip, setShowSkip] = useState(false);
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const play = async () => {
        if (!videoRef.current)
            return;
        try {
            setIsPlaying(true);
            // Request fullscreen on container
            if (containerRef.current?.requestFullscreen) {
                await containerRef.current.requestFullscreen().catch(() => { });
            }
            // Start playback
            videoRef.current.currentTime = 0;
            await videoRef.current.play();
            // Show skip button after 2 seconds
            setTimeout(() => setShowSkip(true), 2000);
        }
        catch (error) {
            console.error('Failed to play intro video:', error);
            handleEnd();
        }
    };
    const stop = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
        handleEnd();
    };
    const handleEnd = () => {
        setIsPlaying(false);
        setShowSkip(false);
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        onEnded?.();
    };
    const handleKeyDown = (e) => {
        if (isPlaying && (e.key === 'Escape' || e.key === ' ')) {
            e.preventDefault();
            stop();
        }
    };
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying]);
    // Expose play method to parent
    useEffect(() => {
        window.playIntroVideo = play;
        return () => {
            delete window.playIntroVideo;
        };
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(AnimatePresence, { children: isPlaying && (_jsxs(motion.div, { ref: containerRef, initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[100] bg-black", onClick: stop, children: [_jsx("video", { ref: videoRef, className: "h-full w-full object-contain", src: videoUrl, onEnded: handleEnd, onError: handleEnd, playsInline: true, muted: false, onClick: (e) => e.stopPropagation() }), showSkip && (_jsx(motion.button, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "absolute bottom-8 right-8 rounded-lg bg-white/10 px-6 py-3 text-white backdrop-blur-sm transition-all hover:bg-white/20", onClick: stop, children: "Skip Intro \u2192" }))] })) }), _jsx("video", { ref: videoRef, className: "hidden", src: videoUrl, preload: "auto", muted: true })] }));
}
// Hook to use intro video
export function useIntroVideo() {
    const [showIntro, setShowIntro] = useState(false);
    const playIntro = () => {
        setShowIntro(true);
        // Trigger play via global function
        setTimeout(() => {
            window.playIntroVideo?.();
        }, 100);
    };
    const onIntroEnd = () => {
        setShowIntro(false);
    };
    return {
        showIntro,
        playIntro,
        onIntroEnd,
        IntroVideoComponent: () => showIntro ? _jsx(IntroVideo, { onEnded: onIntroEnd }) : null
    };
}
