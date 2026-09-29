# T22 — Quiet tooltips (search + deferred help copy)
**Phase:** later · **Depends on:** — · **Golden sample:** — · **Size:** M

## Goal
Help text that used to sit in the UI (empty states, placeholders) moves into short tooltips — visible on hover/focus only, never as permanent body copy.

## Why
Search empty state used to say: “Type to search — or paste a YouTube / Apple Music link.” That cluttered the palette. Apple Music link paste was never confirmed working for the product owner. Prefer tooltips “one day” over stuffing the empty field.

## Spec
**System**
- One shared tooltip primitive (portal, delay ~400 ms, fade, `--noir-elevated`, `--noir-type-label`, max ~40 ch).
- Show on `title`-worthy controls: hover + keyboard focus. Never on mobile tap as a blocking layer.
- Copy lives in `strings.ts`.

**First content (search)**
- Search input / ★ affordance tooltip: e.g. “Search songs or artists. You can also paste a YouTube link.”
- Only mention Apple Music **after** paste/resolve is verified.
- Upload “File” control: “Upload a local audio file.”
- Do **not** bring the empty-body paragraph back.

**Later candidates**
- Compact bar: hold-to-charge volume, queue toggle.
- Sidebar: nav labels only if icons alone become ambiguous.
- Artist row in search already says “Go to artist” — no tooltip required.

## Files
- new tooltip component under `src/app/components/shell/noir/`
- `src/app/components/shell/noir/NoirSearchPalette.tsx` — wire first tips
- `src/app/constants/strings.ts` — tip copy

## Acceptance
- [ ] Empty search body stays quiet (no link essay).
- [ ] Hover/focus on search field shows one short tip.
- [ ] No Apple Music mention until link resolve is tested.
- [ ] Tooltips don’t fight the palette z-index / motion.

## Don't
- Don’t restore the old empty-state paragraph.
- Don’t invent a heavy help system / coach marks.
- Don’t tip every icon at once — search first.
