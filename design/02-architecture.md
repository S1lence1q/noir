# Application Architecture

Working architectural model for the UI redesign. This describes **intent and structure**, not final implementation details. Details will be refined as we build and validate screens.

## High-level model

```
┌─────────────────────────────────────────────────────┐
│  App Shell (persistent)                             │
│  ┌──────────┬────────────────────────────────────┐  │
│  │          │                                    │  │
│  │ Sidebar  │  Main Content                      │  │
│  │          │  (Home / Discover / Hub / …)       │  │
│  │          │                                    │  │
│  └──────────┴────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Compact Player (when track is active)         │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

              ↓ expand (target — Phase 1)

Same shell. Canvas becomes now-playing. Do not cover the window.

Today (legacy): `ready` mounts MusicPlayer over the entire app. See [04-north-star.md](./04-north-star.md).
```

See [decisions/000-shell-vs-player.md](./decisions/000-shell-vs-player.md) for the rationale behind shell-first as our current hypothesis.

## App shell

The shell is the foundation of Elva — not the fullscreen player.

### Zones

| Zone | Role |
|------|------|
| **Sidebar** | Persistent navigation, grouped sections, wayfinding |
| **Main content** | Page-specific content (search, discover, library, details) |
| **Compact player** | Persistent playback chrome when a track is active |
| **Overlays** | Settings, shortcuts, detail views, modals |

### Shell characteristics

- Solid dark surfaces (see [01-principles.md](./01-principles.md))
- Stable frame that does not change between pages
- Level 1 UI lives here (nav, lists, controls)
- Level 2 atmosphere can sit behind content
- Level 3 graphics appear in content areas, not in chrome

## Navigation

Current app uses tab-based state (`search`, `discover`, `myhub`) without URL routing. The redesign will likely move toward sidebar navigation with clear primary destinations.

Likely destinations (subject to validation):

- Home / Search
- Discover
- Library / Hub (favorites, playlists, history)
- Settings (may remain modal/overlay initially)

Exact grouping and labels are open until the shell prototype is built.

## Player modes

### Compact player (shell chrome)

Visible when a track is active and the user is browsing the app.

**Likely V1 controls:**

- Artwork thumbnail
- Title and artist
- Play / pause, previous, next
- Thin progress indicator
- Expand affordance

**Probably not in V1:**

- Full lyrics
- Crossfade controls
- Volume (settings or existing HUD is sufficient)

Should feel like application chrome — solid, integrated — not a floating glass pill.

### Expanded player (target)

Now-playing **in the canvas**. Sidebar and compact bar stay. Same app, deeper view.

The existing `MusicPlayer` is still a full-window overlay (`appState === 'ready'`). That is the next structural change, not a visual restyle of glass/WebGL first.

### Mode switching

- **Play a track** → start in shell with compact player (hypothesis; today auto-expands to fullscreen)
- **Expand** → transition to existing fullscreen player
- **Collapse** → return to shell with playback continuing

The codebase already has partial support for this (`landing` / `ready` states, hidden mounted player, `LandingMiniPlayerPill`). The redesign formalizes shell as primary and fullscreen as optional depth.

## Content pages

Pages compose inside the main content zone. Each page decides how much atmosphere (Level 2) and expression (Level 3) it uses.

| Page | Primary role | Graphics ambition |
|------|--------------|-------------------|
| Home / Search | Find and play music | Moderate — good candidate for one editorial hero |
| Discover | Browse charts and recommendations | Higher — good candidate for expressive graphics |
| Hub / Library | Favorites, playlists, history | Lower — functional, clear lists |
| Detail views | Artist, playlist | Moderate — artwork-driven atmosphere |

Specific layouts are not specified here. They emerge from building each page against the shell.

## Relationship to existing code

### Keep untouched (logic)

Playback engine, crossfade, lyrics sync, queue, search API, Discover feeds, localStorage, artwork color extraction, ranking (functional as-is).

### Rebuild (presentation)

Shell layout, navigation, page layouts, surfaces, components, visual system.

### Integrate later

Fullscreen player styling and transitions into the new shell aesthetic. Not in the first build phase.

## Background and atmosphere

The app currently uses a global `FluidBackground`. In the new architecture:

- Atmosphere (Level 2) likely lives in the content/backdrop layer
- Shell chrome should remain solid regardless of background
- One global atmospheric layer is preferable to per-component blur stacks (performance and clarity)

Exact treatment TBD during shell prototype.

## Build order

1. **Shell skeleton** — sidebar + content + bottom player zone
2. **Surface system** — solid dark elevations on shell chrome
3. **Player mode switch** — compact bar ↔ existing fullscreen player
4. **One expressive page** — prove graphics hierarchy on a single screen
5. **One functional page** — prove lists and hierarchy without decoration
6. **Remaining pages** — migrate incrementally

Do not attempt all pages or a complete design system before the shell is validated.

## Open questions

- Sidebar width and collapse behavior
- Whether queue opens as side panel or overlay in shell mode
- Default behavior on first play (shell vs auto-expand)
- How detail views (artist, playlist) relate to shell vs overlay
- Mobile / responsive shell (desktop-first for now)
- Migration path for existing glass/theme tokens

These resolve through prototyping, not documentation.
