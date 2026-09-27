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
| T03 | Shared song menu + right-click — **DONE** (`components/NoirSongMenu.tsx`: `openSongMenu()` + one `NoirSongMenuHost`; reviewed, surface → `.noir-menu`). Start radio wired via T11 | M | | Luna |
| T04 | Playlists redesign | L | | Opus |
| T04 | Playlists — **DONE** (side add-panel, fly-to-list, entrance, drag-to-sidebar). Open: ⌘N | L | | Opus → Luna for ⌘N |
| T05b | Next up header + "queue ends soon" — header/shuffle/clear largely in; queue-ends overlaps T11 autoplay — verify/polish | S | | Luna |
| T07 | Asset cleanup — partially done (heroes/glow); finish unused-asset delete/rename checklist | S | | Luna |
| T14 | Now Playing: one object — **A+B DONE**. D parked. Open: **C** "Playing from"/similar/lyrics slot | M | | Opus |
| T12 | Daily mixes + Home shelf — **DONE** (`services/mixes/dailyMixes.ts`) | L | | Opus |
| T11 | Radio + autoplay — **DONE** (`services/radio/buildRadio.ts`) | M | | Opus |

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
