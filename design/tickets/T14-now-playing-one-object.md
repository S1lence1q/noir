# T14 — Now Playing: one object, not two
**Phase:** 10 · **Depends on:** T07 (glow removed) · T10 only for part C · **Golden sample:** motion tokens + empty Next up · **Size:** M (A+B), S (C), later (D)

## Goal
Opening Now Playing feels like the song you're hearing moves up and opens. The song identity is never shown twice.

## Current
`design/audit/Noir/09-now-playing.png`: large cover + title + artist + heart in the canvas, and the same cover + title + artist in the compact bar right below. Artwork sits low-left with empty space above; red top glow.

## Spec

### A. Shared element (the core of this ticket)
- Wrap the shell (canvas + compact bar) in one `LayoutGroup` (motion/react).
- Give the bar cover and the large cover the same `layoutId="np-cover"`; bar title/artist and large title/artist `layoutId="np-title"` / `"np-artist"`.
- When `nowPlayingOpen`: the bar renders **no** cover/title/artist/favorite (left zone stays as empty space of the same width so the transport doesn't shift). When closed: the canvas view isn't mounted, bar shows them again.
- Transition: `MOTION.scene`. Reduced motion → instant crossfade (no layout animation).
- Radius animates with the cover (bar 6 px → large `--noir-radius-lg`); use `style={{ borderRadius }}` on the motion element so motion interpolates it.
- Song change while open: crossfade inside the large cover only (existing behavior), no fly.

### B. Composition
- Center the cover + title block vertically in the canvas (left column), cover max 420 px, title under it.
- Under the artist: `Playing from {source}` (`--noir-type-meta`, clickable → opens the source collection) when a source exists.
- Favorite sits right of the artist (already). It is the **only** favorite control while open.

### C. Content the bar can't show (after T10)
- ~~Line under the source: `Similar: A, B, C`~~ **Parked (2026-09-27):** not permanent in the title block — felt like a footnote and fought the composition. Revisit as artist-page “Fans also like” or on-demand in NP.
- Lyrics toggle button (`L`) top-right of the canvas, opening the existing lyrics in place of the Next up column. Keep existing lyrics logic; only reposition.

### D. Graphic slot (after T06, separate small ticket)
- **Parked** (decision 005). Built twice, removed: the composition is complete without it, and it can't honestly react to YouTube audio.

## Also fix (from T05 review)
- Empty Next up: **Add 10** and **Shuffle all** must sit on one row (let the queue column be ≥ 280 px, or reduce button padding to 12 px).

## Files
- `src/app/components/shell/AppShell.tsx` — `LayoutGroup`, pass `nowPlayingOpen` to the bar
- `src/app/components/shell/CompactPlayerBar.tsx` — hide identity when open, `layoutId`s
- `src/app/components/shell/noir/NoirNowPlayingView.tsx` — `layoutId`s, composition, "Playing from"
- `src/styles/noir-shell.css`

## Acceptance
- [ ] Opening Now Playing: cover and title visibly travel from the bar to the canvas; bar left zone is empty while open
- [ ] Closing reverses it; transport and scrubber never jump sideways
- [ ] Nowhere on screen is the title shown twice while open
- [ ] Reduced motion: no flying, just a fade
- [ ] Add 10 / Shuffle all on one row

## Don't
- Don't hide the compact bar. Don't move transport controls into the canvas.
- Don't touch playback internals.

## Screenshots to take
Now Playing open (bar left zone empty) · mid-transition (screen recording or 2–3 frames) · closed.
