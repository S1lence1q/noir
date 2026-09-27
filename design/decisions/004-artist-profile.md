# 004 — Artist profile: speed + correct identity

**Status:** Parked — not current focus (2026-09-26). Do after shell player completeness.  
**User pain:** Opening an artist (e.g. search “Kundo” → profile) still feels slow, and we still **guess** whether it is the right artist profile. That guessing is exhausting; identity confidence matters as much as load time.

## Today (what exists)

- Profile **shell opens immediately** (name / art).
- Slow part is **discography**: Piped / Invidious channel uploads via `loadArtistDiscographyWithCache`.
- **localStorage cache** (`elva_discography_v2_*`, ~48h TTL) makes second visits faster.
- MusicBrainz + Deezer enrich in the background (avatar, tags) — they should not block the track list.
- Artist card on search uses heuristics (`shouldShowArtistCard`, channel/topic matching). Wrong or ambiguous matches are a real product smell.

## Goals (later)

1. **Correct artist first** — stop “is this even the right profile?” Guessing is unacceptable long-term.
2. **Fast reopen** — cache hits should feel instant.
3. **Faster cold open** — first visit can still need network; make it progressive and prefetchable.

## Possible improvements (ordered)

| Priority | Idea | Notes |
|----------|------|--------|
| 1 | Stronger **identity** (channelId / Topic / official) before loading a huge list | Prefer explicit channel over name-only search |
| 2 | **Prefetch on intent** — when artist card is shown or hovered, start discography fetch | Cuts perceived wait on click |
| 3 | **Stale-while-revalidate** — show expired cache immediately, refresh in background | Feels instant even after TTL |
| 4 | **Progressive discography** — first ~10 tracks ASAP, rest after | UI usable while network continues |
| 5 | Better client cache (IndexedDB, longer TTL, store `channelId`) | localStorage is limited |
| 6 | Own **backend cache** | Biggest win for cold loads; out of current UI-only scope unless asked |

## Hard limit without a backend

Cold load for a never-seen artist always depends on third-party instances. “Always 0 ms” is not realistic client-only. Correctness + prefetch + SWR can still make the product feel trustworthy and fast.

## Do not

- Rebuild search ranking as a side quest while Phase 1 shell work is open.
- Block profile open on MusicBrainz.
- Treat “fast wrong artist” as success.

## Related code

- `src/app/hooks/useSearchLogic.ts` — `handleViewArtistProfile`, verified artist card
- `src/app/utils/artistDiscographyLoader.ts` / `discographyCache.ts`
- `src/app/utils/api/channelApi.ts` — channel uploads
