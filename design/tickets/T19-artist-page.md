# T19 — Artist page: Fans also like + clean sections
**Phase:** 14 · **Depends on:** T10 (`musicGraph`), decisions/004 · **Golden sample:** `NoirHomeShelf`, `NoirRankedSongRow` · **Size:** M

## Goal
The artist page feels like a curated profile rather than a flat file list. Adds a responsive "Fans also like" shelf with circular artist avatars, seamless artist-to-artist navigation, and clean sectioning.

## Current
`NoirArtistView.tsx` renders only the dithered hero banner and a single flat "Popular" song list with a "Show all" toggle. There is no recommendation shelf, leaving the page abrupt and disconnected from the broader music graph.

## Spec

### 1. "Fans also like" shelf
- Rendered below the tracks section.
- Fetches related artists via `getSimilarArtists(artist.name, 10, artist.deezerId)`.
- If fewer than 3 artists are available, the shelf remains hidden (per `06-product-vision.md` rule: shelves with < 3 items hide).
- Uses `NoirHomeShelf` to provide horizontal scroll that never traps vertical page scrolling.
- Circular artist card (`.noir-home-artist`) with:
  - Real artist portrait when available.
  - Deterministic `NoirDitherCover` (`radius={999}`) fallback using the artist's color world.
  - Hover/focus triggers `prefetchArtistProfile(sim.name)`.
  - Clicking invokes `onSelectArtist(artist)`.

### 2. Artist-to-artist navigation
- `LandingPage.tsx` wires `onSelectArtist={handleViewArtistProfile}` into `NoirArtistView`.
- Switching artists resets list expansion (`showAll`) and seamlessly loads the next profile.

### 3. Strings & Tokens
- Heading copy: `strings.artist.fansAlsoLike` in `src/app/constants/strings.ts`.
- Uses `--noir-*` typography and color tokens; no arbitrary styles.

## Files
- `design/tickets/T19-artist-page.md` — this ticket
- `design/tickets/README.md` — register ticket status
- `src/app/constants/strings.ts` — add `fansAlsoLike` string
- `src/app/services/musicGraph/index.ts` — pass `deezerId` to `getSimilarArtists`
- `src/app/services/musicGraph/deezer.ts` — support `deezerId` in `getDeezerRelatedArtists`
- `src/app/components/shell/noir/NoirArtistView.tsx` — similar artists state, shelf rendering, `onSelectArtist`
- `src/app/components/LandingPage.tsx` — pass `onSelectArtist` to `NoirArtistView`

## Acceptance
- [x] Artist page loads "Fans also like" shelf with similar artists when available (>= 3).
- [x] Card uses real photo or circular dither avatar fallback.
- [x] Hover/focus pre-fetches the candidate artist's profile.
- [x] Clicking a similar artist navigates directly to their profile overlay.
- [x] Switching artists resets `showAll` state.
- [x] If < 3 similar artists exist, the shelf cleanly hides itself without blank gaps.
- [x] All copy in `strings.ts`.
- [x] `npm run build` succeeds without errors.

## Don't
- Don't inject editorial styling, giant badges, or arbitrary colors.
- Don't break vertical scrolling inside the detail overlay.
- Don't block opening the artist profile on similar artists loading (load asynchronously).

## Craft checklist
- [x] All states designed and built: empty (first / returning), loading, error, (offline if network)
- [x] All copy from this doc, placed in `strings.ts`
- [x] Motion uses `tap` / `panel` / `scene` tokens only; reduced motion works
- [x] Reversible actions have a toast with Undo
- [x] Hover, focus, and active states exist for every interactive element
- [x] Keyboard reachable; right-click opens the shared song menu on song rows
- [x] No new graphics outside the slots in `05-visual-language.md`
- [x] Screenshot attached for review

## Screenshots to take
- Artist page with "Fans also like" shelf rendered under the songs.
- Similar artist card hover state.
