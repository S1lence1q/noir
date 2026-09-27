# T10 — musicGraph service (Last.fm + Deezer)
**Phase:** 7 · **Depends on:** T09 · **Golden sample:** — · **Size:** L

## Goal
One place that knows how artists and songs relate. Powers radio, "fans also like", mixes, and Discover.

## Prerequisite (user)
Create a free Last.fm API key at https://www.last.fm/api/account/create and add `VITE_LASTFM_API_KEY=...` to `.env`. Add the variable name (no value) to `.env.example`.

## Spec
Endpoint table + TTLs: `06-product-vision.md` → "musicGraph service".

- `vite.config.ts`: `server.proxy['/deezer'] = { target: 'https://api.deezer.com', changeOrigin: true, rewrite: p => p.replace(/^\/deezer/, '') }`. Migrate existing Deezer calls in `useSearchLogic.ts` from `corsproxy.io` to `/deezer`.
- Last.fm: direct `https://ws.audioscrobbler.com/2.0/?format=json&api_key=…`.
- Cache: IndexedDB store `graphCache` `{ key, value, expiresAt }`. In-flight de-duplication (same key → same promise). Rate limit Last.fm to 4 req/s.
- API (all return plain metadata, never YouTube ids):

```ts
getSimilarArtists(artist: string, limit = 12): Promise<GraphArtist[]>
getSimilarTracks(title: string, artist: string, limit = 30): Promise<GraphTrack[]>
getArtistTags(artist: string): Promise<string[]>
getArtistTopTracks(artist: string, limit = 10): Promise<GraphTrack[]>
getArtistInfo(artist: string): Promise<{ name: string; mbid?: string; image?: string; listeners?: number }>
getArtistRadio(artist: string): Promise<GraphTrack[]>        // Deezer
getNewReleases(artist: string, days = 30): Promise<GraphRelease[]> // Deezer
getArtistImage(artist: string): Promise<string | undefined>  // Deezer picture_xl
```
- Name matching: normalize (lowercase, strip "feat.", diacritics) before cache keys and Deezer search; prefer exact name match, then highest fan count.
- Failures return `[]` / `undefined` and log once; never throw into UI.

## Files
- new `src/app/services/musicGraph/{index,lastfm,deezer,cache,normalize}.ts`
- `vite.config.ts`, `.env.example`, `src/app/hooks/useSearchLogic.ts` (proxy migration only)

## Acceptance
- [ ] `window.__noirGraph.getSimilarArtists('Kundo')` returns Danish hip-hop artists
- [ ] Second call is instant (cache)
- [ ] Deezer search still works through `/deezer`
- [ ] With no API key: Last.fm functions return empty, app works

## Don't
- No UI. Don't resolve YouTube matches here.

## Screenshots to take
None. Paste console output for Kundo similar artists + radio.
