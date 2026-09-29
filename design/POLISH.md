# POLISH — the single punch list

*Owner: Opus (creative direction). Last updated: 2026-09-29.*
Single source of truth for "not done yet". Tickets are for features; this is for finish.
Severity: 🔴 broken · 🟡 feels off · ⚪ finish. Check a box only when the surface meets the Definition of Done.

## Next up (handoff, 2026-09-29)
1. ~~Phase E #5 — page/tab change motion~~ done (`noir-settle-group`).
2. ~~Phase E #6–7 — shelves + search palette~~ done.
3. ~~Phase D — cold start~~ done.
4. Leftovers: atmosphere setting (glow/grain).
Motion vocabulary lives in `utils/motionPresets.ts` (`MOTION.tap/panel/scene/settle`) and `utils/actionMotion.ts` (fly-to-queue, favorite burst).

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
- [x] 🟡 Search palette dropped the first keystrokes after ⌘K / `/`. Input now focused in a layout effect (same commit as mount).
- [x] ⚪ Collection cards (discography, Library grid): no hover box; artwork dims, play appears.

### Phase B — Now Playing
- [x] 🔴 Lyrics ↔ queue flow (D2). Lyrics + Next up are two toggles side by side in the bar (quote / list icons, shared on-state). Rail animates width (spring), cover shrinks via CSS width transition, exclusive only below 1200px.
- [x] 🟡 Canvas without lyrics: the identity is centred in the stage (beside the rail when it's open) and a size up (56vh / 480 px). Centring is an animated margin, not a re-anchor, so rail/lyrics toggles glide (measured: monotonic, ≤ 16 px/frame).
- [ ] ⚪ Atmosphere: keep both. Glow default, grain via `?atmosphere=grain`. Later: expose as a Settings choice (Settings pass).
- [x] 🔴 Lyrics started mid-song then jumped back on a new track (stale currentTime from the previous song). Index now waits until playback is near 0 (2 s grace for mid-song restore).
- [x] 🔴 Some songs out of sync: lrclib's first hit is often another version (e.g. 303 s vs the playing 262 s). Now picks the version closest in length (±5 s); none close → plain text instead of wrong timing.
- [x] 🔴 Cover hopped mid-animation when hiding lyrics: stage row re-anchored (center → flex-start) while lyrics were still exiting. Row now always centred; title size transitions.
- [x] 🔴 Lyrics mode closed itself on every song change (`useLyrics` reset `showLyrics`) and the column unmounted while loading → stage collapsed/re-opened each track. Mode now survives song changes; column stays and shows skeleton / empty state.
- [x] 🔴 Cover flash after closing Now Playing (was parked ~1/100; repro: NP → Home/Discover via sidebar). Measured: the exiting NP copy lands in the bar, then for one frame shows at full size / opacity 1 before unmount (projection lets go before React removes it). Fix: the NP cover's own opacity animates to 0 while exiting; the crossfade drives it during the flight, so nothing changes visually until that frame, which is now invisible. Needs a visible-pane re-check.
- [x] 🟡 Lyrics finish: constant weight (no rewrap), column-local scroll, active held at 38%, distance fade, breathing dots for instrumental gaps and long intros, line-rhythm loading skeleton.
- [x] 🟡 Toast primitive: one system (sonner removed, `utils/toast.ts` facade → noirToast), description line, settle-in / step-out swap, anchored to `--noir-bar-h`.
- [x] 🟡 "Queue ends soon": toast-family card, one row, Not now / Keep playing, hairline empties with the song. No checkbox: after Keep playing a toast offers **Always** (learned preference). Toasts step up while it shows.

### Phase C — Artist profile
- [x] 🔴 Load choreography (D3). Hero (name + colour) renders instantly; portrait holds a skeleton (`pending`) instead of a fallback. Popular + Latest release reveal together behind an exact-shape skeleton once tracks, albums, portrait and latest cover are decoded (max 1.2 s). Below-fold sections mount after the reveal. Previous artist's albums/fans are cleared on navigation.
- [x] ⚪ About: text only (hero owns the portrait), bio clamped by lines with Read more only when it cuts, facts column (From / Albums / Singles & EPs / Bio source).
- [x] 🟡 Hero name wraps to two balanced lines; long names step down a size.

- [x] 🔴 Profile loaded twice when hopping artists: gate was keyed on name+deezerId, and the id arrives later. Now keyed on name, refined refetch keeps the page, reveal is latched. Verified: 5 hops → exactly one skeleton each.
- [x] 🔴 Artist opened from the bar landed *under* an open mix. Detail overlays now stack by recency; closing the top one reveals the one beneath.
- [x] 🔴 Sidebar claimed Home while an artist was open, and clicking the current tab did nothing (overlay stayed). Tab / Favorites / playlist clicks now always close detail overlays; under an overlay the tab shows the D4 parent state.
- [x] 🔴 Artist → another tab flashed the old page (e.g. Favorites) while the overlay faded. A tab change made under an overlay drops the old page instantly; the overlay steps back onto the new one.
- [x] 🔴 Same flash from Now Playing (NP → Library showed Home for a beat). The drop-old-page latch now covers Now Playing too.
- [x] 🟡 Identity: "Kim Larsen & Kjukken" opened as "Kim Larsen". `getPrimaryArtist` no longer splits one act: "& The …", ", The …", "& Sons/Band/…" rules plus a short curated list (Simon & Garfunkel, Earth, Wind & Fire, Nik & Jay, …). Collabs still split ("Taylor Swift & Ed Sheeran" → Taylor Swift). Verified: the profile opens as the band, band portrait, band tracks. Known limit: two-name duos not on the list ("Andy & Lucas") still split.

### Phase D — Cold start
- [x] 🟡 Pick 1+ (cap 12 only as a guard). Floating bar: picked avatars + "Start with N"; always reachable. Search picks stay in the grid once the search clears.
- [x] 🟡 No dead wait: Home in ~30 ms (phase-1 seed is local only; top-track enrichment runs in the background, in parallel). A "Your picks" station (`buildPicksStation`: picks' top tracks round-robin, then related radio) is playing ~1.5 s after the click.
- [x] Real portraits (D1): Deezer portraits via `getArtistImage` (2.5 s timeout → chart cover). Skeletons are the exact shape (round + name line).
- [x] 🟡 More artists: home country + US + GB charts alternated (~30), "Show more". Layout: no card, owns the page, 112 px portraits, selection ring + springy check.

### Phase E — Motion pass
Principle: motion explains cause → effect (where did it go, what changed). One expressive beat per action, everything around it quiet (MOTION.panel/settle). Creation gets the "new playlist" spring; ambient things never loop for attention.
- [x] Add to queue / Play next: the pressed row's artwork arcs into the bar's Next up button (`utils/actionMotion.ts`, origin = last touched row, incl. palette rows via `data-fly-source`); button pulses on arrival; count rolls.
- [x] Favorite: the pressed heart pops and the NOIR mark (same five arms) springs from it in ember.
- [x] Play ↔ pause: `NoirPlayPauseIcon` morphs triangle halves ↔ bars (bar + Home hero).
- [x] Track change in Now Playing: deck slide by queue direction (next → from right, prev → from left).
- [x] Detail overlay close: steps back (fade + scale .99, 200 ms) instead of dropping away like a sheet.
- [x] Lyrics breathing dots hold mid-breath while paused (`animation-play-state`).
- [x] 🟡 "Track switch stall": not the main thread (LoAF: no frame > 50 ms on next / new track, NP + lyrics open). The new title waited behind `AnimatePresence mode="wait"` (old title's 280 ms exit first) in the bar, NP and Home hero; the bar also re-animated when the artwork URL changed. Now `popLayout` (new title in ~20 ms, fully in ~100 ms; old steps out on top in 140 ms), bar keyed on title+artist. Plus: a tapped song whose stream is still resolving shows in the bar at once (`pendingSong`, quiet sweep on the track).
- [x] Tab/page change: content settles in (fade + 8 px rise, sections staggered 40 ms). CSS primitive `noir-settle-group` (direct children stagger, capped at 240 ms) / `noir-settle` in `noir-shell.css`, `backwards` fill so motion/react transforms aren't held. On Home idle, Discover, Library (+ Favorites / playlist grid), Settings, scaffold header. Old page exits in 120 ms.
- [x] Shelves: items stagger in the first time they scroll into view (`NoirHomeShelf` `data-reveal`: on screen at mount → rides the page settle; below the fold → held, then 35 ms stagger on first intersect).
- [x] Search palette: opens with a settle (scale .98 → 1, 6 px), exits in 140 ms; a new result set staggers in 20 ms apart (`noir-stagger-rows`), rows that persist don't move.

### Phase F — Responsive shell (found in the broad pass, 2026-09-29)
- [x] 🔴 Phone width was broken: fixed 248 px sidebar ate half the screen, bar controls overlapped. Now ≥ 1024 full sidebar · 640–1023 icon rail (72 px, labels hidden) · < 640 bottom tab bar (Home, Search, Discover, Library; Settings via a gear in Library).
- [x] 🔴 Phone bar: mini-bar (cover, title, play, next, thin progress). With Now Playing open it becomes the transport again (prev, times, lyrics, queue; volume stays hidden).
- [x] 🔴 Stacked Now Playing (≤ 960): queue spilled 60 px under the bar. Stage now takes what the queue leaves; cover steps down with the queue open; lyrics fill the remaining height with cover + title side by side.

- [x] 🟡 Phone artist hero: portrait on top fading into the colour field, name below it (was text across the face).
- [x] 🟡 Song rows on touch/phone: hover-only actions reserved ≥ 96 px, so titles truncated at ~8 chars. Touch shows the always-visible More menu only; phone grid hugs it; duration hidden.
### Later
- [ ] T22 quiet tooltips (good delegation candidate once search bar lands).
- [ ] History in Library (D5).
- [ ] Global motion pass on `motionPresets.ts` (enter/exit/stagger consistency).

---

## Delegation-ready (small, mechanical — fine for Gemini)

### G1 — Toast copy into strings.ts — **DONE**
Legacy calls still pass hardcoded English to `toast.*` (facade in `src/app/utils/toast.ts`):
`App.tsx`, `hooks/useSearchLogic.ts`, `hooks/usePlaybackCore.ts`, `components/shell/noir/NoirSearchPalette.tsx`.
- Move every message into `strings.ts` (new `strings.toast` group). Short, dry, no exclamation marks.
- Replace `toast.x(...)` with `noirToast({ text, description })` in those four files.
- Don't touch `Queue.tsx`, `queue/QueueUpNext.tsx`, `CustomLyricsModal.tsx` unless they're rendered in the NOIR shell (check first).
- Acceptance: `grep -rn "toast\." src/app` only hits the facade; build passes.
