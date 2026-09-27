import type { SearchResult } from '../../types';
import type { ListeningEvent } from '../listening/eventsStore';
import { topArtists } from '../listening/tasteProfile';
import {
  getAlbumTracks,
  getArtistImage,
  getArtistTags,
  getNewReleases,
  getSimilarArtists,
  getTagTopTracks,
  type GraphArtist,
  type GraphRelease,
  type GraphTrack,
} from '../musicGraph';
import { normalizeName } from '../musicGraph/normalize';

const MIN_SHELF = 3;
const RELEASE_DAYS = 45;

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
  newReleases: DiscoverReleaseCard[];
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

function titleCaseTag(tag: string) {
  return tag
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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

async function buildNewReleases(artists: string[]): Promise<DiscoverReleaseCard[]> {
  const batches = await Promise.all(artists.slice(0, 6).map((artist) => getNewReleases(artist, RELEASE_DAYS)));
  const seen = new Set<string>();
  const cards: DiscoverReleaseCard[] = [];

  for (const batch of batches) {
    for (const release of batch) {
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
      const results = tracks
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

export async function loadDiscoverFeed(events: ReadonlyArray<ListeningEvent>): Promise<DiscoverFeed> {
  const taste = topArtists(events, 30).slice(0, 8);
  const seedNames = taste.map((entry) => entry.artist);

  if (seedNames.length === 0) {
    return { newReleases: [], artistsLike: [], tags: [] };
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

  const tags = await buildTagShelves(topTags);

  return {
    newReleases: newReleases.length >= MIN_SHELF ? newReleases : [],
    artistsLike: artistsLike.length >= MIN_SHELF ? artistsLike : [],
    tags,
  };
}
