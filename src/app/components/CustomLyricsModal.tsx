import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Check } from 'lucide-react';
import { SearchResult } from '../types';
import { AccentColor, ACCENT_THEMES } from './themeUtils';
import { toast } from 'sonner';
import { 
  parseLrc, 
  parsePlainLyrics, 
  saveCustomLyrics, 
  deleteCustomLyrics, 
  loadCustomLyrics 
} from '../utils/lyricsUtils';

interface CustomLyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SearchResult;
  songDuration: number;
  accentColor: AccentColor;
  onLyricsSaved: () => void;
}

export const CustomLyricsModal: React.FC<CustomLyricsModalProps> = ({
  isOpen,
  onClose,
  song,
  songDuration,
  accentColor,
  onLyricsSaved
}) => {
  const theme = ACCENT_THEMES[accentColor];
  
  const [lyricsText, setLyricsText] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [hasExistingLyrics, setHasExistingLyrics] = useState(false);

  // Load existing custom lyrics if they exist
  useEffect(() => {
    if (isOpen) {
      const existing = loadCustomLyrics(song.videoId, song.title, song.artist);
      if (existing) {
        setLyricsText(existing.rawText);
        setHasExistingLyrics(true);
      } else {
        setLyricsText('');
        setAutoSync(true);
        setHasExistingLyrics(false);
      }
    }
  }, [isOpen, song]);

  if (!isOpen) return null;

  // Auto-detect if text contains LRC timestamps (e.g., [01:23] or [01:23.45])
  const isLrcFormat = /\[\d{2}:\d{2}/.test(lyricsText);

  const handleSave = () => {
    const trimmed = lyricsText.trim();
    if (!trimmed) {
      toast.error("Lyrics text cannot be empty");
      return;
    }

    let parsedLines = [];
    let isSynced = false;

    if (isLrcFormat) {
      parsedLines = parseLrc(trimmed);
      isSynced = parsedLines.length > 0;
      
      if (!isSynced) {
        toast.error("Could not parse synced lyrics", {
          description: "Ensure your timestamp format matches [minutes:seconds] before each line."
        });
        return;
      }
    } else {
      const result = parsePlainLyrics(trimmed, songDuration, autoSync);
      parsedLines = result.lyrics;
      isSynced = result.isSynced;
    }

    saveCustomLyrics(song.videoId, song.title, song.artist, trimmed, isSynced, parsedLines);
    toast.success("Custom lyrics saved successfully", {
      description: isSynced ? "Your synced lyrics are ready for playback." : "Your plain-text lyrics have been updated."
    });
    
    onLyricsSaved();
    onClose();
  };

  const handleDelete = () => {
    deleteCustomLyrics(song.videoId, song.title, song.artist);
    toast.success("Custom lyrics deleted");
    onLyricsSaved();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
        >
          {/* Backdrop close */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="bg-[#0b0c10]/95 border border-white/10 rounded-[32px] p-7 md:p-8 w-full max-w-xl relative shadow-2xl flex flex-col gap-6 overflow-hidden select-none text-left z-10"
          >
            {/* Subtle Ambient Accent Glow */}
            <div
              className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
              style={{
                background: `radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)`
              }}
            />
            <div
              className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
              style={{
                background: `radial-gradient(circle, var(--theme-secondary) 0%, transparent 70%)`
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.03] border border-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all cursor-pointer z-20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-1.5 relative z-10">
              <span className={`text-[10px] font-black uppercase tracking-[0.35em] ${theme.text}`}>
                Custom Lyrics Editor
              </span>
              <h2 className="text-xl font-bold tracking-wide text-white leading-tight">
                {song.title}
              </h2>
              <p className="text-xs text-white/40 truncate font-medium">
                by {song.artist}
              </p>
            </div>

            {/* Text Area */}
            <div className="relative z-10 flex flex-col gap-2">
              <textarea
                value={lyricsText}
                onChange={(e) => setLyricsText(e.target.value)}
                placeholder="Paste plain text lyrics line-by-line, or paste timestamped LRC lyrics (e.g., [00:15.20] First line)..."
                className="w-full h-52 rounded-2xl bg-white/[0.015] focus:bg-white/[0.025] border border-white/10 focus:border-white/25 p-4 text-sm text-white font-mono placeholder-white/20 outline-none transition-all resize-none overflow-y-auto scrollbar-none"
              />
              
              {/* Helper tips */}
              <span className="text-[10px] text-white/30 tracking-wide">
                {isLrcFormat 
                  ? "Format: Synced LRC detected. Lines will scroll automatically during playback."
                  : "Format: Plain text detected. Lines will display as a static scrollable sheet."
                }
              </span>
            </div>

            {/* Toggle option for Plain Text Auto-Sync */}
            {!isLrcFormat && lyricsText.trim().length > 0 && (
              <div 
                onClick={() => setAutoSync(!autoSync)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.012] border border-white/[0.04] hover:bg-white/[0.025] hover:border-white/10 transition-all duration-300 cursor-pointer relative z-10"
              >
                <div className="flex flex-col text-left pr-4">
                  <span className="text-xs font-semibold text-white/80">Auto-distribute timings</span>
                  <span className="text-[10px] text-white/35 mt-0.5 leading-normal">
                    Line timing will be spaced evenly over song duration ({Math.floor(songDuration / 60)}m {Math.round(songDuration % 60)}s).
                  </span>
                  <span className="text-[9px] text-white/25 mt-1 leading-normal italic">
                    Note: This is a basic mathematical guess and is probably ass (won't match the singing). No fancy AI here, just dividing lines evenly for visual scrolling.
                  </span>
                </div>
                <div className={`w-8 h-5 rounded-full shrink-0 relative border transition-all duration-300 flex items-center px-0.5 ${autoSync ? `bg-white/10 ${theme.border}` : 'bg-white/5 border-white/5'}`}>
                  <motion.div 
                    animate={{ x: autoSync ? 12 : 0 }}
                    className={`w-3.5 h-3.5 rounded-full ${autoSync ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]' : 'bg-white/40'}`} 
                  />
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex justify-between items-center relative z-10 pt-2 gap-4">
              {hasExistingLyrics ? (
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-red-500/10 border border-red-500/15 hover:bg-red-500/25 hover:border-red-500/30 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer"
                  title="Remove custom lyrics"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 text-white/50 hover:text-white font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] font-bold uppercase tracking-wider text-[9px] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Save Lyrics
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
