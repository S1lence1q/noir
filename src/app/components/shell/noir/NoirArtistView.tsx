import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Play, Radio, Shuffle } from 'lucide-react';
import { SearchResult, VerifiedArtist } from '../../../types';
import { NoirRankedSongRow } from './NoirRankedSongRow';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirArtwork, preloadArtwork } from './NoirArtwork';
import { NoirArtistDisambiguation } from './NoirArtistDisambiguation';
import { NoirHomeShelf } from './NoirHomeShelf';
import { isTrackFavorite } from '../../../utils/favoriteUtils';
import { COLOR_WORLDS, worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION, prefersReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import {
  getArtistAlbums,
  getArtistBio,
  getSimilarArtists,
  type ArtistBio,
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
/** Upper bound on holding the above-the-fold reveal (D3); after this, show what we have. */
const REVEAL_MAX_WAIT_MS = 1200;

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

function formatCountry(country?: string): string | null {
  if (!country) return null;
  if (country.length === 2) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(country.toUpperCase()) ?? country;
    } catch {
      return country;
    }
  }
  return country;
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
  const [discogFilter, setDiscogFilter] = useState<'all' | 'albums' | 'singles'>('all');
  const [artistBio, setArtistBio] = useState<ArtistBio | null>(null);
  const artistKey = `${artist.name.toLowerCase()}::${artist.deezerId ?? ''}`;
  // D3 reveal gate: which artist the albums / portrait belong to, and whether we stopped waiting.
  const [albumsFor, setAlbumsFor] = useState<string | null>(null);
  const [portraitFor, setPortraitFor] = useState<string | null>(null);
  const [gaveUpFor, setGaveUpFor] = useState<string | null>(null);
  const [latestArtFor, setLatestArtFor] = useState<string | null>(null);
  const [bioExpanded, setBioExpanded] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const [bioOverflows, setBioOverflows] = useState(false);
  const world = worldForCollection(`artist:${artist.name.toLowerCase()}`);
  const palette = COLOR_WORLDS[world];
  const unique = useMemo(() => dedupeTracks(tracks, artist.name), [tracks, artist.name]);
  const visible = showAll ? unique : unique.slice(0, POPULAR_COUNT);

  const latestRelease = useMemo(() => {
    if (albums.length === 0) return null;
    const sorted = [...albums].sort((a, b) => {
      const dateA = a.releaseDate || a.year || '';
      const dateB = b.releaseDate || b.year || '';
      return dateB.localeCompare(dateA);
    });
    return sorted[0] ?? null;
  }, [albums]);

  const hasAlbums = useMemo(
    () => albums.some((a) => a.recordType === 'album' || a.recordType === 'compile'),
    [albums]
  );
  const hasSingles = useMemo(
    () => albums.some((a) => a.recordType === 'single' || a.recordType === 'ep'),
    [albums]
  );
  const showFilterTabs = hasAlbums && hasSingles;

  const filteredAlbums = useMemo(() => {
    if (!showFilterTabs || discogFilter === 'all') return albums;
    if (discogFilter === 'albums') {
      return albums.filter((a) => a.recordType === 'album' || a.recordType === 'compile');
    }
    return albums.filter((a) => a.recordType === 'single' || a.recordType === 'ep');
  }, [albums, discogFilter, showFilterTabs]);

  const latestTypeLabel = latestRelease
    ? latestRelease.recordType === 'single'
      ? strings.artist.single
      : latestRelease.recordType === 'ep'
        ? strings.artist.ep
        : strings.artist.album
    : '';

  const resolvedTags = useMemo(() => {
    if (artist.tags && artist.tags.length > 0) return artist.tags;
    const albumGenres = Array.from(
      new Set(
        albums
          .map((a) => a.genre)
          .filter((g): g is string => typeof g === 'string' && g.length > 0)
      )
    );
    return albumGenres;
  }, [artist.tags, albums]);

  useEffect(() => {
    setShowAll(false);
    setDiscogFilter('all');
    const scroller = containerRef.current?.closest('.overflow-y-auto');
    if (scroller) {
      scroller.scrollTop = 0;
    }
    let active = true;
    // Never show the previous artist's releases / fans while the new ones load.
    setAlbums([]);
    setSimilarArtists([]);
    const key = artistKey;
    const giveUp = window.setTimeout(() => active && setGaveUpFor(key), REVEAL_MAX_WAIT_MS);
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
        setAlbumsFor(key);
      })
      .catch(() => {
        if (!active) return;
        setAlbums([]);
        setAlbumsFor(key);
      });

    setArtistBio(null);
    setBioExpanded(false);
    getArtistBio(artist.name)
      .then((bio) => {
        if (!active) return;
        setArtistBio(bio ?? null);
      })
      .catch(() => {
        if (!active) return;
        setArtistBio(null);
      });

    return () => {
      active = false;
      window.clearTimeout(giveUp);
    };
  }, [artist.name, artist.deezerId]);

  // Portrait counts as ready once decoded, or confirmed missing after tracks resolved.
  useEffect(() => {
    const key = artistKey;
    const src = artist.thumbnail;
    if (!src) {
      if (!isLoading) setPortraitFor(key);
      return;
    }
    let active = true;
    void preloadArtwork(src).then(() => active && setPortraitFor(key));
    return () => {
      active = false;
    };
  }, [artistKey, artist.thumbnail, isLoading]);

  // The latest release cover is above the fold too: decode it before the reveal.
  const latestImage = albumsFor === artistKey ? latestRelease?.image : undefined;
  useEffect(() => {
    if (albumsFor !== artistKey) return;
    const key = artistKey;
    if (!latestImage) {
      setLatestArtFor(key);
      return;
    }
    let active = true;
    void preloadArtwork(latestImage).then(() => active && setLatestArtFor(key));
    return () => {
      active = false;
    };
  }, [albumsFor, artistKey, latestImage]);

  const albumCount = albums.filter((a) => a.recordType === 'album' || a.recordType === 'compile').length;
  const singleCount = albums.filter((a) => a.recordType === 'single' || a.recordType === 'ep').length;

  // Clamp by lines (no mid-word slicing); only offer "Read more" when the clamp actually cuts.
  useEffect(() => {
    const el = bioRef.current;
    if (!el || bioExpanded) return;
    setBioOverflows(el.scrollHeight > el.clientHeight + 2);
  });

  const revealed =
    gaveUpFor === artistKey ||
    (!isLoading &&
      albumsFor === artistKey &&
      portraitFor === artistKey &&
      latestArtFor === artistKey);

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
          <NoirArtwork
            source={artist.thumbnail || undefined}
            world={world}
            seed={`artist:${artist.name}`}
            size={320}
            radius={0}
            pending={isLoading}
          />
        </motion.div>

        <div className="noir-artist-hero-text">
          <p className="noir-artist-hero-label">{strings.artist.label}</p>
          <h1
            className={`noir-artist-hero-name${artist.name.length > 16 ? ' is-long' : ''}`}
            title={artist.name}
          >
            {artist.name}
          </h1>
          {/* Fixed-height line: skeleton until the page reveals, then the meta fades in — never swaps text. */}
          <p className="noir-artist-hero-meta">
            {!revealed ? (
              <span className="noir-artist-hero-meta-skeleton" aria-hidden />
            ) : (
              <motion.span
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={MOTION.panel}
              >
                {[resolvedTags.slice(0, 2).join(' · '), formatCountry(artist.country)].filter(Boolean).join(' · ')}
              </motion.span>
            )}
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

      {!revealed ? (
        // Exact-shape skeleton of Popular + Latest release; both reveal together.
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]" aria-busy="true" aria-label={strings.artist.loading}>
          <section className="min-w-0">
            <h2 className="noir-section-title mb-4 px-1">{strings.artist.popular}</h2>
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: POPULAR_COUNT }).map((_, i) => (
                <div key={i} className="noir-artist-row-skeleton">
                  <span className="noir-skeleton-box w-6" />
                  <span className="noir-skeleton-box h-12 w-12 rounded-[6px]" />
                  <span className="flex flex-1 flex-col gap-2">
                    <span className="noir-skeleton-box h-3" style={{ width: `${[46, 38, 52, 34, 42][i]}%` }} />
                    <span className="noir-skeleton-box h-2.5 w-[18%]" />
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="hidden min-w-0 lg:block">
            <h2 className="noir-section-title mb-4 px-1">{strings.artist.latestRelease}</h2>
            <div className="px-1">
              <span className="noir-skeleton-box block aspect-square w-full max-w-[232px]" />
              <span className="noir-skeleton-box mt-3 block h-3 w-[60%]" />
              <span className="noir-skeleton-box mt-2 block h-2.5 w-[35%]" />
            </div>
          </section>
        </div>
      ) : (
        <motion.div
          className={`mt-10 grid gap-10 ${latestRelease ? 'lg:grid-cols-[minmax(0,1fr)_240px]' : 'grid-cols-1'}`}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION.panel}
        >
        <section className="min-w-0 flex flex-col">
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
        {latestRelease && (
          <section className="flex min-w-0 flex-col">
            <h2 className="noir-section-title mb-4 px-1">{strings.artist.latestRelease}</h2>
            <motion.div
              role="button"
              tabIndex={0}
              onClick={() => onSelectAlbum?.(latestRelease)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAlbum?.(latestRelease);
                }
              }}
              className="noir-artist-latest group elva-focus-ring"
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: EASE_PREMIUM }}
            >
              <div className="noir-artist-latest-cover">
                <NoirArtwork
                  source={latestRelease.image}
                  world={worldForCollection(`album:${latestRelease.id}`)}
                  seed={`album:${latestRelease.id}`}
                  size={240}
                  className="!h-full !w-full"
                />
                {onPlayAlbum && (
                  <motion.button
                    type="button"
                    className="noir-discover-release-play noir-play-round !h-11 !w-11 elva-focus-ring"
                    aria-label={`${strings.artist.playAlbum}: ${latestRelease.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayAlbum(latestRelease);
                    }}
                    whileTap={{ scale: 0.94 }}
                    transition={MOTION.tap}
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </motion.button>
                )}
              </div>
              <span className="noir-song-title mt-3 block truncate">{latestRelease.title}</span>
              <span className="noir-song-meta mt-0.5 block truncate">
                {latestTypeLabel}
                {latestRelease.year ? ` · ${latestRelease.year}` : ''}
              </span>
            </motion.div>
          </section>
        )}
      </motion.div>
      )}

      {revealed && albums.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <h2 className="noir-section-title">{strings.artist.discography}</h2>
            {showFilterTabs && (
              <div className="flex items-center gap-1.5" role="tablist" aria-label={strings.artist.discography}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={discogFilter === 'all'}
                  onClick={() => setDiscogFilter('all')}
                  data-active={discogFilter === 'all'}
                  className="noir-filter-chip elva-focus-ring cursor-pointer"
                >
                  {strings.artist.filterAll}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={discogFilter === 'albums'}
                  onClick={() => setDiscogFilter('albums')}
                  data-active={discogFilter === 'albums'}
                  className="noir-filter-chip elva-focus-ring cursor-pointer"
                >
                  {strings.artist.filterAlbums}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={discogFilter === 'singles'}
                  onClick={() => setDiscogFilter('singles')}
                  data-active={discogFilter === 'singles'}
                  className="noir-filter-chip elva-focus-ring cursor-pointer"
                >
                  {strings.artist.filterSingles}
                </button>
              </div>
            )}
          </div>
          <NoirHomeShelf>
            {filteredAlbums.map((album, i) => (
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
                  <NoirArtwork
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

      {revealed && similarArtists.length >= 3 && (
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

      {revealed && artistBio && (
        <motion.section
          className="mt-12"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION.panel}
        >
          <h2 className="noir-section-title mb-4 px-1">{strings.artist.aboutArtist(artist.name)}</h2>
          {/* Text only: the hero already carries the portrait (one graphic beat per screen). */}
          <div className="noir-artist-about">
            <div className="min-w-0">
              <p
                ref={bioRef}
                className={`noir-artist-about-bio${bioExpanded ? ' is-expanded' : ''}`}
              >
                {artistBio.text}
              </p>
              {(bioOverflows || bioExpanded) && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((prev) => !prev)}
                  className="noir-link mt-3 elva-focus-ring"
                >
                  {bioExpanded ? strings.artist.readLess : strings.artist.readMore}
                </button>
              )}
            </div>
            <dl className="noir-artist-about-facts">
              {formatCountry(artist.country) && (
                <div>
                  <dt>{strings.artist.factFrom}</dt>
                  <dd>{formatCountry(artist.country)}</dd>
                </div>
              )}
              {albumCount > 0 && (
                <div>
                  <dt>{strings.artist.factAlbums}</dt>
                  <dd>{albumCount}</dd>
                </div>
              )}
              {singleCount > 0 && (
                <div>
                  <dt>{strings.artist.factSingles}</dt>
                  <dd>{singleCount}</dd>
                </div>
              )}
              <div>
                <dt>{strings.artist.factSource}</dt>
                <dd>
                  {artistBio.source === 'lastfm' ? strings.artist.sourceLastFm : strings.artist.sourceWikipedia}
                </dd>
              </div>
            </dl>
          </div>
        </motion.section>
      )}
    </div>
  );
}
