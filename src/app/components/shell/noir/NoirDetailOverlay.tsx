import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { MOTION, prefersReducedMotion } from '../../../utils/motionPresets';

type NoirDetailOverlayProps = {
  children: ReactNode;
  onClose: () => void;
  title?: string;
};

export function NoirDetailOverlay({ children, onClose, title }: NoirDetailOverlayProps) {
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      // A page laid on top: settles in from just below. Close is the same move in reverse — the
      // page tucks down into a rounded card, shrinking and accelerating away (ease-in, so it
      // leaves with intent) while the page underneath brightens.
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985, borderRadius: 0 }}
      animate={{ opacity: 1, y: 0, scale: 1, borderRadius: 0 }}
      exit={
        reduced
          ? { opacity: 0, transition: { duration: 0.15 } }
          : {
              opacity: 0,
              y: '7%',
              scale: 0.94,
              borderRadius: 36,
              transition: { duration: 0.3, ease: [0.6, 0, 0.9, 0.4], opacity: { duration: 0.24, delay: 0.06 } },
            }
      }
      transition={reduced ? { duration: 0.15 } : { ...MOTION.settle, opacity: { duration: 0.22 } }}
      style={{ transformOrigin: '50% 30%' }}
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-black"
    >
      <header className="flex shrink-0 items-center justify-between gap-4 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="group flex h-10 items-center gap-2 rounded-full pl-3 pr-4 text-[14px] font-medium text-[color:var(--noir-text-secondary)] hover:bg-white/[0.08] hover:text-white elva-focus-ring"
          aria-label="Back"
        >
          <ArrowLeft
            className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5"
            strokeWidth={1.75}
          />
          Back
        </button>
        {title && (
          <p className="min-w-0 flex-1 truncate text-center text-[14px] font-medium text-[color:var(--noir-text-secondary)]">
            {title}
          </p>
        )}
        <div className="w-[76px]" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none pb-10">
        <div className="noir-content">{children}</div>
      </div>
    </motion.div>
  );
}
