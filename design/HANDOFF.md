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
- **Never `git add src`** — `src/Plate Wave Recreation Image.jpeg`, `src/abstract cloud like form.jpeg` are untracked originals and must stay untracked. (`src/Cinematic Dark Music Background.jpeg` was deleted in T07; its only copy is `src/assets/noir/atmosphere-warm.jpeg` — never delete that file.) Stage `src/app src/styles design` explicitly.
- User reacts to screenshots; iterate quickly. When something "feels off", assume a real problem and find the cause.

## User taste learned (honor these)

- **Clean** above all. Editorial style (giant numbers, cropped type, magazine layouts) = no.
- **Nothing may jump.** Layout must stay stable when adding/removing things (search fields must not move, lists must not shift under the cursor, headers must not flash).
- **Animation matters a lot.** "Basic" fades aren't enough; use springs, staggers, shared-element motion (see Now Playing cover flight, playlist entrance, fly-to-list). User called the Now Playing cover flight "perfect" — use it as the bar. Queue **Shuffle** = Soft settle (opacity/blur ease in from sharp, not snap-on blur) + icon spin.
- Surfaces: black + white-alpha tints, floating = black + 12% hairline. Opaque greys read as "off" (see `05-visual-language.md` → UI surfaces).
- Now Playing **artwork gradient atmosphere is wanted** (user-approved) — don't remove it.
- Two similar-looking lists stacked = confusing. Separate "what's in it" from "where to find more" (playlist side panel pattern). **Discover:** Charts cards only — no duplicate Top 10 list under the same chart.
- Favorites has its own fixed cover (ember + spray asterisk) — recognizable everywhere.
- Suggestions are fine but must not be intrusive or always in the way.
- **Similar artists** do **not** live permanently under the NP title block (parked; revisit artist-page / on-demand).
- Closing NP: fade title/queue/atmosphere immediately (`useIsPresent`); keep cover flight slot intact (no CSS transform/filter on `layoutId="np-cover"`; AppShell exit opacity stays 1).

## What is done (2026-09-27)

Shell, player-in-canvas, compact bar, Cmd+K search, queue flow, local files (earlier work), plus this session:

- **Design system docs:** `05`–`09`, tickets T01–T14, boards in `design/boards/`, references mapped
- **Golden samples:** `NoirMark` (asterisk), `NoirToast` + `noirToast()`, inline volume in the bar, empty Next up with Add 10 / Shuffle all + Undo
- **T01** grid/type/accent; song-row grid scoped to `.noir-song-grid`
- **T06 dither covers:** `NoirDitherCover` + `utils/ditherCover.ts`
- **T04 playlists:** `playlistStore`, `NoirUserPlaylistPage` (rename, whole-row drag, add panel, fly-to-list). Drag settle restored (scale 1.02 + 120 ms layout; don't set `layout: { duration: 0 }` again)
- **T08** Mark: sidebar + Library empty spray + search loading spin
- **T09–T12, T11:** listening/taste, musicGraph, radio/autoplay, daily mixes + Home
- **T14 A+B:** cover flight bar ↔ canvas; bar identity hidden while open; atmosphere after landing
- **T14 C (partial):** `Playing from {source}` under artist (clickable when resolvable). `queueSource` cleared when starting a song **outside** the current queue (search/direct play = fresh context). Similar artists **parked**. Soft Shuffle animation in Next up. **Lyrics still open.**
- **Home:** greeting + Continue + dithered object, Jump back in, library shelf, artist circles
- **Discover:** taste feed shelves + chart cards (no redundant Top 10 under Charts)
- **Artist page:** dithered poster, Popular, dedupe; identity via Last.fm/MusicBrainz/Deezer
- **Compact bar:** Close fades on the left (does not steal cover slot); queue opens only when closed; title/artist underline scoped separately
- **⌘N** new playlist + listed in shortcuts map

## Next (in order)

1. **Now: T14 lyrics in Now Playing** — see `tickets/T14-now-playing-one-object.md` §C. Toggle `L` / button top-right; lyrics replace the Next up column; reuse `useLyrics` / existing fetch — reposition only, don't rewrite the engine.
2. Then: Stats/Replay · F7 cold start · T05b verify · T07 unused-asset leftovers (`top_hits_*.png` still imported by legacy `DiscoverView.tsx`).
3. Parked later: Similar artists (artist page / on-demand), spray wave (decision 005), NP graphic slot.

## Do / don't

**Do:** `--noir-*` tokens; `MOTION` tokens + `withReducedMotion`; copy in `strings.ts`; toasts with Undo for reversible actions; one graphic beat per screen; keep `MusicPlayer` mounted (audio engine).

**Don't:** glassmorphism/backdrop blur; opaque grey surfaces; editorial type; paste JPEG graphics; text printed on covers; AnimatePresence exit-waits around shared-layout elements (caused a double title); `overflow: hidden` on ancestors of flying elements (clipped the cover flight); fade the whole NP layer on exit (kills cover flight — fade chrome only).

## Key files

| Area | Path |
|------|------|
| Shell | `src/app/components/shell/AppShell.tsx`, `AppSidebar.tsx`, `CompactPlayerBar.tsx` |
| Views | `src/app/components/shell/noir/*` (Home, Discover, Library, UserPlaylistPage, PlaylistView, ArtistView, NowPlaying, Settings, SearchPalette) |
| Graphics | `NoirDitherCover.tsx`, `NoirFavoritesCover.tsx`, `NoirMark.tsx`, `utils/ditherCover.ts` |
| Feedback | `NoirToast.tsx` (`noirToast`), `utils/hudUtils.ts` (legacy forwarder) |
| Data | `utils/playlistStore.ts`, `utils/elvaStorage.ts`, `utils/localTrackStorage.ts`, `services/listening/*`, `services/musicGraph/*`, `services/discover/discoverFeed.ts`, `services/mixes/dailyMixes.ts`, `services/radio/buildRadio.ts`, `services/artistIdentity/*` |
| Lyrics | `hooks/useLyrics.ts`, `utils/lyricsUtils.ts` — wire into `NoirNowPlayingView` for T14 lyrics |
| Tokens / motion / copy | `src/styles/noir-shell.css`, `utils/motionPresets.ts`, `constants/strings.ts` |
| Orchestration | `src/app/App.tsx` (listens to `noir-open-favorites`, `noir-open-playlist`, `elva-open-search-palette`) |
| Hidden audio engine | `src/app/components/MusicPlayer.tsx` |

## State names (legacy)

`landing` = shell · `nowPlayingOpen` = expanded player in canvas · tabs: `search` (Home), `discover`, `myhub` (Library), `settings`.

## Standing user decisions

Shell-first · Settings is a canvas page · no accent-color setting · expand never leaves NOIR · artist identity correctness before cleverness ([004](./decisions/004-artist-profile.md)) · Similar not in NP title block · Discover Charts without duplicate ranked lists · Soft shuffle for queue.
