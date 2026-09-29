import { getArtistInfo, getArtistImage } from '../musicGraph';
import { getDeezerArtistPortraitById, searchDeezerArtists } from '../musicGraph/deezer';
import { artistPortraitUrl } from '../../utils/artwork';
import { resolveTopicChannelId } from '../../utils/api/channelApi';
import { getCachedIdentity, setCachedIdentity } from './identityCache';
import { getHandPickedImage } from '../../utils/api/artistHelpers';
import type { ArtistIdentity, ResolveArtistInput } from './types';

const CHANNEL_RESOLVE_MS = 2800;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function candidateFromDeezer(
  match: { id: number; name: string; image?: string; fans?: number; exactName: boolean },
  base?: Partial<ArtistIdentity>
): ArtistIdentity {
  return {
    canonicalName: match.name,
    deezerId: match.id,
    image: match.image || base?.image,
    channelId: base?.channelId,
    channelType: base?.channelType,
    mbid: base?.mbid,
    disambiguation: base?.disambiguation,
    country: base?.country,
    tags: base?.tags,
    confidence: match.exactName ? 'medium' : 'low',
  };
}

/**
 * Resolve a stable artist identity (IDs + confidence) without blocking on full discography.
 * Topic channel resolve is optional and timed — Popular can load without it.
 */
export async function resolveArtistIdentity(input: ResolveArtistInput): Promise<ArtistIdentity> {
  const rawName = input.name.trim();
  const name = rawName
    .replace(/\s*-\s*Topic\s*$/i, '')
    .replace(/\s*VEVO\s*$/i, '')
    .replace(/\s*Official\s*$/i, '')
    .trim();
  if (!name) {
    return { canonicalName: '', confidence: 'low' };
  }

  const isTopicChannel = !!(input.isTopic || /\btopic\b/i.test(rawName));

  const handPicked = getHandPickedImage(name);
  if (handPicked) {
    return {
      canonicalName: name,
      image: handPicked,
      channelId: input.channelId,
      channelType: isTopicChannel ? 'topic' : 'provided',
      confidence: 'high',
      deezerId: input.deezerId,
      mbid: input.mbid,
    };
  }

  const cached = await getCachedIdentity(name);
  let skipCached = false;
  if (cached && (cached.image?.includes('bda3b1eafdfb279826a590c67a3a629c') || cached.confidence === 'low')) {
    skipCached = true;
  }
  if (cached && !skipCached && cached.confidence !== 'low' && !input.deezerId && !input.mbid) {
    const quick = await searchDeezerArtists(name, 5).catch(() => []);
    const exactCount = quick.filter((m) => m.exactName).length;
    if (exactCount >= 2) skipCached = true;
  }

  if (
    !skipCached &&
    cached &&
    cached.confidence !== 'low' &&
    (!input.channelId || cached.channelId === input.channelId || !cached.channelId)
  ) {
    let next = cached;
    if (input.channelId && !cached.channelId) {
      next = {
        ...cached,
        channelId: input.channelId,
        channelType: isTopicChannel ? 'topic' : cached.channelType || 'provided',
        confidence: 'high',
      };
      void setCachedIdentity(next);
    }
    // Heal artist image in the background — only exact/id portraits, never fuzzy swaps.
    void getArtistImage(name, next.deezerId)
      .then((graphImage) => {
        const portrait = artistPortraitUrl(graphImage);
        if (portrait && portrait !== next.image) {
          void setCachedIdentity({ ...next, image: portrait });
        }
      })
      .catch(() => {});
    return next;
  }

  const [deezerMatches, lastFmInfo, channel] = await Promise.all([
    searchDeezerArtists(name, 5).catch(() => []),
    getArtistInfo(name).catch(() => undefined),
    input.channelId
      ? Promise.resolve({
          channelId: input.channelId,
          type: (isTopicChannel ? 'topic' : 'provided') as 'topic' | 'vevo' | 'official' | 'provided',
        })
      : input.skipChannelResolve
        ? Promise.resolve(null)
        : withTimeout(resolveTopicChannelId(name), CHANNEL_RESOLVE_MS),
  ]);

  const exactMatches = deezerMatches.filter((m) => m.exactName);
  const exactDeezer = exactMatches[0] || null;
  const topDeezer = exactDeezer || deezerMatches[0] || null;
  const resolvedDeezerId = input.deezerId ?? exactDeezer?.id;

  // Portraits only from exact / explicit IDs. Fuzzy Deezer hits keep song art (input.thumbnail).
  const portraitFromKnownId =
    resolvedDeezerId != null
      ? await getDeezerArtistPortraitById(resolvedDeezerId).catch(() => undefined)
      : undefined;
  const seedThumb = artistPortraitUrl(input.thumbnail);

  let image =
    artistPortraitUrl(portraitFromKnownId) ||
    artistPortraitUrl(exactDeezer?.image) ||
    artistPortraitUrl(lastFmInfo?.image) ||
    seedThumb;

  const multiExact =
    !input.channelId && exactMatches.length >= 2 && !input.deezerId && !input.mbid;

  const ambiguous =
    multiExact ||
    (!input.channelId &&
      !exactDeezer &&
      deezerMatches.length >= 2 &&
      (deezerMatches[0]?.fans ?? 0) > 0 &&
      (deezerMatches[1]?.fans ?? 0) > 0 &&
      (deezerMatches[1]!.fans! / Math.max(1, deezerMatches[0]!.fans!)) > 0.35);

  if (ambiguous && !lastFmInfo?.mbid && !input.deezerId) {
    const pool = multiExact ? exactMatches : deezerMatches;
    const candidates = pool.slice(0, 3).map((m) =>
      candidateFromDeezer(m, {
        channelId: channel?.channelId,
        channelType: channel?.type,
        image: artistPortraitUrl(m.image) || image,
      })
    );
    return {
      canonicalName: exactDeezer?.name || name,
      deezerId: resolvedDeezerId,
      image: seedThumb || image,
      channelId: channel?.channelId,
      channelType: channel?.type,
      mbid: lastFmInfo?.mbid,
      confidence: 'low',
      candidates,
    };
  }

  let confidence: ArtistIdentity['confidence'] = 'low';
  if (input.channelId || channel?.type === 'topic') {
    confidence = exactDeezer || lastFmInfo?.mbid ? 'high' : 'medium';
  } else if (exactDeezer && lastFmInfo?.mbid) {
    confidence = 'high';
  } else if (exactDeezer || lastFmInfo?.mbid || channel?.channelId) {
    confidence = 'medium';
  } else if (topDeezer) {
    confidence = 'low';
  }

  // When confidence is low, prioritize the song thumbnail rather than an unverified Deezer portrait.
  if (confidence === 'low' && seedThumb) {
    image = seedThumb;
  }

  const listeners = exactDeezer?.fans ?? topDeezer?.fans ?? lastFmInfo?.listeners;

  const identity: ArtistIdentity = {
    canonicalName: lastFmInfo?.name || exactDeezer?.name || name,
    mbid: input.mbid || lastFmInfo?.mbid,
    deezerId: resolvedDeezerId,
    channelId: input.channelId || channel?.channelId,
    channelType:
      channel?.type || (input.channelId ? (isTopicChannel ? 'topic' : 'provided') : undefined),
    image,
    listeners,
    confidence,
  };

  if (identity.confidence !== 'low') {
    void setCachedIdentity(identity);
  }

  return identity;
}

export function identityToVerifiedArtist(
  identity: ArtistIdentity,
  fallback?: { thumbnail?: string }
): import('../../types').VerifiedArtist {
  return {
    name: identity.canonicalName
      .replace(/\s*-\s*Topic\s*$/i, '')
      .replace(/\s*VEVO\s*$/i, '')
      .replace(/\s*Official\s*$/i, '')
      .trim(),
    thumbnail: identity.image || fallback?.thumbnail || '',
    channelId: identity.channelId,
    mbid: identity.mbid,
    deezerId: identity.deezerId,
    confidence: identity.confidence,
    disambiguation: identity.disambiguation,
    country: identity.country,
    tags: identity.tags,
    listeners: identity.listeners,
    isTopic: identity.channelType === 'topic',
  };
}
