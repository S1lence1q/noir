# T11 — Radio + autoplay
**Phase:** 8 · **Depends on:** T10, T05 · **Size:** M

## Goal
Start radio from any song; when the queue is about to end, keep playing similar songs (ask / always / off).

## Spec
- Song menu **Start radio** enabled
- Radio = seed + Last.fm similar + Deezer artist radio, shuffled, max 2/artist in a row, exclude last 50 plays
- Queue-ends prompt uses radio append (10 tracks) instead of only favorites
- Settings: Autoplay Ask / Always / Off (`elva_autoplay`)

## Files
- `src/app/services/radio/buildRadio.ts`
- `src/app/components/NoirSongMenu.tsx`
- `src/app/App.tsx`
- `src/app/components/shell/noir/NoirNowPlayingView.tsx`
- `src/app/components/shell/noir/NoirSettingsView.tsx`

## Acceptance
- [ ] Start radio from ··· menu plays station
- [ ] Queue-ends Keep playing appends similar tracks
- [ ] Autoplay setting respected
