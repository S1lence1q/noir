export type { ArtistIdentity, ResolveArtistInput } from './types';
export { identityCacheKey } from './types';
export type { ArtistConfidence } from '../../types';
export { getCachedIdentity, setCachedIdentity } from './identityCache';
export { resolveArtistIdentity, identityToVerifiedArtist } from './resolveArtist';
