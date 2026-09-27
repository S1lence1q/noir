# T17 — Your sound + NOIR Replay
**Phase:** 12 / 15 · **Depends on:** T09 (listening events) · **Golden sample:** Bone only for stats · **Size:** M

## Goal
Library has a **Your sound** tab: minutes, rankings, listening clock, streak. **NOIR Replay** shows last month as up to five Bone story cards with Save image.

## Spec
- Library section `Your sound` beside Favorites / Playlists.
- Week + 30-day listened time from `totalListenedMs`; top 5 artists/tracks; hour histogram; streak.
- Replay CTA (Bone surface) when previous calendar month has plays → story overlay, Next/Back/Done, Save image PNG.
- Empty: explain that plays fill the page.
- Copy in `strings.stats`. No tags shelf in v1 (no tag data on events).

## Files
- `services/listening/statsSummary.ts`
- `shell/noir/NoirStatsView.tsx`, `NoirReplayStory.tsx`, `NoirLibraryView.tsx`
- `constants/strings.ts`, `styles/noir-shell.css`

## Acceptance
- [x] Your sound tab in Library
- [x] Real data from listening events
- [x] Replay story + Save image when last month has listens
- [x] Bone only on Replay CTA + cards
