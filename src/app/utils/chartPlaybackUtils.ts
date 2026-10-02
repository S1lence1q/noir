import { SearchResult } from '../types';
import { executeSearchAPI, fetchVideoDetails } from './apiUtils';
import { getPrimaryArtist } from './stringUtils';

/** Normalize for loose title comparison (Danish æ/ø/å, punctuation). */
function normalizeForTitleMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the YouTube result title clearly refers to the expected chart track. */
function titleMatchesExpected(videoTitle: string, expectedTitle: string): boolean {
  const expected = normalizeForTitleMatch(expectedTitle);
  const video = normalizeForTitleMatch(videoTitle);
  if (!expected || !video) return false;
  if (video.includes(expected)) return true;

  if (!expected.includes(' ')) {
    const re = new RegExp(`\\b${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return re.test(video) || re.test(videoTitle);
  }

  const words = expected.split(' ').filter((w) => w.length > 2);
  if (words.length === 0) return video.includes(expected);

  const matched = words.filter((w) => video.includes(w)).length;
  return matched >= Math.max(1, Math.ceil(words.length * 0.75));
}

function artistMatchesExpected(videoArtist: string, expectedArtist: string): boolean {
  const video = normalizeForTitleMatch(videoArtist);
  if (!video) return false;

  const primary = normalizeForTitleMatch(getPrimaryArtist(expectedArtist));
  if (primary && video.includes(primary)) return true;

  const featured = expectedArtist
    .split(/\s*(?:,|&| x | feat\.? | ft\.? | featuring )\s*/i)
    .map((p) => normalizeForTitleMatch(p.trim()))
    .filter((n) => n.length > 1);

  return featured.some((n) => video.includes(n));
}

function buildChartResolveQuery(expected: Pick<SearchResult, 'title' | 'artist'>): string {
  const title = expected.title.trim();
  const names = expected.artist
    .split(/\s*(?:,|&| x )\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const artistPart = names.length > 0 ? names.join(' ') : getPrimaryArtist(expected.artist);
  return `${title} ${artistPart} official audio`;
}

function uploaderMatchesArtist(uploaderName: string, artistName: string): boolean {
  const u = uploaderName.trim().toLowerCase();
  const full = artistName.trim().toLowerCase();
  const primary = getPrimaryArtist(artistName).toLowerCase();

  if (u === full || u === `${full} - topic` || u === `${full}vevo`) return true;
  if (primary && (u === primary || u === `${primary} - topic` || u === `${primary}vevo`)) return true;
  if (primary && u.includes(primary) && u.includes('topic')) return true;
  return false;
}

function isUndesiredStreamTitle(cTitle: string): boolean {
  if (cTitle.includes('lyric')) return true;
  if (cTitle.includes('karaoke')) return true;
  if (cTitle.includes('cover') && !cTitle.includes('official')) return true;
  if (cTitle.includes('music video') && !cTitle.includes('official audio')) return true;
  if (cTitle.includes('visualizer') && !cTitle.includes('official audio')) return true;
  return false;
}

function scoreChartCandidate(
  c: SearchResult,
  expected: Pick<SearchResult, 'title' | 'artist'>
): number {
  let score = 0;
  const titleLower = normalizeForTitleMatch(expected.title);
  const cTitle = normalizeForTitleMatch(c.title);
  const cArtist = c.artist.toLowerCase();

  if (!titleMatchesExpected(c.title, expected.title)) return -9999;

  if (uploaderMatchesArtist(c.artist, expected.artist)) score += 200;
  if (artistMatchesExpected(c.artist, expected.artist)) score += 100;
  if (cArtist.includes('topic')) score += 120;
  if (cTitle.includes(titleLower)) score += 180;

  const titleWords = titleLower.split(' ').filter((w) => w.length > 2);
  for (const w of titleWords) {
    if (cTitle.includes(w)) score += 20;
  }

  if (cTitle.includes('official audio')) score += 90;
  else if (cTitle.includes('audio') && !cTitle.includes('lyric')) score += 40;

  if (cTitle.includes('official music video') || cTitle.includes('music video')) score -= 160;
  if (cTitle.includes('lyric')) score -= 200;
  if (cTitle.includes('live') && !titleLower.includes('live')) score -= 120;
  if (cTitle.includes('visualizer')) score -= 80;

  return score;
}

/** Safe to play without a slow metadata round-trip (Topic / official audio). */
function isConfidentChartMatch(
  candidate: SearchResult,
  expected: Pick<SearchResult, 'title' | 'artist'>
): boolean {
  const score = scoreChartCandidate(candidate, expected);
  if (score < 300) return false;

  const cTitle = normalizeForTitleMatch(candidate.title);
  if (isUndesiredStreamTitle(cTitle)) return false;

  const cArtist = candidate.artist.toLowerCase();
  return uploaderMatchesArtist(candidate.artist, expected.artist) || cArtist.includes('topic');
}

function rankYouTubeCandidatesForTrack(
  candidates: SearchResult[],
  expected: Pick<SearchResult, 'title' | 'artist'>
): SearchResult[] {
  return [...candidates]
    .filter((c) => c.videoId?.length === 11 && titleMatchesExpected(c.title, expected.title))
    .sort((a, b) => scoreChartCandidate(b, expected) - scoreChartCandidate(a, expected));
}

export type ResolvedYouTubePlayback = {
  videoId: string;
  thumbnail: string;
  verifiedTitle: string;
  verifiedArtist: string;
};

async function verifyChartCandidate(
  candidate: SearchResult,
  expected: SearchResult
): Promise<ResolvedYouTubePlayback | null> {
  const details = await fetchVideoDetails(candidate.videoId);
  if (!titleMatchesExpected(details.title, expected.title)) return null;
  if (!artistMatchesExpected(details.artist, expected.artist)) return null;

  return {
    videoId: candidate.videoId,
    thumbnail: `https://i.ytimg.com/vi/${candidate.videoId}/maxresdefault.jpg`,
    verifiedTitle: details.title,
    verifiedArtist: details.artist,
  };
}

function toResolvedFromCandidate(candidate: SearchResult): ResolvedYouTubePlayback {
  return {
    videoId: candidate.videoId,
    thumbnail: candidate.thumbnail || `https://i.ytimg.com/vi/${candidate.videoId}/maxresdefault.jpg`,
    verifiedTitle: candidate.title,
    verifiedArtist: candidate.artist,
  };
}

/**
 * Resolve a chart/local track to YouTube audio (Topic / official audio preferred).
 * Parallel searches + fast path for high-confidence matches; verify at most 2 candidates in parallel.
 */
export async function resolveYouTubeForChartTrack(
  expected: SearchResult
): Promise<ResolvedYouTubePlayback | null> {
  const primary = getPrimaryArtist(expected.artist);
  const audioQuery = buildChartResolveQuery(expected);
  const topicQuery = `${primary} ${expected.title}`.trim();

  const [audioResults, topicResults] = await Promise.all([
    executeSearchAPI(audioQuery, 12),
    executeSearchAPI(topicQuery, 10),
  ]);

  const seenIds = new Set<string>();
  const pool: SearchResult[] = [];

  for (const r of [...audioResults, ...topicResults]) {
    if (r.videoId?.length === 11 && !seenIds.has(r.videoId)) {
      seenIds.add(r.videoId);
      pool.push(r);
    }
  }

  if (pool.length < 4) {
    const fallback = await executeSearchAPI(`${expected.title} ${expected.artist}`.trim(), 10);
    for (const r of fallback) {
      if (r.videoId?.length === 11 && !seenIds.has(r.videoId)) {
        seenIds.add(r.videoId);
        pool.push(r);
      }
    }
  }

  const ranked = rankYouTubeCandidatesForTrack(pool, expected);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  if (isConfidentChartMatch(top, expected)) {
    return toResolvedFromCandidate(top);
  }

  const toVerify = ranked.slice(0, 2);
  const verified = await Promise.all(
    toVerify.map((c) =>
      verifyChartCandidate(c, expected).catch(() => null as ResolvedYouTubePlayback | null)
    )
  );

  const match = verified.find((v) => v !== null);
  if (match) return match;

  if (scoreChartCandidate(top, expected) >= 200 && !isUndesiredStreamTitle(normalizeForTitleMatch(top.title))) {
    return toResolvedFromCandidate(top);
  }

  return null;
}
