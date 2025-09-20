import { Variants, Transition } from "framer-motion";

export const flipInNumber: Variants = {
  initial: { scale: 0.6, rotateX: -90, opacity: 0 },
  animate: {
    scale: 1,
    rotateX: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export const historySlide: Variants = {
  initial: { x: 16, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

export const cellMarkBounce: Variants = {
  initial: { scale: 0.9 },
  animate: {
    scale: [1.02, 1],
    transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.18 }
  }
};

export const cellMarkReverse: Variants = {
  initial: { scale: 1.08, opacity: 0.9 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 180, damping: 18, duration: 0.18 }
  }
};

export const buttonReveal: Variants = {
  initial: { y: 12, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: "easeOut" }
  }
};

export const dialogFade: Variants = {
  initial: { y: -8, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.24, ease: "easeOut" }
  },
  exit: { y: -8, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }
};

export const queueEnter: Variants = {
  initial: { y: -12, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.22, ease: "easeOut" }
  }
};

export const statusPulse: Variants = {
  animate: {
    scale: [0.98, 1.02, 1],
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};

export const sliderThumbDrag: Variants = {
  tap: { scale: 0.95 },
  drag: { scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } }
};

export const orbPulse: Variants = {
  animate: {
    scale: [0.98, 1.02, 0.98],
    transition: { duration: 2.4, ease: "easeInOut", repeat: Infinity }
  }
};

export const claimCooldown = (duration: number): Transition => ({
  duration,
  ease: "linear"
});

// Approved by Agent B — UX/UI
