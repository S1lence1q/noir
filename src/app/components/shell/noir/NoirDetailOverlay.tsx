import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { EASE_OUT_SMOOTH, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';

type NoirDetailOverlayProps = {
  children: ReactNode;
  onClose: () => void;
  title?: string;
};

export function NoirDetailOverlay({ children, onClose, title }: NoirDetailOverlayProps) {
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      // A page laid on top: settles in from just below. On close it steps back (fade, a hair
      // smaller) while the page underneath brightens — no drop, it isn't a sheet being thrown.
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.15 } }
          : { opacity: 0, scale: 0.99, transition: { duration: 0.2, ease: EASE_OUT_SMOOTH } }
      }
      transition={reduced ? { duration: 0.15 } : { ...MOTION.settle, opacity: { duration: 0.22 } }}
      style={{ transformOrigin: '50% 30%' }}
      className="absolute inset-0 z-40 flex flex-col bg-black"
    >
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white elva-focus-ring"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        {title && (
          <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium text-[color:var(--noir-text-secondary)]">
            {title}
          </p>
        )}
        <div className="w-10" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none pb-10">
        <div className="noir-content">{children}</div>
      </div>
    </motion.div>
  );
}
