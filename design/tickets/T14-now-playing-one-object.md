# T14 — Now Playing: one object, not two
**Phase:** 10 · **Depends on:** T07 (glow removed) · T10 only for part C · **Golden sample:** motion tokens + empty Next up · **Size:** M (A+B), S (C), later (D)

## Goal
Opening Now Playing feels like the song you're hearing moves up and opens. The song identity is never shown twice.

## Current
`design/audit/Noir/09-now-playing.png`: large cover + title + artist + heart in the canvas, and the same cover + title + artist in the compact bar right below. Artwork sits low-left with empty space above; red top glow.

## Spec

### A. Shared element (the core of this ticket) — **DONE**
- Wrap the shell (canvas + compact bar) in one `LayoutGroup` (motion/react).
- Cover: `layoutId="np-cover"`. (Title/artist shared-element was tried; keep identity in one place only while open — bar left empties.)
- When `nowPlayingOpen`: the bar renders **no** cover/title/artist/favorite (left zone stays as empty space of the same width so the transport doesn't shift). Close control fades on an absolute layer — never steals the cover landing slot.
- Transition: `MOTION.scene` / spring on cover. Reduced motion → no layout flight.
- Radius animates with the cover (bar 6 px → large); `style={{ borderRadius }}` on the motion element.
- Song change while open: crossfade inside the large cover only, no fly.
- Exit: NP shell stays opacity 1 while cover flies; fade title / queue / atmosphere via `useIsPresent` so nothing ghosts over the canvas.

### B. Composition — **DONE**
- Center the cover + title block vertically in the canvas (left column), cover max ~420 px, title under it.
- Under the artist: `Playing from {source}` (`--noir-type-meta`, clickable → opens the source when resolvable: user playlist, Favorites, `Radio · {artist}`).
- Favorite (+ radio) sit right of the artist. Favorite is the **only** favorite control while open.
- Atmosphere from artwork colors is wanted (user-approved).

### C. Content the bar can't show (after T10)
- ~~Line under the source: `Similar: A, B, C`~~ **Parked (2026-09-27):** not permanent in the title block. Revisit as artist-page “Fans also like” or on-demand in NP.
- **Lyrics (DONE — 2026-09-27):**
  - Toggle button top-right of the NP canvas (and keyboard `L`).
  - When on: lyrics replace the **Next up** column (same column width / chrome), not a modal over the cover.
  - Reuses `useLyrics` + LRCLIB / custom; seek via `elva-seek`. UI in `NoirLyricsColumn`.
  - States: loading, synced scroll with `currentTime`, plain (unsynced), empty / not found — copy in `strings.lyrics`.
  - Reduced motion: instant scroll (no smooth tween); still readable.

### D. Graphic slot (after T06, separate small ticket)
- **Parked** (decision 005). Built twice, removed: the composition is complete without it, and it can't honestly react to YouTube audio.

## Also done around T14 / queue
- Empty Next up: Add 10 / Shuffle all (golden). Soft Shuffle animation (icon spin + soft opacity/blur settle).
- Direct play from search clears stale `Playing from` and starts a fresh queue context (`playTrackInContext` in `App.tsx`).

## Also fix (from T05 review)
- Empty Next up: **Add 10** and **Shuffle all** must sit on one row (let the queue column be ≥ 280 px, or reduce button padding to 12 px). — largely done; verify if needed.

## Files (lyrics pass)
- `src/app/components/shell/noir/NoirNowPlayingView.tsx` — lyrics column vs Next up; toggle
- `src/app/hooks/useLyrics.ts` — reuse (wire from App / view)
- `src/app/App.tsx` — pass playback time / song into lyrics hook if not already
- `src/app/constants/strings.ts` — lyrics empty/loading copy
- `src/styles/noir-shell.css` — lyrics column styles (`--noir-*` only)
- Optional: `KeyboardShortcutsModal` already lists `L`

## Acceptance
- [x] Opening Now Playing: cover travels from the bar to the canvas; bar left zone empty while open
- [x] Closing reverses it; transport/scrubber don't jump; no ghost title over canvas
- [x] Title not shown twice while open
- [x] Playing from under artist when source exists
- [x] Lyrics toggle (`L` + button) swaps Next up ↔ lyrics in the right column
- [x] Synced / plain / empty / loading states work
- [x] Reduced motion: no flying cover; lyrics still usable

## Don't
- Don't hide the compact bar. Don't move transport controls into the canvas.
- Don't touch playback internals (crossfade / `MusicPlayer` engine) unless lyrics sync already depends on time from there — reading `currentTime` is fine.
- Don't put Similar back under the title without a new decision.

## Screenshots to take
Now Playing open · lyrics on (right column) · lyrics empty · mid cover flight.
