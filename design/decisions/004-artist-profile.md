# 004 — Artist profile: speed + correct identity

**Status:** Implemented in client (2026-09-27) — `services/artistIdentity/*`, Popular-first profile load, identity-keyed SWR discography cache, disambiguation UI. Backend cache still optional (see artist identity plan Fase 3).  
**User pain:** Opening an artist (e.g. search “Kundo” → profile) still feels slow, and we still **guess** whether it is the right artist profile. That guessing is exhausting; identity confidence matters as much as load time.

## Today (what exists)

- Profile **shell opens immediately** (name / art).
- **Identity resolve** binds `mbid` / `deezerId` / `channelId` + confidence before heavy discography.
- **Popular-first** from Last.fm/Deezer (~10 tracks) so the profile is usable while Piped loads.
- **Discography** uses channelId when known; cache keyed by identity (`elva_discography_v3_*`) with stale-while-revalidate.
- **Disambiguation** when confidence is low (pick among Deezer candidates).
- **Prefetch** when artist card is shown / hovered.
- MusicBrainz tags still enrich in the background (non-blocking).

## Goals

1. **Correct artist first** — ambiguous names ask the user; IDs preferred over bare names.
2. **Fast reopen** — SWR + identity-keyed cache.
3. **Faster cold open** — Popular-first + prefetch; Piped fills in behind.

## Remaining / optional

| Priority | Idea | Notes |
|----------|------|--------|
| 5 | Discography in IndexedDB | Identity already uses graph IndexedDB; discography still localStorage v3 |
| 6 | Own **backend cache** | Shared cold-load win; out of zero-cost scope unless asked |

## Hard limit without a backend

Cold load for a never-seen artist always depends on third-party instances. “Always 0 ms” is not realistic client-only.

## Do not

- Block profile open on MusicBrainz.
- Treat “fast wrong artist” as success.

## Related code

- `src/app/services/artistIdentity/*` — `resolveArtistIdentity`, identity cache
- `src/app/hooks/useSearchLogic.ts` — `handleViewArtistProfile`, verified artist card
- `src/app/utils/artistDiscographyLoader.ts` / `discographyCache.ts`
- `src/app/utils/api/channelApi.ts` — channel uploads (channelId fast path)
- `src/app/components/shell/noir/NoirArtistDisambiguation.tsx`
