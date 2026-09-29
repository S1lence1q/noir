import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import type { AccentColor } from './themeUtils';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../utils/motionPresets';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Kept for the call site; the NOIR map doesn't tint by accent. */
  accentColor?: AccentColor;
}

type Shortcut = { keys: string[]; desc: string };

/** The `?` map. Same surface and motion as the search palette; every row here is wired. */
export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const reduced = prefersReducedMotion();
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const mod = isMac ? '⌘' : 'Ctrl';

  const groups: { title: string; items: Shortcut[] }[] = [
    {
      title: 'Playback',
      items: [
        { keys: ['Space'], desc: 'Play / pause' },
        { keys: ['←', '→'], desc: 'Seek 5 s' },
        { keys: [mod, '←', '→'], desc: 'Previous / next song' },
        { keys: [mod, '↑', '↓'], desc: 'Volume' },
        { keys: ['M'], desc: 'Mute' },
      ],
    },
    {
      title: 'Now Playing',
      items: [
        { keys: ['L'], desc: 'Lyrics' },
        { keys: ['Q'], desc: 'Next up' },
        { keys: ['Esc'], desc: 'Close' },
      ],
    },
    {
      title: 'Go to',
      items: [
        { keys: [mod, 'K'], desc: 'Search' },
        { keys: [mod, 'N'], desc: 'New playlist' },
        { keys: [mod, ','], desc: 'Settings' },
        { keys: ['?'], desc: 'This map' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="shortcut-map"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: MOTION.exit }}
          transition={{ duration: reduced ? 0.12 : 0.18 }}
          className="noir-shortcuts-root"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="noir-shortcuts"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.985, transition: MOTION.exit }
            }
            transition={{ duration: reduced ? 0.12 : 0.24, ease: EASE_PREMIUM }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="noir-shortcuts-head">
              <h2 className="noir-shortcuts-title">Keyboard shortcuts</h2>
              <button type="button" onClick={onClose} className="noir-search-palette-close elva-focus-ring" aria-label="Close">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </header>
            <div className="noir-shortcuts-body">
              {groups.map((group) => (
                <section key={group.title}>
                  <p className="noir-search-palette-label">{group.title}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.desc} className="noir-shortcuts-row">
                        <span>{item.desc}</span>
                        <span className="noir-shortcuts-keys">
                          {item.keys.map((k) => (
                            <kbd key={k} className="noir-shortcuts-kbd">
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
