import { getGraphCache, setGraphCache } from '../musicGraph/cache';
import type { ArtistIdentity } from './types';
import { identityCacheKey } from './types';

const IDENTITY_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const memory = new Map<string, ArtistIdentity>();

function nameKey(name: string) {
  return `artist-identity:name:${name.trim().toLowerCase()}`;
}

function idKey(identity: ArtistIdentity) {
  return `artist-identity:${identityCacheKey(identity)}`;
}

export async function getCachedIdentity(name: string): Promise<ArtistIdentity | null> {
  const key = nameKey(name);
  const mem = memory.get(key);
  if (mem) return mem;
  try {
    const cached = await getGraphCache<ArtistIdentity>(key);
    if (cached) {
      memory.set(key, cached);
      memory.set(idKey(cached), cached);
      return cached;
    }
  } catch {
    // optional
  }
  return null;
}

export async function setCachedIdentity(identity: ArtistIdentity): Promise<void> {
  const byName = nameKey(identity.canonicalName);
  const byId = idKey(identity);
  memory.set(byName, identity);
  memory.set(byId, identity);
  try {
    await setGraphCache(byName, identity, IDENTITY_TTL_MS);
    if (byId !== byName) {
      await setGraphCache(byId, identity, IDENTITY_TTL_MS);
    }
  } catch {
    // optional
  }
}
