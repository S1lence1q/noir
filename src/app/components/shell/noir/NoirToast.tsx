import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';
import { NoirMark } from './NoirMark';

export type NoirToastAction = {
  label: string;
  onClick: () => void;
};

export type NoirToastOptions = {
  text: string;
  /** Optional second line, quieter. */
  description?: string;
  cover?: string;
  action?: NoirToastAction;
  /** ms. Defaults to 2000, or 3500 when there is an action. */
  duration?: number;
};

type ActiveToast = NoirToastOptions & { id: number };

const TOAST_EVENT = 'noir-toast';

/**
 * Show a toast from anywhere. One is visible at a time; a new one replaces the old
 * (the old one steps out while the new one settles in — no queueing, no stacking).
 */
export function noirToast(options: NoirToastOptions) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NoirToastOptions>(TOAST_EVENT, { detail: options }));
}

export function NoirToastHost() {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(0);
  const startedAtRef = useRef(0);
  const idRef = useRef(0);
  const reduced = prefersReducedMotion();

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const startTimer = useCallback((ms: number) => {
    clearTimer();
    remainingRef.current = ms;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<NoirToastOptions>).detail;
      if (!detail?.text) return;
      idRef.current += 1;
      setToast({ ...detail, id: idRef.current });
      startTimer(detail.duration ?? (detail.action ? 3500 : 2000));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimer();
    };
  }, [startTimer]);

  const pause = () => {
    if (!timerRef.current) return;
    clearTimer();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
  };

  const resume = () => {
    if (toast && !timerRef.current) startTimer(Math.max(800, remainingRef.current));
  };

  return (
    <div className="noir-toast-host" aria-live="polite" role="status">
      {/* "sync", not "popLayout": the outgoing toast stays in the grid cell, so the host never collapses
          and the card can't jump sideways while it fades. */}
      <AnimatePresence mode="sync" initial={false}>
        {toast && (
          <motion.div
            key={toast.id}
            className={`noir-toast${toast.action ? '' : ' noir-toast--plain'}`}
            /* Arrives like a new playlist row: grows in with a little life, the mark pops after it. */
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
            }
            transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 420, damping: 28, mass: 0.8 }}
            onMouseEnter={pause}
            onMouseLeave={resume}
          >
            <motion.span
              className="noir-toast-lead"
              initial={reduced ? false : { scale: 0.3, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.08 }}
            >
              {toast.cover ? (
                <img src={toast.cover} alt="" className="noir-toast-cover" />
              ) : (
                <NoirMark size={11} className="noir-toast-mark" />
              )}
            </motion.span>
            <motion.span
              className="noir-toast-body"
              initial={reduced ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease: EASE_PREMIUM, delay: 0.1 }}
            >
              <span className="noir-toast-text">{toast.text}</span>
              {toast.description && <span className="noir-toast-description">{toast.description}</span>}
            </motion.span>
            {toast.action && (
              <motion.button
                type="button"
                className="noir-toast-action noir-focus-ring"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.24, delay: 0.2 }}
                onClick={() => {
                  toast.action?.onClick();
                  clearTimer();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
