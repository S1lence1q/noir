# Tickets

One ticket = one chat = one focused change (1–4 files ideally).

## Rules for the implementing model

1. Read `design/HANDOFF.md` first, then only the ticket you were given.
2. Do **only** what the ticket says. If something else looks broken, write it under "Notes" at the end of your reply; don't fix it.
3. Copy patterns from the golden samples named in the ticket instead of inventing new ones.
4. All user-facing text goes in `src/app/constants/strings.ts`.
5. Use `--noir-*` tokens and motion tokens (`tap` / `panel` / `scene`); no new colors or durations.
6. Don't touch playback internals (`MusicPlayer.tsx`, `usePlaybackCore.ts`, crossfade) unless the ticket says so.
7. Finish by running `npm run build` and listing what the user should screenshot.

## Template

```md
# TNN — Title
**Phase:** · **Depends on:** · **Golden sample:** · **Size:** S/M/L

## Goal
One or two sentences: what the user should feel/see.

## Current
What it looks like / does now (screenshot in design/audit/Noir/…).

## Spec
Exact behavior, layout, copy, tokens, states.

## Files
- path — what changes

## Acceptance
- [ ] …

## Don't
- …

## Craft checklist
(paste from 08-craft.md)

## Screenshots to take
- …
```

## Index

**Owner:** Opus = visual / hard (built by the creative director model). Luna = mechanical, clear spec.

| Id | Title | Size | Golden | Owner |
|----|-------|------|--------|-------|
| T01 | Layout grid, type hierarchy, accent token — **DONE** | M | | Luna |
| T02 | Toast system + kill volume popup — **DONE (golden)** | M | yes | Opus |
| T03 | Shared song menu + right-click — **DONE** | M | | Luna |
| T04 | Playlists — **DONE** (side panel, fly-to-list, drag-to-sidebar). ⌘N wired + in shortcuts map | L | | Opus → Luna ⌘N |
| T05 | Queue craft — empty Next up **DONE (golden)**; see T05b for leftovers | M | yes | Opus/Luna |
| T05b | Next up header + "queue ends soon" — verify/polish (header mostly in; ends overlaps T11) | S | | Luna |
| T06 | Dither covers — **DONE** | M | | Opus |
| T07 | Asset cleanup — **partial**; finish unused-asset checklist | S | | Luna |
| T08 | `NoirMark` — component + sidebar **DONE (golden)**; loading/empty use still open | S | yes | Opus |
| T09 | Listening events + taste profile — **DONE** | M | | Luna |
| T10 | musicGraph (Last.fm + Deezer) — **DONE** | L | | Luna |
| T11 | Radio + autoplay — **DONE** | M | | Opus |
| T12 | Daily mixes + Home shelf — **DONE** | L | | Opus |
| T14 | Now Playing one object — **A+B DONE**; C Playing from + similar **DONE**; lyrics still open; D parked | M | | Opus |

### Original index

| Id | Title | Size | Golden |
|----|-------|------|--------|
| T01 | Layout grid, type hierarchy, accent token | M | |
| T02 | Toast system + kill volume popup — **DONE (golden)** | M | yes |
| T03 | Shared song menu + right-click | M | |
| T04 | Playlists redesign | L | |
| T05 | Queue craft — empty queue **DONE (golden)**; header + "queue ends soon" still open | M | yes |
| T06 | `NoirDitherCover` renderer | M | |
| T07 | Asset cleanup | S | |
| T08 | `NoirMark` asterisk — component + sidebar **DONE (golden)**; loading/empty-state use still open | S | yes |

## Golden sample files (copy these patterns)

- Toast: `src/app/components/shell/noir/NoirToast.tsx` — call `noirToast({ text, cover?, action? })` from anywhere
- Motion tokens: `MOTION.tap / panel / scene` in `src/app/utils/motionPresets.ts`, wrap with `withReducedMotion()`
- Mark: `src/app/components/shell/noir/NoirMark.tsx`
- Empty state + batch action + Undo: empty branch in `src/app/components/shell/noir/NoirNowPlayingView.tsx`
- Buttons: `.noir-button-primary` / `.noir-button-secondary` in `src/styles/noir-shell.css`
- Copy: `strings.nextUp` in `src/app/constants/strings.ts`
| T09 | Listening events + taste profile | M | |
| T10 | musicGraph service (Last.fm + Deezer) | L | |
| T14 | Now Playing: one object (shared element, no double UI) | M | |
