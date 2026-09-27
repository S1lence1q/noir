import { motion } from 'motion/react';
import { EASE_PREMIUM } from '../utils/motionPresets';
import { NoirMark } from './shell/noir/NoirMark';

type SearchLoadingStateProps = {
  /** Tighter vertical padding for sidebar / queue */
  compact?: boolean;
};

export function SearchLoadingState({ compact = false }: SearchLoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center select-none ${
        compact ? 'py-20' : 'py-24'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE_PREMIUM }}
        className="text-[color:var(--noir-text-secondary)]"
      >
        <NoirMark size={24} spin />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: EASE_PREMIUM }}
        className="mt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35"
      >
        Searching
      </motion.p>
    </div>
  );
}
