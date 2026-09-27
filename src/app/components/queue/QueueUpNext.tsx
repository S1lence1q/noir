import { motion, AnimatePresence } from 'motion/react';
import { Music, Play, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { AccentColor } from '../themeUtils';
import { ACCENT_THEMES } from '../themeUtils';
import type { QueueItem, SearchResult } from './types';
import { openSongMenu, SongRowOptions } from '../SongRowOptions';
import { listItemEnter } from '../../utils/motionPresets';
import { strings } from '../../constants/strings';

interface QueueUpNextProps {
  items: QueueItem[];
  displayItems: QueueItem[];
  currentSongId?: string;
  songData?: { title: string; artist: string; videoId?: string };
  accentColor: AccentColor;
  activeDragIndex: number | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onClearQueue?: () => void;
  onShuffleQueue?: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  hasQuickAddLikes?: boolean;
  onPlayNext?: (song: SearchResult) => void;
  onAddToQueue?: (song: SearchResult) => void;
  onToggleFavorite?: (song: SearchResult) => void;
  favorites?: SearchResult[];
  isPlaying?: boolean;
}

export function QueueUpNext({
  items,
  displayItems,
  currentSongId,
  songData,
  accentColor,
  activeDragIndex,
  onSelect,
  onRemove,
  onClearQueue,
  onShuffleQueue,
  onDragStart,
  onDragOver,
  onDragEnd,
  hasQuickAddLikes = false,
  onPlayNext,
  onAddToQueue,
  onToggleFavorite,
  favorites = [],
  isPlaying = false,
}: QueueUpNextProps) {
  const theme = ACCENT_THEMES[accentColor];
  const emptyHint = hasQuickAddLikes ? strings.queue.emptyHintWithLikes : strings.queue.emptyHint;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between select-none">
        <h3 className="elva-section-label tracking-[0.3em]">{strings.queue.upNext}</h3>
        {items.length > 0 && (
          <div className="flex items-center gap-3">
            {onShuffleQueue && (
              <>
                <button
                  onClick={onShuffleQueue}
                  className={`text-[11px] uppercase tracking-wide font-bold transition-colors cursor-pointer ${theme.text} ${theme.textHover}`}
                >
                  Shuffle
                </button>
                <span className="text-white/10 text-[9px]">|</span>
              </>
            )}
            <button
              onClick={() => {
                if (onClearQueue) {
                  onClearQueue();
                } else {
                  items.forEach((it) => onRemove(it.id));
                  toast.info('Queue cleared');
                }
              }}
              className="text-[11px] uppercase tracking-wide text-white/35 hover:text-red-400 font-bold transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              key="queue-empty-placeholder"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl select-none"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-white/15" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-white/35 leading-tight">{strings.queue.emptyTitle}</p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('elva-queue-focus-search'))}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors mt-0.5 cursor-pointer elva-focus-ring rounded-sm text-left"
                >
                  {emptyHint} →
                </button>
              </div>
            </motion.div>
          ) : (
            displayItems.map((item, index) => {
              const isCurrent =
                (item.videoId && item.videoId === currentSongId) ||
                (songData &&
                  item.title.toLowerCase() === songData.title.toLowerCase() &&
                  item.artist.toLowerCase() === songData.artist.toLowerCase());
              const isDraggingItem = index === activeDragIndex;

              const trackData: SearchResult = {
                id: item.id,
                title: item.title,
                artist: item.artist,
                thumbnail: item.thumbnail,
                videoId: item.videoId || '',
                audioUrl: item.audioUrl || '',
              };
              const isFav = favorites.some((fav) => fav.id === (item.videoId || item.id));

              if (isDraggingItem) {
                return (
                  <motion.div
                    key={`queue-item-${item.id}`}
                    layout
                    draggable
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragEnd={onDragEnd}
                    className="w-full h-[84px] border-2 border-dashed border-white/10 bg-white/[0.015] rounded-2xl flex items-center justify-center cursor-grabbing select-none"
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <GripVertical className="w-4 h-4 text-white/15" />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={`queue-item-${item.id}`}
                  layout
                  draggable
                  onDragStart={(e) => onDragStart(e, index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={onDragEnd}
                  {...listItemEnter(index)}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => onSelect(item.id)}
                  onContextMenu={(event) =>
                    openSongMenu(trackData, event, {
                      onPlayNext,
                      onAddToQueue,
                      onToggleFavorite,
                      isFavorite: isFav,
                    })
                  }
                  className={`group relative w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 cursor-grab active:cursor-grabbing ${
                    isCurrent
                      ? 'bg-white/[0.05]'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Left accent stripe for current song */}
                  {isCurrent && (
                    <div
                      className={`absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full ${theme.borderT} bg-current`}
                      style={{ background: 'var(--theme-primary)' }}
                    />
                  )}

                  <div className="flex items-center gap-3.5 truncate mr-2 flex-1 min-w-0">
                    {/* Drag handle */}
                    <div className="text-white/15 group-hover:text-white/30 transition-colors shrink-0 cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-white/5">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
                        }}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent ? (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center gap-[3px] z-10">
                          <div className="eq-bar-1 w-[3px] rounded-full bg-white" style={{ height: '4px', animationPlayState: isPlaying ? 'running' : 'paused' }} />
                          <div className="eq-bar-2 w-[3px] rounded-full bg-white" style={{ height: '10px', animationPlayState: isPlaying ? 'running' : 'paused' }} />
                          <div className="eq-bar-3 w-[3px] rounded-full bg-white" style={{ height: '6px', animationPlayState: isPlaying ? 'running' : 'paused' }} />
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div className="text-left truncate min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate tracking-wide leading-snug transition-colors ${
                          isCurrent ? 'text-white' : 'text-white/80 group-hover:text-white/95'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <p className="text-xs text-white/40 truncate mt-1 leading-none font-normal">{item.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    <SongRowOptions
                      track={trackData}
                      onPlayNext={onPlayNext}
                      onAddToQueue={onAddToQueue}
                      onToggleFavorite={onToggleFavorite}
                      isFavorite={isFav}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                        toast.info('Removed from queue');
                      }}
                      className="p-2 hover:bg-white/8 rounded-xl transition-all cursor-pointer text-white/35 hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
