import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

type NoirDetailOverlayProps = {
  children: ReactNode;
  onClose: () => void;
  title?: string;
};

export function NoirDetailOverlay({ children, onClose, title }: NoirDetailOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
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
