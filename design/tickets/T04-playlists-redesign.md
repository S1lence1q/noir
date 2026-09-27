# T04 — Playlists redesign
**Phase:** 4 · **Depends on:** T01, T02, T03, T06 · **Golden sample:** chart page layout (`NoirDetailOverlay` / chart view) · **Size:** L (may be split into T04a page, T04b create/rename, T04c drag)

## Goal
Playlists feel like first-class collections: create in one click, a proper page, easy to fill, safe to delete.

## Current
`design/audit/Noir/05-playlist.png`, `06-playlist-create.png`: tiny header inside the Library tab, "Delete" as text next to "Play all", inline name field above a 2-column grid, grey icon for empty playlists.

## Spec
**Collection page (shared template for playlist, favorites, chart)**
- Header: 200 px `NoirDitherCover` (source = first track artwork; empty → Bone field + spray asterisk) · label `PLAYLIST` (`--noir-type-label`) · title (`--noir-type-page`, 40 px) · meta `12 songs · 48 min` · actions: **Play** (primary round) · **Shuffle** · **…** (Rename, Delete).
- Clicking the title turns it into an inline input (Enter saves, Esc cancels).
- Rows use the T01 grid; drag handle on hover; drag to reorder (`08-craft.md` drag behavior).
- Opens in the canvas as a page with a back button (top left, `←`), not inside a Library tab.

**Create**
- "New playlist" (sidebar "+" next to the Playlists heading, song menu, ⌘N) creates `Playlist #N` immediately, opens its page, and focuses the title input with the text selected.
- Remove the inline "Playlist name / Create" field from Library.

**Empty playlist** — copy from `08-craft.md` ("Let's fill this up"): inline search (reuse search palette logic, results show "Add" buttons) + "Suggested" (favorites until T10 exists).

**Delete** — from "…": deletes immediately, navigates back, toast `Playlist deleted` + **Undo** (5 s restores it fully).

**Sidebar** — playlists show a 20 px cover thumbnail (dither cover) instead of the generic icon; accept dropped songs (highlight on drag over, toast on drop).

## Files
- `src/app/components/shell/noir/NoirPlaylistView.tsx` — becomes the collection page
- `src/app/components/shell/noir/NoirLibraryView.tsx` — remove create field and inline playlist detail
- `src/app/components/shell/AppSidebar.tsx` — "+", thumbnails, drop target
- `src/app/App.tsx` — route "open playlist" to the canvas page; ⌘N
- `src/app/utils/elvaStorage.ts` — reorder + restore-after-delete helpers if missing

## Acceptance
- [ ] One click creates a playlist and puts me in its title
- [ ] Rename by clicking the title
- [ ] Empty playlist lets me search and add without leaving the page
- [ ] Reorder by drag persists after refresh
- [ ] Delete → Undo restores name, songs, order
- [ ] Sidebar shows covers and accepts dropped songs

## Don't
- Don't build playlist descriptions, folders, or collaborative features.

## Screenshots to take
Fresh new playlist (title focused) · empty playlist page · filled playlist page · drag in progress · sidebar with covers.
