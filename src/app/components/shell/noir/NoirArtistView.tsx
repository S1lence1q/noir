import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Radio, Shuffle } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirArtistDisambiguation } from './NoirArtistDisambiguation';
import { NoirHomeShelf } from './NoirHomeShelf';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { COLOR_WORLDS, worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import {
  getArtistAlbums,
  getSimilarArtists,
  type GraphAlbum,
  type GraphArtist,
} from '../../../services/musicGraph';
import { prefetchArtistProfile } from '../../../utils/artistDiscographyLoader';
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
  onSelectArtist?: (artist: VerifiedArtist) => void;
  onPlayAlbum?: (album: GraphAlbum) => void;
  onSelectAlbum?: (album: GraphAlbum) => void;
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
  onSelectArtist,
  onPlayAlbum,
  onSelectAlbum,
}: NoirArtistViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = prefersReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const [similarArtists, setSimilarArtists] = useState<GraphArtist[]>([]);
  const [albums, setAlbums] = useState<GraphAlbum[]>([]);
  const world = worldForCollection(`artist:${artist.name.toLowerCase()}`);
  const palette = COLOR_WORLDS[world];
  const unique = useMemo(() => dedupeTracks(tracks, artist.name), [tracks, artist.name]);
  const visible = showAll ? unique : unique.slice(0, POPULAR_COUNT);

  useEffect(() => {
    setShowAll(false);
    const scroller = containerRef.current?.closest('.overflow-y-auto');
    if (scroller) {
      scroller.scrollTop = 0;
    }
    let active = true;
    getSimilarArtists(artist.name, 10, artist.deezerId)
      .then((results) => {
        if (!active) return;
        const normalizedArtistName = artist.name.trim().toLowerCase();
        const filtered = results.filter(
          (r) => r.name.trim().toLowerCase() !== normalizedArtistName
        );
        setSimilarArtists(filtered);
      })
      .catch(() => {
        if (!active) return;
        setSimilarArtists([]);
      });

    getArtistAlbums(artist.name, artist.deezerId)
      .then((res) => {
        if (!active) return;
        setAlbums(res);
      })
      .catch(() => {
        if (!active) return;
        setAlbums([]);
      });

    return () => {
      active = false;
    };
  }, [artist.name, artist.deezerId]);

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
    <div ref={containerRef} className="flex w-full flex-col pb-6">
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
            {isLoading && unique.length === 0
              ? strings.artist.loading
              : artist.listeners
                ? strings.artist.metaWithListeners(artist.listeners, unique.length)
                : strings.artist.songCount(unique.length)}
          </p>
          {artist.tags && artist.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5 opacity-90">
              {artist.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-current/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider opacity-85"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
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
        {unique.length > 0 ? (
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
        ) : isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: POPULAR_COUNT }).map((_, i) => (
              <div key={i} className="noir-skeleton h-[72px] rounded-[var(--noir-radius-md)]" />
            ))}
          </div>
        ) : (
          <p className="px-1 py-8 text-[14px] text-[color:var(--noir-text-secondary)]">{strings.artist.empty}</p>
        )}
      </section>

      {albums.length > 0 && (
        <section className="mt-12">
          <h2 className="noir-section-title mb-4 px-1">{strings.artist.discography}</h2>
          <NoirHomeShelf>
            {albums.map((album, i) => (
              <motion.div
                key={album.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectAlbum?.(album)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAlbum?.(album);
                  }
                }}
                className="noir-collection-card noir-home-shelf-card group elva-focus-ring cursor-pointer"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: i * 0.025 }}
              >
                <span className="relative block">
                  <NoirDitherCover
                    source={album.image}
                    world={worldForCollection(`album:${album.id}`)}
                    seed={`album:${album.id}`}
                    size={168}
                  />
                  {onPlayAlbum && (
                    <motion.button
                      type="button"
                      className="noir-discover-release-play noir-play-round !h-10 !w-10 elva-focus-ring"
                      aria-label={`${strings.artist.playAlbum}: ${album.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayAlbum(album);
                      }}
                      whileTap={{ scale: 0.94 }}
                      transition={MOTION.tap}
                    >
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </motion.button>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="noir-song-title block truncate">{album.title}</span>
                  <span className="noir-song-meta mt-0.5 block truncate">
                    {album.year ? `${album.year} · ` : ''}
                    {album.recordType === 'single'
                      ? strings.artist.single
                      : album.recordType === 'ep'
                        ? strings.artist.ep
                        : strings.artist.album}
                  </span>
                </span>
              </motion.div>
            ))}
          </NoirHomeShelf>
        </section>
      )}

      {similarArtists.length >= 3 && (
        <section className="mt-12">
          <h2 className="noir-section-title mb-4 px-1">{strings.artist.fansAlsoLike}</h2>
          <NoirHomeShelf>
            {similarArtists.map((sim) => {
              const simWorld = worldForCollection(`artist:${sim.name.toLowerCase()}`);
              return (
                <button
                  key={sim.name}
                  type="button"
                  onClick={() =>
                    onSelectArtist?.({
                      name: sim.name,
                      thumbnail: sim.image,
                    })
                  }
                  onMouseEnter={() =>
                    void prefetchArtistProfile({
                      name: sim.name,
                    })
                  }
                  onFocus={() =>
                    void prefetchArtistProfile({
                      name: sim.name,
                    })
                  }
                  className="noir-home-artist group elva-focus-ring"
                >
                  <span className="noir-home-artist-art">
                    {sim.image ? (
                      <img
                        src={sim.image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <NoirDitherCover
                        world={simWorld}
                        seed={`artist:${sim.name}`}
                        size={108}
                        radius={999}
                      />
                    )}
                  </span>
                  <span className="noir-song-title mt-3 block truncate text-center">
                    {sim.name}
                  </span>
                </button>
              );
            })}
          </NoirHomeShelf>
        </section>
      )}
    </div>
  );
}
