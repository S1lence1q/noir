import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Radio, Shuffle } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirArtistDisambiguation } from './NoirArtistDisambiguation';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { COLOR_WORLDS, worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import type { ArtistIdentity } from '../../../services/artistIdentity';

export type NoirArtistViewProps = {
  artist: VerifiedArtist;
  tracks: SearchResult[];
  isLoading: boolean;
  favorites?: SearchResult[];
  onSelectSong: (track: SearchResult) => void;
  onAddToQueue: (track: SearchResult) => void;
  onPlayNext?: (track: SearchResult) => void;
  onToggleFavorite?: (track: SearchResult) => void;
  onPlayAll?: () => void;
  onPlayFromIndex?: (index: number) => void;
  onStartRadio?: (track: SearchResult) => void;
  /** When set, show pick-one UI instead of Popular. */
  candidates?: ArtistIdentity[] | null;
  onPickCandidate?: (candidate: ArtistIdentity) => void;
};

const POPULAR_COUNT = 5;

function normalizeTitle(title: string, artist: string): string {
  const escaped = artist.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return title
    .replace(new RegExp(`^${escaped}\\s*[-–—:]\\s*`, 'i'), '')
    .replace(/\s*[([](official|audio|video|lyrics?|visualizer)[^)\]]*[)\]]/gi, '')
    .trim()
    .toLowerCase();
}

/** Uploads often repeat a song as "Artist - Title"; keep the first occurrence and remember its original index. */
function dedupeTracks(tracks: SearchResult[], artist: string) {
  const seen = new Set<string>();
  const out: { track: SearchResult; index: number }[] = [];
  tracks.forEach((track, index) => {
    const key = normalizeTitle(track.title, artist);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ track, index });
  });
  return out;
}

export function NoirArtistView({
  artist,
  tracks,
  isLoading,
  favorites = [],
  onSelectSong,
  onAddToQueue,
  onPlayNext,
  onToggleFavorite,
  onPlayAll,
  onPlayFromIndex,
  onStartRadio,
  candidates = null,
  onPickCandidate,
}: NoirArtistViewProps) {
  const reduced = prefersReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const world = worldForCollection(`artist:${artist.name.toLowerCase()}`);
  const palette = COLOR_WORLDS[world];
  const unique = useMemo(() => dedupeTracks(tracks, artist.name), [tracks, artist.name]);
  const visible = showAll ? unique : unique.slice(0, POPULAR_COUNT);

  const shuffleAll = () => {
    if (unique.length === 0 || !onPlayFromIndex) return;
    const pick = unique[Math.floor(Math.random() * unique.length)];
    onPlayFromIndex(pick.index);
  };

  if (candidates && candidates.length > 1 && onPickCandidate) {
    return (
      <div className="flex w-full flex-col pb-6">
        <NoirArtistDisambiguation
          queryName={artist.name}
          candidates={candidates}
          onPick={onPickCandidate}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col pb-6">
      <motion.section
        className="noir-artist-hero"
        style={{ background: palette.field, color: palette.mark }}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_PREMIUM }}
      >
        <motion.div
          className="noir-artist-hero-portrait"
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE_PREMIUM, delay: 0.1 }}
        >
          <NoirDitherCover
            source={artist.thumbnail || undefined}
            world={world}
            seed={`artist:${artist.name}`}
            size={320}
            radius={0}
          />
        </motion.div>

        <div className="noir-artist-hero-text">
          <p className="noir-artist-hero-label">{strings.artist.label}</p>
          <h1 className="noir-artist-hero-name">{artist.name}</h1>
          <p className="noir-artist-hero-meta">
            {isLoading ? strings.artist.loading : strings.artist.songCount(unique.length)}
          </p>
          <div className="mt-6 flex items-center gap-2">
            <motion.button
              type="button"
              disabled={unique.length === 0}
              onClick={onPlayAll}
              className="noir-artist-play elva-focus-ring"
              style={{ background: palette.mark, color: palette.field }}
              aria-label={strings.artist.play}
              whileTap={{ scale: 0.94 }}
              transition={MOTION.tap}
            >
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </motion.button>
            <button
              type="button"
              disabled={unique.length === 0}
              onClick={shuffleAll}
              className="noir-artist-icon elva-focus-ring"
              aria-label={strings.artist.shuffle}
              title={strings.artist.shuffle}
            >
              <Shuffle className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
            {onStartRadio && (
              <button
                type="button"
                disabled={unique.length === 0}
                onClick={() => {
                  const seed = unique[0]?.track;
                  if (seed) onStartRadio(seed);
                }}
                className="noir-artist-icon elva-focus-ring"
                aria-label={strings.artist.startRadio}
                title={strings.artist.startRadio}
              >
                <Radio className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </button>
            )}
          </div>
        </div>
      </motion.section>

      <section className="mt-10">
        <h2 className="noir-section-title mb-4 px-1">{strings.artist.popular}</h2>
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: POPULAR_COUNT }).map((_, i) => (
              <div key={i} className="noir-skeleton h-[72px] rounded-[var(--noir-radius-md)]" />
            ))}
          </div>
        ) : unique.length > 0 ? (
          <>
            <div className="flex flex-col gap-0.5">
              <AnimatePresence initial={false}>
                {visible.map(({ track, index }, i) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE_PREMIUM, delay: i >= POPULAR_COUNT ? (i - POPULAR_COUNT) * 0.025 : 0 }}
                  >
                    <NoirRankedSongRow
                      rank={i + 1}
                      track={track}
                      isFavorite={isTrackFavorite(favorites, track)}
                      onPlay={() => (onPlayFromIndex ? onPlayFromIndex(index) : onSelectSong(track))}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {unique.length > POPULAR_COUNT && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="noir-link mt-3 px-3 elva-focus-ring">
                {showAll ? strings.artist.showLess : strings.artist.showAll(unique.length)}
              </button>
            )}
          </>
        ) : (
          <p className="px-1 py-8 text-[14px] text-[color:var(--noir-text-secondary)]">{strings.artist.empty}</p>
        )}
      </section>
    </div>
  );
}
