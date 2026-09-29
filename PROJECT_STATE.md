# PROJECT_STATE — NOIR

*Last updated: 2026-09-29*
*Repository:* `S1lence1q/noir` · *Live Production:* https://noir.arkivet.xyz/

---

## 1. Executive Summary

**NOIR** is a browser-only, zero-cost, local-first music application. The project is designed around a Scandinavian editorial aesthetic: clean black surfaces, strict typographic hierarchy, and deterministic dithered grain graphics generated dynamically from music identities.

The application has completed its core architectural roadmap (Phases 1 through 15, tickets T01 through T21) and is actively running on GitHub Pages with automated builds, local IndexedDB caching, and hybrid metadata orchestration (Deezer, Last.fm, Wikipedia, Apple Music Charts).

---

## 2. Production & Build Health

- **Build Pipeline:** `npm run build` (`prefetch:charts` + `vite build`) completes cleanly in ~1.5 seconds.
- **Hosting / Deploy:** Automated via `.github/workflows/deploy.yml` on push to `main` → https://noir.arkivet.xyz/.
- **Branch Status:** `main` is active, clean, and in sync with `origin/main`.
- **Runtime Costs:** $0.00 / month (client-side browser app, CORS/JSONP direct API calls, pre-fetched static charts, local browser storage).

---

## 3. Implemented Capabilities & Completed Tickets

### Foundation & UI Shell
- **T01 — Grid, Typography & Accent:** Scoped `.noir-song-grid`, strict typographic tokens (`--noir-type-display`, `title`, `body`, `meta`, `label`), and subtle white-alpha surface layers.
- **T02 — Toast System & Inline Volume:** Replaced floating volume popups with inline bar control; global `noirToast()` system with undo actions.
- **T03 — Shared Song Menu:** Unified right-click and 3-dot context menu for tracks across all views (Add to queue, Play next, Favorite, Go to artist, Add to playlist).
- **T08 — Brand Mark & Empty States:** Asterisk mark (`NoirMark`) in sidebar, loading states, and Library empty states.

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
- **Editorial About Card:** Genuine artist story and biography fetched from Last.fm and Wikipedia with inline "Read more" toggle and discography facts; automatically hidden if no bio is available.

---

## 4. Architecture & Key Files Directory

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

## 5. Active Backlog & Next Roadmap Items

1. **T22 — Quiet Tooltips (M):**
   - Implement lightweight, non-intrusive tooltip component (`--noir-elevated`, portal, ~400ms delay, subtle fade).
   - Add tooltips to search inputs, key action buttons, and obscure controls without cluttering the UI with permanent helper copy.
2. **Surface Audits & Micro-Interactions:**
   - Review keyboard navigation across Home shelves.
   - Refine touch gestures for mobile/tablet responsive viewports.

---

## 6. Development & Contribution Rules

1. **Commit First, Then Build:** User requires git commits before reporting, followed by `npm run build` verification.
2. **Never Stage `src/` Directly:** Two original untracked assets exist in `src/` (`Plate Wave Recreation Image.jpeg`, `abstract cloud like form.jpeg`). Always stage explicit paths (`git add src/app/... src/styles/... design/...`).
3. **No UI Copy Outside `strings.ts`:** All user-facing strings must reside in `src/app/constants/strings.ts`.
4. **Motion Tokens:** Strictly use `MOTION.tap`, `panel`, or `scene` from `motionPresets.ts` wrapped with `withReducedMotion()`.
5. **No AI-Slop / Visual Clutter:** Respect Scandinavian editorial restraint. No arbitrary pill badges, fake metrics, or ungrounded color accents.
6. **Language:** Communicate with the user in Danish; keep all in-app UI copy in English.
