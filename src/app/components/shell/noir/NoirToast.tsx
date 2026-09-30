import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';

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
  /** ms. Defaults to 3000, or 5000 when there is an action. */
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
      startTimer(detail.duration ?? (detail.action ? 5000 : 3000));
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
    if (toast && !timerRef.current) startTimer(Math.max(1200, remainingRef.current));
  };

  return (
    <div className="noir-toast-host" aria-live="polite" role="status">
      <AnimatePresence mode="popLayout" initial={false}>
        {toast && (
          <motion.div
            key={toast.id}
            className={`noir-toast${toast.action ? '' : ' noir-toast--plain'}`}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: withReducedMotion({ duration: 0.18, ease: 'easeIn' }) }}
            transition={withReducedMotion({ ...MOTION.settle, opacity: { duration: 0.18 } })}
            onMouseEnter={pause}
            onMouseLeave={resume}
          >
            {toast.cover && <img src={toast.cover} alt="" className="noir-toast-cover" />}
            <span className="noir-toast-body">
              <span className="noir-toast-text">{toast.text}</span>
              {toast.description && <span className="noir-toast-description">{toast.description}</span>}
            </span>
            {toast.action && (
              <button
                type="button"
                className="noir-toast-action elva-focus-ring"
                onClick={() => {
                  toast.action?.onClick();
                  clearTimer();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
