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
1. ~~Check Artist error and Home-search error~~ Done: Artist error verified with a forced failure (title, Retry, no layout jump). The Home inline search panel was unreachable (nothing but its own Retry called `handleSearch`; no input on Home), so it was removed from `NoirHomeView`. Search lives in the ⌘K palette. `SearchSection.tsx` and the old non-shell branch of `LandingPage.tsx` (plus its `shellMode` prop) were removed too. `BrandingHeader`, `ProfileHubView`, `ArtistProfileView` and `DetailOverlay` deleted. The six files in `src/app/components/profilehub/` deleted too (only `ProfileHubView` imported them).
2. Home mix failure is still silent (deliberately skipped; see STATES_AUDIT.md).
3. Narrow windows (~1024 px): Favorites/playlist pages get cramped when the Add songs panel is open (title truncates, row text collapses).
4. Alignment audit not yet measured on Search, Artist, Stats.

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
6. **Communication:** Communicate with the user in Danish; keep all in-app UI copy in English.
