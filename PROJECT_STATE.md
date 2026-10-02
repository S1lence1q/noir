# PROJECT_STATE — NOIR

*Last updated: 2026-10-02*
*Repository:* `S1lence1q/noir` · *Live Production:* https://noir.arkivet.xyz/

---

## 1. Product & North Star

**NOIR** is a desktop-grade browser music application.

- **North star:** A precise music application wrapped around expressive visual worlds.
- **Core balance:** Solid interface + atmospheric environment.
  - The interface is solid, grounded, application-grade.
  - The music is atmospheric, immersive, and expressive.
- **Visual material:** Grain (1-bit ordered dither, halftone, spray, film noise). Never smooth glow. Never glassmorphism. Never decorative JPEGs.
- **Constraints:** Personal project, browser-only (no Electron), $0.00 running costs, local-first.

---

## 2. Core Design Rules & Principles (from Opus docs)

Defined in `design/01-principles.md`, `design/05-visual-language.md`, `design/08-craft.md`, and `design/HANDOFF.md`:

### Visual Language & Surfaces
1. **Clean black UI:** Base foundation is pure black. Tints are strictly **white-alpha on black** (`rgba(255,255,255, .04–.10)`). Opaque greys (`#111`, `#1a1a1a`) read as "off" and are forbidden.
2. **Floating surfaces:** `--noir-black` + `1px rgba(255,255,255, 0.12)` hairline + deep shadow (`.noir-menu`, `.noir-toast`, `.noir-search-palette`).
3. **No editorial style:** Editorial typography (giant numbers, cropped type, magazine layouts) = **NO**. UI type only.
4. **One graphic beat per screen:** Graphics only appear where they represent something (brand, what is playing, collection, data). Graphics sit next to or above content, never behind text.
5. **Color from context:** Base UI is black with off-white type. Color comes from artwork and sound identity, never from permanent SaaS marketing accents. Max one color world per cover; never gradients between worlds.

### Stability & Craft
1. **Nothing may jump:** Layouts must stay rock-solid when adding, removing, or loading items. Search fields must not move, lists must not shift under the cursor, headers must not flash.
2. **Animation matters:** No basic snap-fades. Shared-element cover flight between compact bar and canvas (`scene`), soft shuffle settle (blur/opacity ease-in), and panel entries.
3. **List separation:** Two similar-looking lists stacked = confusing. Always separate "what's in it" from "where to find more" (e.g. playlist side-panel pattern, charts without duplicate Top 10 lists).
4. **Tone of voice:** Short, dry, warm English. No exclamation marks, no marketing buzzwords. Buttons are verbs (**Add 10**, **Start radio**, **Clear**). All copy in `src/app/constants/strings.ts`.
5. **6 Mandatory states:** Every screen designs empty, loading (exact-shape skeletons, no list spinners), partial, error, offline, and done/success (toast with Undo).

---

## 3. Production & Build Health

- **Build Pipeline:** `npm run build` (`prefetch:charts` + `vite build`) completes cleanly in ~1.5 seconds.
- **Deployment:** Automated via `.github/workflows/deploy.yml` on push to `main` → https://noir.arkivet.xyz/.
- **Branch Status:** `main` clean and synchronized with `origin/main`.
- **Zero Costs:** Static build on GitHub Pages, direct CORS/JSONP APIs, local IndexedDB caching.

---

## 4. Completed Phases & Feature Inventory (Tickets T01–T21)

### Foundation & UI Shell
- **T01 — Layout Grid & Type Tokens:** Scoped `.noir-song-grid`, strict typographic tokens (`--noir-type-display`, `title`, `body`, `meta`, `label`).
- **T02 — Toast System & Inline Volume:** Replaced floating volume popups with inline bar control; global `noirToast()` system with undo actions.
- **T03 — Shared Song Menu:** Unified right-click and 3-dot context menu for tracks across all views (Add to queue, Play next, Favorite, Go to artist, Add to playlist).
- **T08 — Brand Mark & Empty States:** Hand-made spray asterisk mark (`NoirMark`) in sidebar, loading states, and Library empty states.

### Playback & Now Playing Canvas
- **T05 / T05b — Queue Craft & Autoplay:** Next Up queue with empty state actions (Add 10 / Shuffle all + Undo), "Queue ends soon" toast, and radio autoplay continuation.
- **T06 — Dither Artwork Renderer:** `NoirDitherCover` generating deterministic grain covers across 9 curated color worlds (ember, moss, bone, neon, violet, mist, dune, rust, midnight).
- **T14 (A+B+C) — Now Playing Experience:** Shared-element cover flight between compact bar and fullscreen canvas, synchronized lyrics (`L`), Soft Shuffle (blur/opacity ease-in), and sliding Next Up queue rail.
- **Audio Core:** Constant-power $\sin/\cos$ crossfading, gapless preloading, and dual-engine stream orchestration.

### Personalization, Graph & Discovery
- **T04 — Playlists:** Full playlist management with drag-to-reorder, side-panel track searching, and fly-to-list animations.
- **T09 — Listening Engine:** Event logging for track plays, skips, and completions feeding local taste profile.
- **T10 — Music Graph Service:** Hybrid client-side metadata layer combining Deezer (discographies, tracks, portraits, radio) and Last.fm (similarity graph, tags, biographies).
- **T11 — Radio & Infinite Autoplay:** Dynamic radio generation from any track or artist seed.
- **T12 — Daily Mixes & Curated Home:** Personalized mixes generated from listening history, "Jump back in", and recent shelves.
- **T17 — Your Sound & Replay:** Listening statistics (minutes listened, top artists, listening clock, streaks) and shareable Replay visual cards.
- **T21 — Cold Start:** "Pick 3 artists" onboarding to seed taste profiles for new users without history.

### Artist Profiles (T19)
- **Hero Header:** Clean minimal typographic header (Artist Name, Country/Genre, Play/Shuffle) without artificial listener counters or tag pill clutter.
- **Latest Release Spotlight:** Chronologically accurate spotlight card highlighting the artist's latest single, EP, or album side-by-side with Popular Top 5 tracks.
- **Discography Shelf:** Filterable releases (`All`, `Albums`, `Singles & EPs`) sorted chronologically from newest to oldest.
- **Fans Also Like:** Circular avatar recommendation shelf with instant profile prefetching.
- **About [Artist] Card:** Real biographical story from Last.fm and Wikipedia with inline "Read more" toggle and discography facts; automatically hidden if no bio is available.

---

## 5. Architecture & Key Files Directory

```text
src/
├── app/
│   ├── components/
│   │   ├── shell/noir/               # Core NOIR UI components
│   │   │   ├── NoirArtistView.tsx    # Artist profile view
│   │   │   ├── NoirNowPlayingView.tsx# Fullscreen canvas player
│   │   │   ├── NoirHomeShelf.tsx     # Horizontal scroll shelf
│   │   │   ├── NoirRankedSongRow.tsx # Song row component
│   │   │   ├── NoirDitherCover.tsx   # Grain cover generator
│   │   │   ├── NoirSearchPalette.tsx # ⌘K search modal
│   │   │   ├── NoirToast.tsx         # Global toast system
│   │   │   └── NoirMark.tsx          # Asterisk brand mark
│   │   ├── LandingPage.tsx           # Shell container & view router
│   │   └── NoirSongMenu.tsx          # Shared context menu
│   ├── services/
│   │   ├── musicGraph/               # Deezer, Last.fm & Wikipedia graph
│   │   │   ├── deezer.ts             # Deezer REST & JSONP client
│   │   │   ├── lastfm.ts             # Last.fm audioscrobbler client
│   │   │   ├── wikipedia.ts          # Wikipedia REST summary client
│   │   │   └── cache.ts              # Local IndexedDB graph cache
│   │   └── artistIdentity/           # Disambiguation & portrait resolution
│   ├── hooks/
│   │   ├── usePlaybackCore.ts        # Audio player state machine
│   │   ├── useSearchLogic.ts         # Search, history & artist profiles
│   │   ├── useListeningEvents.ts     # Listening history & stats
│   │   └── useLyricsSync.ts          # Real-time lyrics parser
│   ├── constants/
│   │   └── strings.ts                # Centralized UI text strings
│   ├── utils/
│   │   ├── ditherCover.ts            # Dither shaders & color palettes
│   │   └── motionPresets.ts          # Spring & transition tokens
│   └── styles/
│       └── noir-shell.css            # NOIR CSS design tokens & layouts
├── design/
│   ├── HANDOFF.md                    # Core agent handoff & rules
│   ├── 05-visual-language.md         # Visual rules & surface tokens
│   ├── 08-craft.md                   # Craftsmanship checklist
│   └── tickets/                      # Feature specifications & history
└── README.md                         # Public GitHub presentation
```

---

## 6. Active Backlog & Next Roadmap Items

*Done since last update:* T22 quiet tooltips. Graphics theme (Heat / Grain, `utils/graphicsTheme.ts`) on Now Playing, History hero and Home hero. Playback fix: picking a song near the end of the current one no longer skips it (manual-load guard in `usePlaybackCore.ts`; found by reading code, not reproduced with real audio). Toast and queue-end card centre on the content area (`--noir-sidebar-w`); compact bar side columns equal. Favorites has "Add songs" (`NoirAddSongsPanel`, shared with playlists). Offline / search error / artist error states via `NoirStateNotice` + `useOnline`; `executeSearchAPI(q, n, { throwOnFail })` separates a failed search from "No results". Six-states audit: `design/STATES_AUDIT.md`.

**Next (pick up here):**
1. Not verified by hand: pressing a mix card itself (its play button is verified), Discover's "New from artists like yours" (empty for the current taste), Retry on the mixes error.
2. Font licence: `src/styles/` holds `CerottaPersonalUseOnly-*.otf` and `KaobePersonalUseOnly-*.otf`. `Cerotta` is defined but not used anywhere; `Kaobe` is used for two headings in `PlaylistDetailsView.tsx`. "Personal use only" fonts must not ship in a public release: replace Kaobe (or buy a licence) and delete both files before any release.
3. Small leftovers: unused *type* exports were left alone on purpose; `handleAppendRadio` and `hadCachedVideoId` in `App.tsx` are unused; old localStorage / sessionStorage keys from removed features are no longer read (`noir_zen_mode`, `noir_tour_completed`, `noir_intro_seen`, ...); `electron/` is kept on purpose for a later desktop build (not used or tested yet).
4. Banners (mix-as-category look) are saved for a future browse page; revisit Discover's deliberately quiet Genres list first. Pills are saved for filters/queue. Source of both: commit `227eaa8d`.

Done this round: playback session (a paused song comes back paused and cued at its saved position, via `restore` on `PlaybackEngine` / `usePlaybackCore` and YouTube `cueVideoById`; a song that was playing comes back at its position but paused, because the browser blocks autostart without a click; the session is now written on a 2 s tick while playing, before it was only written when the position stood still, so a reload mid-song returned to where the song started or was last paused), dead code (27 unused exported functions/constants deleted, `export` dropped on 33 that are only used in their own file, 99 unused CSS rules + 4 keyframes + 3 empty media blocks removed from `noir-shell.css` / `theme.css`; found with `/tmp` scripts that scan for names no source file mentions, so a class built from a string prefix is kept), cleanup (44 unused props removed from `LandingPage` and its call in `App.tsx`; 51 unused packages uninstalled, 171 with dependencies, only `@radix-ui/react-slider` kept; `scratch/`, `default_shadcn_theme.css` and the old Elva docs deleted; `LYRICS_ENHANCEMENT_PLAN.md` moved to `design/`), fixed the reload bug where a restored song jumped to the next one at 0:00 (YouTube players answer `undefined` for `getCurrentTime`/`getDuration` before the video has loaded; `checkCrossfade` only guarded `dur <= 0`, which is false for `undefined`, so a crossfade started at once; found with a trace kept in sessionStorage across the reload, 0 of 5 reloads fail afterwards, was about 3 of 7), playback engine moved out of the old player: `components/PlaybackEngine.tsx` (audio A/B, YouTube containers, `usePlaybackCore`, `usePlayStats`, shell state callback) replaces the hidden `MusicPlayer`; deleted `MusicPlayer`, `Queue` + `queue/`, `LyricsPanel`, `CustomLyricsModal`, `PlayerControls`, `musicplayer/`, `NoirEmptyState`, `SearchLoadingState`, `artistUi`, `utils/toast` (about 4,000 lines; the hidden duplicate `useLyrics` is gone too), settings state removed (texture/background/zen/tilt/visualizer/nav mode and position, the unreachable `SettingsModal`, scroll-mode code in `App.tsx`; the paper grain overlay stays as a fixed layer; `useScrollTracking` now only takes `activeTab`), fixed a real bug found on the way (Discover "Because you play" cards threw because `onSelectSong` was never destructured; now verified by playing one), onboarding tour removed (it could no longer be started and pointed at DOM ids from the old UI: `OnboardingTour.tsx`, handlers, intro state, `strings.tour`, "Reset onboarding" in Settings), alignment audit (measured at 1024 px: every page has title/headings at L280 and right edge R992; Artist, Home and Discover headings had a 4 px `px-1` inset against their covers and cards, removed, and `.noir-section-meta` no longer has a 4 px right margin; Stats and the search palette were already aligned), narrow windows (Add songs panel stacks under 1180 px; Home mix fan becomes a shelf when its row is under 700 px; checked at 1024, 880, 600), Home relayout (hero alone, Jump back in first, order follows the hour, section data lines, release shelf with real covers, Because you play, mix fan), Home vs Discover rule (see below), Discover duplicate removed, `elva` renamed to `noir` in files, CSS, events and storage (migrated), dead code deleted.

**Later (ideas worth keeping, not scheduled):**
- **Graphics theme everywhere:** Stats week hero and Artist hero still only have the Heat look; give them a Grain version so the Settings choice means something on every screen.
- **Taste portrait:** your taste as one halftone/heat image (genres + top artists shape a field in their colours), possibly on Your sound. Data-made graphic, NOIR's signature.
- **Sleep timer:** only if it can be done without adding UI noise (e.g. a quiet entry in the player menu, no permanent control).
- **Rediscover hero** (History): a song played often but not heard for 3+ weeks. Dropped for now: too little history for anyone to see it.
- Keyboard navigation across Home shelves; touch gestures on tablet.

---

## 7. Working Rules for Agents

1. **Commit First, Then Build:** Run git commit before reporting, followed by `npm run build` verification.
2. **Never Stage `src/` Directly:** Two original untracked assets exist in `src/` (`Plate Wave Recreation Image.jpeg`, `abstract cloud like form.jpeg`). Always stage explicit paths (`git add src/app/... src/styles/... design/...`).
3. **No UI Copy Outside `strings.ts`:** All user-facing strings must reside in `src/app/constants/strings.ts`.
4. **Motion Tokens:** Strictly use `MOTION.tap`, `panel`, or `scene` from `motionPresets.ts` wrapped with `withReducedMotion()`.
5. **No Visual Noise / AI Slop:** Follow Opus's visual language: clean black surfaces, white-alpha tints, grain/dither materials only where they represent data. No arbitrary pill badges, fake listener counts, or decorative gradients.
6. **Debugging across a reload:** `console` is cleared by a reload, so write a trace to `sessionStorage` (survives it) and read it afterwards; that is how the restore bug was found.
7. **Check names after refactors:** `npm run build` does not type-check and there is no `tsconfig`. After removing props or state run `mkdir -p /tmp/tsc && (cd /tmp/tsc && npm i typescript@5) && /tmp/tsc/node_modules/.bin/tsc --noEmit --jsx react-jsx --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --strict false src/app/App.tsx | grep -E "TS2304|TS2552"`; anything printed is an undefined name that would crash at runtime. Other error codes are noise from the missing config.
8. **Dead code scans:** an exported name or CSS class is dead only if no source file mentions it, including as a prefix of a template string (`noir-foo-${x}`). A class inside `:not()` / `:is()` never makes a rule dead. Re-run both scans after big deletions, because deleting one thing orphans the next.
9. **Communication:** Communicate with the user in Danish; keep all in-app UI copy in English.

**Home vs Discover (decided 2026-10-02):** Home = built from you (your history, your artists: Jump back in, your artists, latest from your artists, your mixes, library, plus one "Because you play X" row picked daily). Discover = built from the world (charts, genres, artists like yours, new from artists like yours, the other "Because you play" rows). Familiarity does not decide it; what the content is built from does. Discover no longer repeats "New from artists you play". `loadBecauseRows` / `dailyBecauseIndex` in `discoverFeed.ts`; `NoirTrackCard` is the shared song card. Mixes and Discover genres merge tags that share a symbol ("danish" + "denmark"); daily mix cache key bumped to v5.

Home mixes are a refined fan (`.noir-home-fan`, `.noir-home-fan-card`): a loose arc at rest, cards dealt in on mount (0.9 s, 80 ms stagger), and on hover the face of the card rises while neighbours step aside (CSS only, positions from `--i` / `--n`). The card itself never moves under the pointer, only `.noir-home-fan-face` inside it; moving the hit target made hover flicker in a loop (fixed, 0 flips measured with the pointer in a corner). Names only, no artist lines (unreadable at that size). Chosen over three other layouts tried 2026-10-02 (posters, banners, pills; source in commit `227eaa8d`, `NoirMixVariants.tsx`). Banners read as genre categories, so keep them for a future Discover/browse page; Discover's Genres list is deliberately quiet (see the comment in `NoirDiscoverView.tsx`), so revisit that rule first. Pills are saved for filters or the queue.
