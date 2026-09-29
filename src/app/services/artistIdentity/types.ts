import type { ArtistConfidence } from '../../types';

export type ArtistIdentity = {
  canonicalName: string;
  mbid?: string;
  deezerId?: number;
  channelId?: string;
  channelType?: 'topic' | 'vevo' | 'official' | 'provided';
  image?: string;
  disambiguation?: string;
  country?: string;
  tags?: string[];
  listeners?: number;
  confidence: ArtistConfidence;
  /** Present when confidence is low — user should pick one. */
  candidates?: ArtistIdentity[];
};

export type ResolveArtistInput = {
  name: string;
  channelId?: string;
  thumbnail?: string;
  isTopic?: boolean;
  mbid?: string;
  deezerId?: number;
  /** Skip Topic-channel resolve (faster; use when prefetching Popular only). */
  skipChannelResolve?: boolean;
};

/** Stable cache / discography key preferring IDs over bare names. */
export function identityCacheKey(identity: {
  mbid?: string;
  deezerId?: number;
  channelId?: string;
  canonicalName?: string;
  name?: string;
}): string {
  if (identity.mbid?.trim()) return `mbid:${identity.mbid.trim()}`;
  if (identity.deezerId != null && Number.isFinite(identity.deezerId)) {
    return `deezer:${identity.deezerId}`;
  }
  if (identity.channelId?.trim()) return `channel:${identity.channelId.trim()}`;
  const name = (identity.canonicalName || identity.name || '').trim().toLowerCase();
  return `name:${name}`;
}
