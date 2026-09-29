# POLISH — the single punch list

*Owner: Opus (creative direction). Last updated: 2026-09-29.*
Single source of truth for "not done yet". Tickets are for features; this is for finish.
Severity: 🔴 broken · 🟡 feels off · ⚪ finish. Check a box only when the surface meets the Definition of Done.

## Definition of Done (per surface)
All 6 states · nothing jumps · enter **and** exit motion · reduced motion · keyboard · copy in `strings.ts` · works at phone width · no fallback flash.

---

## Design decisions (binding)

### D1 — When is something dithered?
**Real objects show their real image. Dither is for what NOIR makes.**
- Real: album covers, single covers, artist portraits (search, artist page, latest release, cold start picks, queue, compact bar). Recognition beats mood.
- Dither: things NOIR generated — Daily Mixes, radio, playlists without art, Replay/Your Sound cards, the brand mark, empty states, and missing-art fallbacks.
- Atmosphere is allowed *around* real art (Now Playing canvas background may be a dithered field derived from the cover), never *on top of* it.

### D2 — Now Playing: lyrics and queue are independent
- **Lyrics = a stage mode.** Toggling lyrics moves the cover (shared layout, `MOTION.scene`) from centre to a compact left column with title/artist; lyrics fill the stage.
- **Queue = a side rail.** It slides in/out on the right (`MOTION.panel`) and **never closes because lyrics opened** (and vice versa).
- Both open: cover column · lyrics · queue rail. Below ~1200px wide the two are exclusive, and switching animates (rail slides out, stage reflows) — never snaps.
- Buttons: two adjacent toggles in the canvas controls, each with a clear on-state.

### D3 — No fallback flash
An image area shows an exact-shape skeleton until the real image has **decoded** or is **confirmed missing**, then fades in once. Never show a placeholder/dither fallback and swap it for the real image a moment later.
Page-level: above-the-fold content on a profile reveals together (hero + latest + popular), gated on data or ~600 ms, whichever first; below-fold shelves may stream in.

### D4 — Sidebar: parent/child navigation
Quick access items are shortcuts into Library. When on Favorites: Favorites is active, Library shows a quiet "parent" state. Clicking **Library** always goes to the Library overview — it is never a dead click.

### D5 — History belongs in Library, not a profile
NOIR is single-user and local-first; a "profile" has no audience. Add **History** (full chronological play log, grouped by day, playable) as a Library section. Revisit profiles only if sharing becomes a thing.

---

## Punch list

### Phase A — quick wins
- [x] 🟡 "Playing from Popular" shown twice (under Next up and under artist in the canvas). Keep it in the queue header only.
- [x] 🔴 Sidebar Library is a dead click while on Favorites (D4).
- [x] 🟡 Search is hard to find / looked like Elva. Now the first sidebar nav item (own glyph, ⌘K hint on hover), opens the palette from any page. The floating Home pill is gone.
- [x] 🟡 Artist "Latest release" card: opaque grey box (breaks white-alpha rule), orange label (accent without context), dithered cover (D1), doesn't align with Popular. Redo: no box, real cover, height aligned to the Popular list, quiet label.
- [x] 🟡 Apply D1 across covers/portraits currently dithered.

Phase A notes: Library root is now the collection grid (Favorites card first); Favorites and playlists are sub-pages with a back link. Real artwork goes through `NoirArtwork` (skeleton → decode → one fade; dither mark only as fallback). Dither kept for playlists, mixes, tags, Replay.
- [ ] 🟡 Search palette drops the first keystrokes typed right after ⌘K / `/` (input not focused yet). Buffer or focus synchronously.
- [ ] ⚪ Discography cards get a grey hover box — match the new Latest release hover (cover dims, play appears).

### Phase B — Now Playing
- [x] 🔴 Lyrics ↔ queue flow (D2). Lyrics + Next up are two toggles side by side in the bar (quote / list icons, shared on-state). Rail animates width (spring), cover shrinks via CSS width transition, exclusive only below 1200px.
- [ ] 🟡 Canvas with lyrics and rail both closed: cover hugs the left, right 2/3 empty. Recompose (centre the identity or scale the cover up).
- [ ] 🟡 Atmosphere is a blurred image + radial colour gradients = the "smooth glow" the rules forbid. Replace with a grain/dither field from the cover's world (D1: atmosphere around, never on).
- [ ] 🔴 (parked — ~1/100, no repro) Cover flight occasionally lands in the wrong place when closing the canvas. Repro needed (note: page, scroll, whether compact bar was mid-animation).
- [ ] 🟡 Lyrics finish: ~~constant weight (no rewrap), column-local scroll, active held at 38%~~ done. Left: instrumental gaps (empty lines), loading skeleton, past vs future contrast.
- [x] 🟡 Toast primitive: one system (sonner removed, `utils/toast.ts` facade → noirToast), description line, settle-in / step-out swap, anchored to `--noir-bar-h`.
- [x] 🟡 "Queue ends soon": toast-family card, one row, Not now / Keep playing, hairline empties with the song. No checkbox: after Keep playing a toast offers **Always** (learned preference). Toasts step up while it shows.

### Phase C — Artist profile
- [ ] 🔴 Load choreography (D3).
- [ ] ⚪ About card refresh (its dithered background sits behind text — breaks "never behind text").
- [ ] 🟡 Hero name truncates ("Kim Larsen Og B…"). Wrap to two lines / step down size instead.

### Phase D — Cold start
- [ ] 🟡 Pick 1+ (no max, no forced 3). Button reads "Start with N".
- [ ] 🟡 No dead wait: on start, play radio from the picks immediately and land on Home; mixes fill in with skeletons.
- [x] Real portraits (D1) — note: loading skeletons are square while portraits are round.
- [ ] 🟡 More artists (search + load more), stronger layout.

### Later
- [ ] T22 quiet tooltips (good delegation candidate once search bar lands).
- [ ] History in Library (D5).
- [ ] Global motion pass on `motionPresets.ts` (enter/exit/stagger consistency).

---

## Delegation-ready (small, mechanical — fine for Gemini)

### G1 — Toast copy into strings.ts
Legacy calls still pass hardcoded English to `toast.*` (facade in `src/app/utils/toast.ts`):
`App.tsx`, `hooks/useSearchLogic.ts`, `hooks/usePlaybackCore.ts`, `components/shell/noir/NoirSearchPalette.tsx`.
- Move every message into `strings.ts` (new `strings.toast` group). Short, dry, no exclamation marks.
- Replace `toast.x(...)` with `noirToast({ text, description })` in those four files.
- Don't touch `Queue.tsx`, `queue/QueueUpNext.tsx`, `CustomLyricsModal.tsx` unless they're rendered in the NOIR shell (check first).
- Acceptance: `grep -rn "toast\." src/app` only hits the facade; build passes.
