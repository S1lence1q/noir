# NOIR — Agent handoff

Read this first in a new chat.

**If you were given a ticket:** read `tickets/README.md` (rules) and then only that ticket. The ticket links to the docs you need.

**If you are the creative director / planning / reviewing:** this file → `tickets/README.md` (status + owners) → `05-visual-language.md` → `08-craft.md` → `06-product-vision.md` → `07-roadmap.md` → `09-surface-audit.md`.

## Product

**NOIR** is the UI identity. The repo is still `Elva-redesign`; playback stack is Elva. Do not put "Elva" in chrome.

**North star:** a precise music app wrapped around expressive visual worlds. Clean black UI; graphic objects made of grain, generated from the music itself. Aiming for Spotify-level Home/Discover (personal, alive), not just a player + a chart.

**Constraints:** personal project, **browser only** (no Electron), zero running costs, local-first.

## How we work (user preferences — important)

- User speaks Danish; answer in Danish. UI copy is English.
- **Creative director model (Opus) builds the hard/visual work** (graphics, animation, UX-heavy screens). Cheaper models (Luna/Grok) get mechanical, clearly-specced tickets. See owners in `tickets/README.md`.
- **Save limit:** user takes screenshots themselves. Do not run the browser. Be economical; read only what you need.
- Build (`npm run build`) after every change; **commit after every finished step** (user has allowed commits).
- **Never `git add src`** — `src/Cinematic Dark Music Background.jpeg`, `src/Plate Wave Recreation Image.jpeg`, `src/abstract cloud like form.jpeg` are untracked originals and must stay untracked. Stage `src/app src/styles design` explicitly.
- User reacts to screenshots; iterate quickly. When something "feels off", assume a real problem and find the cause.

## User taste learned (honor these)

- **Clean** above all. Editorial style (giant numbers, cropped type, magazine layouts) = no.
- **Nothing may jump.** Layout must stay stable when adding/removing things (search fields must not move, lists must not shift under the cursor, headers must not flash).
- **Animation matters a lot.** "Basic" fades aren't enough; use springs, staggers, shared-element motion (see Now Playing cover flight, playlist entrance, fly-to-list). User called the Now Playing animation "perfect" — use it as the bar.
- Surfaces: black + white-alpha tints, floating = black + 12% hairline. Opaque greys read as "off" (see `05-visual-language.md` → UI surfaces).
- Now Playing **artwork gradient atmosphere is wanted** (user-approved) — don't remove it.
- Two similar-looking lists stacked = confusing. Separate "what's in it" from "where to find more" (playlist side panel pattern).
- Favorites has its own fixed cover (ember + spray asterisk) — recognizable everywhere.
- Suggestions are fine but must not be intrusive or always in the way.

## What is done (2026-09-27)

Shell, player-in-canvas, compact bar, Cmd+K search, queue flow, local files (earlier work), plus this session:

- **Design system docs:** `05`–`09`, tickets T01–T10, T14, boards in `design/boards/`, references mapped
- **Golden samples:** `NoirMark` (asterisk), `NoirToast` + `noirToast()` (replaces mini HUD + volume popup), inline volume value in the bar, empty Next up with Add 10 / Shuffle all + Undo
- **T01** grid/type/accent (Luna, fixed); song-row grid scoped to `.noir-song-grid`
- **T06 dither covers:** `NoirDitherCover` + `utils/ditherCover.ts` (Bayer, color worlds, field-dominant inversion, IndexedDB cache). Used on charts, playlists, Discover, Home, sidebar
- **T04 playlists:** `utils/playlistStore.ts` (single source of truth + undo), `NoirUserPlaylistPage` (click-to-rename, whole-row drag reorder, remove w/ undo, **right side add panel** with search + Favorites/Recents tabs, cover flies into list, entrance animation), Library grid, sidebar "+" and covers
- **T14 Now Playing:** cover flies bar ↔ canvas (`layoutId="np-cover"` in a `LayoutGroup`), bar identity hidden while open, atmosphere fades in after landing
- **Home redesign:** greeting + Continue + one dithered object, Jump back in tiles, Your library shelf, artist circles
- **Discover redesign:** two chart cards + two-column Top 10s (data is still only DK + Global charts)
- **Artist page:** color-world poster with dithered portrait, Popular + Show all, dedupe
- **Favorites cover:** `NoirFavoritesCover`

## Next (in order)

1. **Luna (high): T09** listening engine, then **T10** musicGraph (needs free Last.fm key in `.env`). Luna also: **T03** shared song menu (suggested design: one global menu host in App opened via `openSongMenu(track, event)` so right-click and "…" are identical everywhere), **T05b**, **T07**, drag-song-to-sidebar-playlist, ⌘N.
2. **Opus (visual):** ~~spray wave in Now Playing~~ **parked 2026-09-27** (see [005](./decisions/005-no-now-playing-wave.md)). After T10: Discover feed shelves (new releases, artists like X, genres) and **mixes with generated covers**; then Stats/Replay (Bone cards).
3. User has a list of small tweaks to bring — ask for it.

## Do / don't

**Do:** `--noir-*` tokens; `MOTION` tokens + `withReducedMotion`; copy in `strings.ts`; toasts with Undo for reversible actions; one graphic beat per screen; keep `MusicPlayer` mounted (audio engine).

**Don't:** glassmorphism/backdrop blur; opaque grey surfaces; editorial type; paste JPEG graphics; text printed on covers; AnimatePresence exit-waits around shared-layout elements (caused a double title); `overflow: hidden` on ancestors of flying elements (clipped the cover flight).

## Key files

| Area | Path |
|------|------|
| Shell | `src/app/components/shell/AppShell.tsx`, `AppSidebar.tsx`, `CompactPlayerBar.tsx` |
| Views | `src/app/components/shell/noir/*` (Home, Discover, Library, UserPlaylistPage, PlaylistView, ArtistView, NowPlaying, Settings, SearchPalette) |
| Graphics | `NoirDitherCover.tsx`, `NoirFavoritesCover.tsx`, `NoirMark.tsx`, `utils/ditherCover.ts` |
| Feedback | `NoirToast.tsx` (`noirToast`), `utils/hudUtils.ts` (legacy forwarder) |
| Data | `utils/playlistStore.ts`, `utils/elvaStorage.ts`, `utils/localTrackStorage.ts` |
| Tokens / motion / copy | `src/styles/noir-shell.css`, `utils/motionPresets.ts`, `constants/strings.ts` |
| Orchestration | `src/app/App.tsx` (1.7k lines; listens to `noir-open-favorites`, `noir-open-playlist`, `elva-open-search-palette`) |
| Hidden audio engine | `src/app/components/MusicPlayer.tsx` |

## State names (legacy)

`landing` = shell · `nowPlayingOpen` = expanded player in canvas · tabs: `search` (Home), `discover`, `myhub` (Library), `settings`.

## Standing user decisions

Shell-first · Settings is a canvas page · no accent-color setting · expand never leaves NOIR · artist identity correctness before cleverness ([004](./decisions/004-artist-profile.md), unparked via Last.fm/MusicBrainz ids in T10+).
