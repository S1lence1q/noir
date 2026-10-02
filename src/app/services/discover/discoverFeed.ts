import type { SearchResult } from '../../types';
import type { ListeningEvent } from '../listening/eventsStore';
import { topArtists } from '../listening/tasteProfile';
import {
  getAlbumTracks,
  getArtistImage,
  getArtistTags,
  getNewReleases,
  getArtistAlbums,
  getArtistRadio,
  getSimilarArtists,
  getTagTopTracks,
  getTrackImage,
  type GraphArtist,
  type GraphRelease,
  type GraphTrack,
} from '../musicGraph';
import { normalizeName } from '../musicGraph/normalize';
import { resolveMixCover } from '../../components/shell/noir/NoirMixCover';
import { genreTitle } from '../../utils/genreName';

const MIN_SHELF = 3;
export const RELEASE_DAYS = 45;

export type DiscoverReleaseCard = GraphRelease & {
  id: string;
};

export type DiscoverArtistCard = GraphArtist & {
  id: string;
  seedArtist: string;
};

export type DiscoverTagShelf = {
  kind: 'tag';
  id: string;
  tag: string;
  title: string;
  tracks: SearchResult[];
};

export type DiscoverFeed = {
  /** From artists you play: Home owns this one. */
  newReleases: DiscoverReleaseCard[];
  /** From artists like the ones you play: Discover's version. */
  newFromSimilar: DiscoverReleaseCard[];
  artistsLike: DiscoverArtistCard[];
  tags: DiscoverTagShelf[];
};

export function graphTrackToSearchResult(track: GraphTrack, prefix: string): SearchResult {
  const artistKey = normalizeName(track.artist) || track.artist.toLowerCase();
  const titleKey = normalizeName(track.title) || track.title.toLowerCase();
  return {
    id: `${prefix}:${artistKey}:${titleKey}`,
    title: track.title,
    artist: track.artist,
    thumbnail: track.image || '',
    videoId: '',
    duration: track.durationSec,
  };
}

export async function loadAlbumAsPlaylistTracks(release: DiscoverReleaseCard): Promise<SearchResult[]> {
  if (!release.deezerId) {
    return [
      graphTrackToSearchResult(
        { title: release.title, artist: release.artist, image: release.image },
        `release:${release.id}`
      ),
    ];
  }
  const tracks = await getAlbumTracks(release.deezerId);
  if (tracks.length === 0) {
    return [
      graphTrackToSearchResult(
        { title: release.title, artist: release.artist, image: release.image },
        `release:${release.id}`
      ),
    ];
  }
  return tracks.map((track) =>
    graphTrackToSearchResult(
      { ...track, image: track.image || release.image },
      `album:${release.deezerId}`
    )
  );
}

function playedArtistKeys(events: ReadonlyArray<ListeningEvent>) {
  const keys = new Set<string>();
  for (const event of events) {
    const key = normalizeName(event.artist);
    if (key) keys.add(key);
  }
  return keys;
}

const titleCaseTag = genreTitle;

/** Generic Last.fm tags that don't make good shelf titles. */
const SKIP_TAGS = new Set([
  'seen live',
  'favorites',
  'favourite',
  'all',
  'awesome',
  'under 2000 listeners',
]);

async function collectTopTags(artists: string[], limit = 4): Promise<string[]> {
  const scores = new Map<string, number>();

  await Promise.all(
    artists.map(async (artist, artistIndex) => {
      const tags = await getArtistTags(artist);
      tags.forEach((tag, tagIndex) => {
        const key = tag.trim().toLowerCase();
        if (!key || SKIP_TAGS.has(key) || key.length < 2) return;
        const weight = (artists.length - artistIndex) * (tags.length - tagIndex);
        scores.set(key, (scores.get(key) ?? 0) + weight);
      });
    })
  );

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, limit);
}

/** Case- and quote-insensitive, but keeps accents and punctuation: "chrome!" ≠ "Chromé". */
const strictName = (name: string) =>
  name.normalize('NFC').toLocaleLowerCase().replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();

async function buildNewReleases(artists: string[]): Promise<DiscoverReleaseCard[]> {
  const played = artists.slice(0, 6);
  const batches = await Promise.all(played.map((artist) => getNewReleases(artist, RELEASE_DAYS)));
  const seen = new Set<string>();
  const cards: DiscoverReleaseCard[] = [];

  for (const [i, batch] of batches.entries()) {
    for (const release of batch) {
      // A namesake, not your artist: the names only match once accents/punctuation are stripped
      // (you play the Danish "chrome!", the search found Taiwanese "Chromé").
      if (
        normalizeName(release.artist) === normalizeName(played[i]) &&
        strictName(release.artist) !== strictName(played[i])
      ) {
        continue;
      }
      const key = release.deezerId
        ? `dz:${release.deezerId}`
        : `${normalizeName(release.artist)}:${normalizeName(release.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({ ...release, id: key });
    }
  }

  return cards
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, 12);
}

async function buildArtistsLike(
  seedArtists: string[],
  known: Set<string>
): Promise<DiscoverArtistCard[]> {
  const batches = await Promise.all(
    seedArtists.slice(0, 5).map(async (seed) => {
      const similar = await getSimilarArtists(seed, 10);
      return similar.map((artist) => ({ artist, seed }));
    })
  );

  const seen = new Set<string>();
  const cards: DiscoverArtistCard[] = [];

  for (const batch of batches) {
    for (const { artist, seed } of batch) {
      const key = normalizeName(artist.name);
      if (!key || known.has(key) || seen.has(key)) continue;
      seen.add(key);
      cards.push({
        ...artist,
        id: `like:${key}`,
        seedArtist: seed,
      });
    }
  }

  // Prefer artists with images; fill missing images for the first shelf worth.
  const withImages = await Promise.all(
    cards.slice(0, 16).map(async (card) => {
      if (card.image) return card;
      const image = await getArtistImage(card.name);
      return image ? { ...card, image } : card;
    })
  );

  return withImages.slice(0, 12);
}

async function buildTagShelves(tags: string[]): Promise<DiscoverTagShelf[]> {
  const shelves = await Promise.all(
    tags.map(async (tag) => {
      const tracks = await getTagTopTracks(tag, 16);
      const withArt = await Promise.all(
        tracks.map(async (track) => {
          if (track.image) return track;
          const image = await getTrackImage(track.title, track.artist);
          return image ? { ...track, image } : track;
        })
      );
      const results = withArt
        .map((track) => graphTrackToSearchResult(track, `tag:${normalizeName(tag)}`))
        .filter((track) => track.title && track.artist);
      if (results.length < MIN_SHELF) return null;
      const label = titleCaseTag(tag);
      return {
        kind: 'tag' as const,
        id: `tag:${normalizeName(tag)}`,
        tag,
        title: label,
        tracks: results.slice(0, 12),
      };
    })
  );

  return shelves.filter((shelf): shelf is DiscoverTagShelf => !!shelf).slice(0, 3);
}

const FEED_TTL_MS = 30 * 60 * 1000;
const feedMemo = new Map<string, { at: number; feed: Promise<DiscoverFeed> }>();

/** Same taste within half an hour shares one fetch, so a warm-up makes Discover open ready. */
export function loadDiscoverFeed(events: ReadonlyArray<ListeningEvent>): Promise<DiscoverFeed> {
  const key = topArtists(events, 30)
    .slice(0, 8)
    .map((entry) => entry.artist)
    .join('|');
  const hit = feedMemo.get(key);
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.feed;
  const feed = buildDiscoverFeed(events);
  feedMemo.set(key, { at: Date.now(), feed });
  feed.catch(() => feedMemo.delete(key));
  return feed;
}

async function buildDiscoverFeed(events: ReadonlyArray<ListeningEvent>): Promise<DiscoverFeed> {
  const taste = topArtists(events, 30).slice(0, 8);
  const seedNames = taste.map((entry) => entry.artist);

  if (seedNames.length === 0) {
    return { newReleases: [], newFromSimilar: [], artistsLike: [], tags: [] };
  }

  const known = playedArtistKeys(events);
  for (const name of seedNames) {
    const key = normalizeName(name);
    if (key) known.add(key);
  }

  const [newReleases, artistsLike, topTags] = await Promise.all([
    buildNewReleases(seedNames),
    buildArtistsLike(seedNames, known),
    collectTopTags(seedNames.slice(0, 5)),
  ]);

  // "danish" and "denmark" are one genre: keep the first of each look-alike pair.
  const seenSymbols = new Set<string>();
  const distinctTags = topTags.filter((tag) => {
    const { symbol } = resolveMixCover(tag);
    if (symbol === 'sibling') return true;
    if (seenSymbols.has(symbol)) return false;
    seenSymbols.add(symbol);
    return true;
  });
  const [tags, newFromSimilar] = await Promise.all([
    buildTagShelves(distinctTags),
    buildNewReleases(artistsLike.map((card) => card.name)),
  ]);

  return {
    newReleases: newReleases.length >= MIN_SHELF ? newReleases : [],
    newFromSimilar: newFromSimilar.length >= MIN_SHELF ? newFromSimilar : [],
    artistsLike: artistsLike.length >= MIN_SHELF ? artistsLike : [],
    tags,
  };
}

const latestMemo = new Map<string, { at: number; cards: Promise<DiscoverReleaseCard[]> }>();

/**
 * The most recent release of each of your top artists, whatever its age. Used on Home when nothing
 * is brand new, so the shelf is never empty for someone who plays older music.
 */
export function loadLatestReleases(events: ReadonlyArray<ListeningEvent>): Promise<DiscoverReleaseCard[]> {
  const artists = topArtists(events, 30)
    .slice(0, 8)
    .map((entry) => entry.artist);
  const key = artists.join('|');
  const hit = latestMemo.get(key);
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.cards;
  const cards = buildLatestReleases(artists);
  latestMemo.set(key, { at: Date.now(), cards });
  cards.catch(() => latestMemo.delete(key));
  return cards;
}

async function buildLatestReleases(artists: string[]): Promise<DiscoverReleaseCard[]> {
  const batches = await Promise.all(
    artists.map(async (artist) => {
      const albums = await getArtistAlbums(artist, undefined, 12);
      // Newest first already; skip compilations so it reads as "their latest", not a best-of.
      const latest = albums.find((a) => a.recordType !== 'compile' && !!a.image);
      if (!latest) return null;
      // Same namesake guard as the new-releases shelf.
      if (
        normalizeName(latest.artist) === normalizeName(artist) &&
        strictName(latest.artist) !== strictName(artist)
      ) {
        return null;
      }
      return {
        id: `dz:${latest.id}`,
        title: latest.title,
        artist: latest.artist,
        releaseDate: latest.releaseDate || latest.year || '',
        image: latest.image,
        deezerId: latest.id,
      } satisfies DiscoverReleaseCard;
    })
  );
  const seen = new Set<string>();
  return batches
    .filter((card): card is DiscoverReleaseCard => card !== null)
    .filter((card) => (seen.has(card.id) ? false : (seen.add(card.id), true)))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, 10);
}

export type BecauseRow = {
  id: string;
  seed: string;
  tracks: SearchResult[];
};

const becauseMemo = new Map<string, { at: number; rows: Promise<BecauseRow[]> }>();

/** "Because you play X": similar songs by other artists, one row per top artist. */
export function loadBecauseRows(events: ReadonlyArray<ListeningEvent>): Promise<BecauseRow[]> {
  // "Kim Larsen" and "Kim Larsen & Kjukken" are one seed.
  const seeds: string[] = [];
  for (const { artist } of topArtists(events, 30)) {
    const name = normalizeName(artist);
    if (seeds.some((kept) => name.startsWith(normalizeName(kept)))) continue;
    seeds.push(artist);
    if (seeds.length === 5) break;
  }
  const key = seeds.join('|');
  const hit = becauseMemo.get(key);
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.rows;
  const rows = buildBecauseRows(seeds);
  becauseMemo.set(key, { at: Date.now(), rows });
  rows.catch(() => becauseMemo.delete(key));
  return rows;
}

async function buildBecauseRows(seeds: string[]): Promise<BecauseRow[]> {
  const rows = await Promise.all(
    seeds.map(async (seed) => {
      const radio = await getArtistRadio(seed);
      const seedKey = normalizeName(seed);
      const seen = new Set<string>();
      const tracks = radio
        .filter((track) => track.image && normalizeName(track.artist) !== seedKey)
        .map((track) => graphTrackToSearchResult(track, `because:${normalizeName(seed)}`))
        .filter((track) => (seen.has(track.id) ? false : (seen.add(track.id), true)))
        .slice(0, 12);
      return tracks.length >= MIN_SHELF ? { id: `because:${seedKey}`, seed, tracks } : null;
    })
  );
  return rows.filter((row): row is BecauseRow => row !== null);
}

/** Which row Home shows today: one per day, stepping through your top artists. */
export function dailyBecauseIndex(count: number, now = new Date()): number {
  if (count <= 0) return 0;
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  return day % count;
}
