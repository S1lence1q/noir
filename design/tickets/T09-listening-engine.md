# T09 — Listening events + taste profile
**Phase:** 6 · **Depends on:** — (can run in parallel with everything) · **Golden sample:** — · **Size:** M

## Goal
The app starts remembering *how* you listen. No UI in this ticket; everything later (mixes, stats, radio) reads from this.

## Spec
Data model and weights: `06-product-vision.md` → "Listening events" and "Taste profile".

- IndexedDB database `noir` (use `idb-keyval`-style thin wrapper or native; follow `localTrackStorage.ts` patterns), store `listeningEvents`, index on `startedAt`.
- Recorder hook `useListeningRecorder()` mounted once in `App.tsx`:
  - On track start: create a pending event (songKey via `playbackSongKey.ts`, title, artist, source + sourceId from the current queue context).
  - On track end / skip / change / tab close (`visibilitychange` + `pagehide`): finalize `listenedMs` and `outcome` (`skipped` if < 30 s, `completed` if ≥ 90 % of duration, else `partial`).
  - Pausing doesn't count toward `listenedMs`.
- `tasteProfile.ts` (pure functions, unit-testable):
  - `topArtists(events, days)`, `topTracks(events, days)`, `hourHistogram(events)`, `dormantFavorites(events, favorites, days = 30)`, `totalListenedMs(events, days)`, `streakDays(events)`.
  - Memoize; recompute at most every 10 min or on demand.
- Retention: keep 2 years of events; prune older on startup.
- Settings "Clear play history" also clears `listeningEvents`.

## Files
- new `src/app/services/listening/eventsStore.ts`
- new `src/app/services/listening/tasteProfile.ts`
- new `src/app/hooks/useListeningRecorder.ts`
- `src/app/App.tsx` — mount recorder (one line)
- `src/app/components/shell/noir/NoirSettingsView.tsx` — clear events too

## Acceptance
- [ ] Playing 3 songs (one skipped) creates 3 events with correct outcomes
- [ ] Refresh mid-song still saves the partial event
- [ ] `topArtists` returns sensible results in the console (`window.__noirTaste()` debug helper in dev only)

## Don't
- No UI. No network calls. Don't change existing Recently played.

## Screenshots to take
None. Paste the console output of `window.__noirTaste()`.
