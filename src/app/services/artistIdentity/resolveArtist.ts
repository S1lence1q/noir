import { getArtistInfo, getArtistImage } from '../musicGraph';
import { searchDeezerArtists } from '../musicGraph/deezer';
import { resolveTopicChannelId } from '../../utils/api/channelApi';
import { getCachedIdentity, setCachedIdentity } from './identityCache';
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
  const name = input.name.trim();
  if (!name) {
    return { canonicalName: '', confidence: 'low' };
  }

  const cached = await getCachedIdentity(name);
  if (
    cached &&
    cached.confidence !== 'low' &&
    (!input.channelId || cached.channelId === input.channelId || !cached.channelId)
  ) {
    if (input.channelId && !cached.channelId) {
      const merged: ArtistIdentity = {
        ...cached,
        channelId: input.channelId,
        channelType: input.isTopic ? 'topic' : cached.channelType || 'provided',
        confidence: 'high',
      };
      void setCachedIdentity(merged);
      return merged;
    }
    return cached;
  }

  const [deezerMatches, lastFmInfo, channel] = await Promise.all([
    searchDeezerArtists(name, 5).catch(() => []),
    getArtistInfo(name).catch(() => undefined),
    input.channelId
      ? Promise.resolve({
          channelId: input.channelId,
          type: (input.isTopic ? 'topic' : 'provided') as 'topic' | 'vevo' | 'official' | 'provided',
        })
      : input.skipChannelResolve
        ? Promise.resolve(null)
        : withTimeout(resolveTopicChannelId(name), CHANNEL_RESOLVE_MS),
  ]);

  const exactDeezer = deezerMatches.find((m) => m.exactName) || null;
  const topDeezer = exactDeezer || deezerMatches[0] || null;
  const image =
    (input.thumbnail && !input.thumbnail.includes('unsplash.com') ? input.thumbnail : undefined) ||
    topDeezer?.image ||
    lastFmInfo?.image ||
    (await getArtistImage(name).catch(() => undefined));

  const ambiguous =
    !input.channelId &&
    !exactDeezer &&
    deezerMatches.length >= 2 &&
    (deezerMatches[0]?.fans ?? 0) > 0 &&
    (deezerMatches[1]?.fans ?? 0) > 0 &&
    (deezerMatches[1]!.fans! / Math.max(1, deezerMatches[0]!.fans!)) > 0.35;

  if (ambiguous && !lastFmInfo?.mbid) {
    const candidates = deezerMatches.slice(0, 3).map((m) =>
      candidateFromDeezer(m, {
        channelId: channel?.channelId,
        channelType: channel?.type,
        image: m.image || image,
      })
    );
    return {
      canonicalName: topDeezer?.name || name,
      deezerId: topDeezer?.id,
      image,
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

  const identity: ArtistIdentity = {
    canonicalName: lastFmInfo?.name || topDeezer?.name || name,
    mbid: input.mbid || lastFmInfo?.mbid,
    deezerId: input.deezerId ?? topDeezer?.id,
    channelId: input.channelId || channel?.channelId,
    channelType:
      channel?.type || (input.channelId ? (input.isTopic ? 'topic' : 'provided') : undefined),
    image,
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
    name: identity.canonicalName,
    thumbnail: identity.image || fallback?.thumbnail || '',
    channelId: identity.channelId,
    mbid: identity.mbid,
    deezerId: identity.deezerId,
    confidence: identity.confidence,
    disambiguation: identity.disambiguation,
    country: identity.country,
    tags: identity.tags,
    isTopic: identity.channelType === 'topic',
  };
}
