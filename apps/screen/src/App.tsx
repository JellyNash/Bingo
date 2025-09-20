import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { connectSocket } from "./lib.socket";
import { WebAudioEngine } from "./media/engine";
import { attachMediaController } from "./media/controller";
import { useAudioUnlock, AudioUnlockOverlay } from "./media/unlock";
import { useIntroVideo } from "./media/video";
import { MediaControls } from "./components/MediaControls";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

const Background = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 opacity-20"
         style={{ background: "radial-gradient(circle at 20% 20%, #22d3ee 0%, transparent 40%), radial-gradient(circle at 80% 30%, #a78bfa 0%, transparent 35%)" }} />
    <motion.div
      className="absolute inset-0"
      animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
      transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
      style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 10px, transparent 10px 20px)" }}
    />
  </div>
);

const CurrentNumber: React.FC<{ value?: number }> = ({ value }) => (
  <motion.div
    key={value ?? "blank"}
    initial={{ scale: 0.6, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.8, opacity: 0 }}
    transition={{ type: "spring", stiffness: 200, damping: 20 }}
    className="text-center"
  >
    <div className="text-8xl md:text-9xl font-black tracking-wider drop-shadow-[0_0_30px_rgba(94,234,212,0.35)]">
      {value ? letterFor(value) + " " + value : "—"}
    </div>
    <div className="mt-2 text-accent/80">Now Drawing</div>
  </motion.div>
);

function letterFor(n: number) {
  if (n <= 15) return "B";
  if (n <= 30) return "I";
  if (n <= 45) return "N";
  if (n <= 60) return "G";
  return "O";
}

const RecentStrip: React.FC<{ recent: number[] }> = ({ recent }) => (
  <div className="mt-8 flex justify-center gap-2 flex-wrap max-w-5xl mx-auto">
    {recent.slice(-12).reverse().map((n) => (
      <motion.div
        key={n + "-" + Math.random()}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-14 h-14 rounded-2xl grid place-items-center bg-white/5 border border-white/10 backdrop-blur"
      >
        <div className="text-2xl font-semibold">{letterFor(n)}{n}</div>
      </motion.div>
    ))}
  </div>
);

const WinnerBanner: React.FC<{ show: boolean; payload?: any; onHide: () => void }> = ({ show, payload, onHide }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="fixed inset-0 grid place-items-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onHide}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="px-10 py-8 rounded-3xl bg-white/10 border border-white/20 text-center"
        >
          <div className="text-6xl font-extrabold text-accent drop-shadow">BINGO!</div>
          <div className="mt-3 text-xl opacity-90">
            {payload?.nickname ? `Winner: ${payload.nickname}` : "Winner detected"}
          </div>
          {payload?.pattern && <div className="mt-1 opacity-70">Pattern: {payload.pattern}</div>}
          <div className="mt-4 text-sm opacity-60">(click to dismiss)</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ReconnectingBar: React.FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <div className="fixed top-0 inset-x-0 text-center bg-yellow-500/20 text-yellow-200 py-1 text-sm">Reconnecting…</div>
  ) : null;

export default function App() {
  const q = useQuery();
  const gameId = q.get("g") ?? "42";
  const token = q.get("token") ?? "";
  const [connected, setConnected] = useState(false);
  const [current, setCurrent] = useState<number | undefined>(undefined);
  const [recent, setRecent] = useState<number[]>([]);
  const [win, setWin] = useState<any | undefined>();
  const [showWin, setShowWin] = useState(false);

  // Media system
  const [mediaEngine, setMediaEngine] = useState<WebAudioEngine | null>(null);
  const [currentPack, setCurrentPack] = useState("/media-packs/placeholder/pack.json");
  const audioUnlock = useAudioUnlock(mediaEngine?.getContext());
  const { IntroVideoComponent, playIntro } = useIntroVideo();
  const mediaControllerCleanup = useRef<(() => void) | null>(null);

  // Available media packs
  const mediaPacks = [
    { url: "/media-packs/placeholder/pack.json", name: "Placeholder (Test)" },
    { url: "/media-packs/english-female/pack.json", name: "English (Female)" }
  ];

  // Initialize media engine
  useEffect(() => {
    const engine = new WebAudioEngine();
    setMediaEngine(engine);

    // Load saved volumes
    engine.loadSavedVolumes();

    // Set initial pack
    engine.setPack(currentPack).then(() => {
      console.log("Media pack loaded:", currentPack);
    }).catch((err) => {
      console.error("Failed to load media pack:", err);
    });

    // Setup video callback
    engine.setVideoCallback(() => playIntro());

    // Expose for dev testing
    if (import.meta.env.DEV) {
      (window as any).mediaEngine = engine;
      (window as any).playIntro = playIntro;
    }

    return () => {
      // Cleanup
      if (mediaControllerCleanup.current) {
        mediaControllerCleanup.current();
      }
    };
  }, []);

  // Handle pack changes
  const handlePackChange = async (packUrl: string) => {
    if (mediaEngine) {
      try {
        await mediaEngine.setPack(packUrl);
        setCurrentPack(packUrl);
        console.log("Switched to pack:", packUrl);
      } catch (err) {
        console.error("Failed to switch pack:", err);
      }
    }
  };

  // Socket connection and media controller
  useEffect(() => {
    if (!token || !mediaEngine) return;

    const socket = connectSocket("/screen", token);

    // Setup socket events
    socket.on("connect", () => setConnected(true));
    socket.io.on("reconnect_attempt", () => setConnected(false));
    socket.io.on("reconnect", () => setConnected(true));
    socket.on("state:update", (data) => {});

    // Visual state updates (keep existing)
    socket.on("draw:next", (data) => {
      setCurrent(data.value);
      setRecent((r) => [...r, data.value]);
    });

    socket.on("claim:result", (payload: any) => {
      setWin(payload);
      setShowWin(true);
      setTimeout(() => setShowWin(false), 5000);
    });

    // Attach media controller for audio
    const cleanup = attachMediaController(socket, mediaEngine);
    mediaControllerCleanup.current = cleanup;

    return () => {
      cleanup();
      socket.close();
    };
  }, [token, gameId, mediaEngine]);

  // Audio unlock handler
  const handleAudioUnlock = async () => {
    await audioUnlock.unlock();
    if (mediaEngine) {
      await mediaEngine.resume();
    }
  };

  // Fullscreen and chroma key hotkeys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      }
      if (e.key.toLowerCase() === "c") {
        document.body.classList.toggle("bg-[#00FF00]");
      }
      // Dev test keys
      if (import.meta.env.DEV) {
        if (e.key === "1") mediaEngine?.playNumber(Math.floor(Math.random() * 75) + 1);
        if (e.key === "2") mediaEngine?.playSfx('bingo');
        if (e.key === "3") mediaEngine?.musicToggle();
        if (e.key === "4") playIntro();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mediaEngine, playIntro]);

  return (
    <div className="relative min-h-full px-6 py-10">
      <Background />
      <ReconnectingBar show={!connected} />

      {/* Audio Unlock Overlay */}
      <AudioUnlockOverlay
        show={!audioUnlock.unlocked}
        onUnlock={handleAudioUnlock}
      />

      {/* Intro Video */}
      <IntroVideoComponent />

      {/* Media Controls */}
      <MediaControls
        engine={mediaEngine}
        packs={mediaPacks}
        currentPack={currentPack}
        onPackChange={handlePackChange}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <div className="text-center text-sm opacity-60">
          Game #{gameId} • Press <kbd>F</kbd> for Fullscreen • <kbd>C</kbd> Chroma
          {import.meta.env.DEV && " • Dev: 1=Number 2=Bingo 3=Music 4=Intro"}
        </div>
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <CurrentNumber key={current ?? -1} value={current} />
          </AnimatePresence>
          <RecentStrip recent={recent} />
        </div>
      </div>

      <WinnerBanner show={showWin} payload={win} onHide={() => setShowWin(false)} />
    </div>
  );
}