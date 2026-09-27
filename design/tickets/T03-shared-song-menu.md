# T03 — Shared song menu + right-click
**Phase:** 1 · **Depends on:** T02 (toasts) · **Golden sample:** — · **Size:** M

## Goal
Every song, everywhere, has the same menu — from "…" and from right-click.

## Current
`design/audit/Noir/08-song-menu.png`, `07-add-to-playlist.png`: only Play Next / Add to Queue / Add to Playlist; submenu replaces menu with "SELECT PLAYLIST / Back"; no "New playlist", no checkmarks.

## Spec
Exactly `08-craft.md` §6:
- Items: **Play next · Add to queue · Start radio** — **Add to playlist ▸ · Favorite / Remove favorite** — **Go to artist** — contextual **Remove from this playlist / Remove from queue**.
- "Start radio" is rendered but disabled with tooltip `Coming soon` until T11.
- Submenu opens to the side (not replacing): **New playlist** first, search field if > 6 playlists, checkmark on playlists already containing the song.
- Every action ends in a toast: `Added to queue`, `Playing next`, `Added to {name}`, `Removed from {name}` + **Undo**.
- Right-click on any song row opens the same menu at the cursor.
- Menu surface = `--noir-elevated`, radius `--noir-radius-md`, items 32 px high, icons 16 px, `panel` motion from the trigger.

## Files
- `src/app/components/SongRowOptions.tsx` — becomes the shared menu (rename export to `NoirSongMenu` if clean; keep file)
- `NoirSongRow.tsx`, `NoirRankedSongRow.tsx`, queue rows in Now Playing — right-click + use the shared menu
- `src/app/constants/strings.ts` — menu + toast copy

## Acceptance
- [ ] Same menu from "…" and right-click in Home, Discover, chart, Library, playlist, artist, Now Playing queue
- [ ] Submenu has New playlist, checkmarks, and opens sideways
- [ ] Each action shows the right toast; remove actions have Undo

## Don't
- Don't implement radio (T11) or the new playlist page (T04). "New playlist" here creates `Playlist #N` and adds the song, then toast `Added to Playlist #N`.

## Screenshots to take
Menu open · submenu open with a checkmark · right-click menu.
