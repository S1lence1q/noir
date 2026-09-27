# NOIR — Agent handoff

Read this first in a new chat.

**If you were given a ticket:** read `tickets/README.md` (rules) and then only that ticket. The ticket links to the docs you need.

**If you are planning/reviewing:** `07-roadmap.md` → `05-visual-language.md` → `06-product-vision.md` → `08-craft.md` → `09-surface-audit.md`.

## Product

**NOIR** is the UI identity. The repo is still `Elva-redesign`; playback stack is Elva. Do not put “Elva” in chrome.

**North star:** a precise desktop music app wrapped around expressive visual worlds. Solid Level 1 UI. Level 2/3 graphics used sparingly, with form — not CSS glow, not stock dark SaaS.

**Scope:** UI/UX only. Do not rebuild playback, search, queue, lyrics, charts APIs, localStorage, or color extraction — unless a parked decision explicitly green-lights a slice.

## What is done (2026-09-27)

- Persistent **shell**: sidebar + canvas + compact player (`src/app/components/shell/`)
- **Player-in-canvas**: expand stays in shell; now-playing view + Next up; old fullscreen `MusicPlayer` parked (hidden for audio only)
- Compact bar: Spotify-inspired 3-zone layout + seek + song-change animations
- Recently played: list freeze on play + hero crossfade (no jump-to-top mid-click)
- Settings as a shell tab; graphics started (plate wave, halftone empty states)
- Favorites are available from song rows, compact player, Now Playing, search palette, and Library
- Search is centered on the Cmd+K palette; Home has only a subtle search hint and upload lives in the palette
- Queue session flow: playlist/chart play-from-index, Next up remove/move, true up-next count, and re-adding tracks that were already played
- Local files persist through refresh using IndexedDB; local favorites and Recently played can be restored
- Recently played deduplicates stable YouTube/local identities
- Empty listening flow: first-use Home actions for Search/Discover and context-aware Next up suggestions (Favorites → Recently played → Discover)

## Direction (locked 2026-09-27)

- **Visual:** clean black UI + graphic objects made of grain. Dither covers generated in code from each collection's own artwork, spray asterisk as the mark, plate wave only in the sidebar → [05-visual-language.md](./05-visual-language.md)
- **Product:** local listening engine + Last.fm + Deezer → radio, "fans also like", personal Home, mixes, stats/Replay, Discover feed → [06-product-vision.md](./06-product-vision.md)
- **Craft:** every ticket ships states, copy, motion, micro-interactions → [08-craft.md](./08-craft.md)
- **Existing surfaces:** verdicts per screen (volume popup = KILL, playlists/Home/Discover/Library = REDESIGN) → [09-surface-audit.md](./09-surface-audit.md)
- **Order + tickets:** [07-roadmap.md](./07-roadmap.md), [tickets/](./tickets/)
- App runs in the **browser only** (no Electron).

## What is not done

See the roadmap. Start with T01–T03 (shared UI), T09 (engine) can run in parallel. Golden samples T02, T05, T08 are built by the creative director model; other tickets copy their patterns.

## Do / don’t

**Do**

- Solid black chrome, `--noir-*` tokens in `src/styles/noir-shell.css`
- One graphic moment per screen
- Keep `MusicPlayer` mounted while hidden so audio continues
- Ask before committing unless the user asked
- Prefer flow/functionality over new graphics until browsing → queue → next feels obvious

**Don’t**

- Fake `backdrop-filter` / liquid glass on flat black
- Orange CSS glows or static “atmosphere” banners
- Redesign Settings as a popup
- Auto-open fullscreen on play
- Reopen artist-identity / discography architecture until parked doc is picked up
- Sprinkle Level 3 everywhere — graphics only in the slots listed in `05-visual-language.md`
- Editorial typography (giant numbers, cropped type, text printed on covers)
- Paste JPEG graphics onto screens

## Key files

| Area | Path |
|------|------|
| Shell | `src/app/components/shell/AppShell.tsx`, `AppSidebar.tsx`, `CompactPlayerBar.tsx` |
| Now playing | `src/app/components/shell/noir/NoirNowPlayingView.tsx` |
| Search palette | `src/app/components/shell/noir/NoirSearchPalette.tsx` |
| Noir views | `src/app/components/shell/noir/*` |
| Settings | `src/app/components/shell/noir/NoirSettingsView.tsx` |
| Tokens | `src/styles/noir-shell.css` |
| Orchestration | `src/app/App.tsx` |
| Local media persistence | `src/app/utils/localTrackStorage.ts` |
| Hidden player | `src/app/components/MusicPlayer.tsx` (audio engine; UI parked) |
| Design docs | `design/` |

## State names (legacy)

- `landing` = shell
- `processing` = resolving a track
- `ready` = unused for fullscreen overlay (parked)
- Shell expand = `nowPlayingOpen` (not a second app)
- Tabs: `search` (Home), `discover`, `myhub` (Library), `settings`

## User decisions to honor

- Shell-first, not player-first
- Settings is a canvas page, not a modal
- Accent color is not a NOIR shell setting
- Player-only prefs stay out of shell Settings
- Expand never leaves NOIR; fullscreen glass player is deferred/parked
- Graphics: objects with form; skip glow-only AI banners — **deferred until flow is solid**
- **Artist profiles:** user is tired of guessing the wrong artist — correctness before cleverness when that work opens ([004](./decisions/004-artist-profile.md))

## Next work (in order)

Follow [07-roadmap.md](./07-roadmap.md). Next tickets: T01 → T02 → T03, with T09 in parallel. Artist identity (004) is unparked in T19 via Last.fm/MusicBrainz ids.

## Recent context

- `f8801c92` — Complete NOIR shell playback and favorites UX
- `4f53b254` — Polish NOIR action controls
- `f7192904` — Stabilize local track playback
- `6517ccee` — Polish search and queue empty states
- `baa3fc96` — Improve empty listening flow
- Graphics paused by product choice; core listening flow is now the priority.