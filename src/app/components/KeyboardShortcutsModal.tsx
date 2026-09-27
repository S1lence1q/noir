import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Keyboard, X } from 'lucide-react';
import { AccentColor, ACCENT_THEMES } from './themeUtils';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: AccentColor;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  accentColor,
}) => {
  const theme = ACCENT_THEMES[accentColor];
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-2xl pointer-events-auto cursor-default"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            className="w-[500px] rounded-[32px] border border-white/10 bg-[#0f0f11]/85 p-8 relative overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle top ambient color gradient */}
            <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full ${theme.bg} blur-3xl pointer-events-none`} />
            <div className={`absolute -bottom-16 -left-16 w-36 h-36 rounded-full ${theme.bgFade} blur-3xl pointer-events-none`} />

            {/* Title Header */}
            <div className="flex items-center justify-between mb-8 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <Keyboard className={`w-5 h-5 ${theme.text}`} />
                </div>
                <div>
                  <h3 className="text-lg font-medium tracking-tight text-white/95 leading-none">Keyboard Shortcuts</h3>
                  <p className="text-[11px] font-light text-white/40 mt-1 uppercase tracking-wider">Elva Power-User Map</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                title="Close Map"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of keys */}
            <div className="space-y-4 text-xs">
              {[
                { keys: ['Space'], desc: 'Play / Pause music' },
                { keys: ['↑', '↓'], desc: 'Adjust volume' },
                { keys: ['M'], desc: 'Mute / Unmute audio' },
                { keys: ['←', '→'], desc: 'Seek 5s backward / forward' },
                { keys: ['L'], desc: 'Toggle lyrics beside cover' },
                { keys: ['Q'], desc: 'Toggle active queue drawer' },
                { keys: [isMac ? '⌘' : 'Ctrl', 'N'], desc: 'Create a new playlist' },
                { keys: [isMac ? '⌘' : 'Ctrl', ','], desc: 'Open settings menu' },
                { keys: ['?'], desc: 'Toggle keyboard shortcut map' },
                { keys: ['Esc'], desc: 'Close any active overlays / map' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-white/[0.02]">
                  <span className="font-light text-white/60 tracking-wide">{item.desc}</span>
                  <div className="flex items-center gap-1.5">
                    {item.keys.map((k, kIdx) => (
                      <kbd 
                        key={kIdx} 
                        className="px-2.5 py-1 rounded-[6px] bg-white/[0.04] border border-white/10 text-white/80 font-mono text-[10px] uppercase font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-tight min-w-[24px] text-center"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <span className="text-[10px] text-white/30 font-light tracking-widest uppercase">Press ? or Esc to close at any time</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
