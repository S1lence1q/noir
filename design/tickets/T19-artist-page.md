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

### 2. 2-column Layout: Latest Release & Popular Tracks
- On desktop (`lg:grid-cols-[280px_1fr]`), renders a featured **Latest Release** spotlight card side by side with the **Popular** top 5 tracks.
- On mobile/tablet, Popular tracks appear first for instant 1-tap playback, with Latest Release positioned below.
- Latest release card highlights album/single cover with dither fallback, badge (`Latest single` / `Latest album` / `Latest release`), title, year, and a hover play button overlay.

### 3. Discography with Filter Tabs
- Fetches artist albums, EPs, and singles via `getArtistAlbums(artist.name, artist.deezerId)`.
- Features filter chips (`All` · `Albums` · `Singles & EPs`), shown when the artist has both albums and singles.
- Rendered in a dedicated horizontal shelf (`NoirHomeShelf`).
- Hover play button plays the album immediately (`onPlayAlbum`), clicking opens the album as a playlist overlay (`onSelectAlbum`).

### 4. About [Artist] Card
- Rich card at the bottom of the artist profile with dithered portrait backdrop masked with a soft radial fade.
- Highlights formatted monthly listeners (`910 listeners`), disambiguation, formatted country of origin (e.g. `Denmark`), and full genre tags.

### 5. Hero metadata: Listeners count & Genre tags
- Displays formatted monthly listeners in the hero subheader (e.g. `910 listeners`).
- Displays up to 3 discrete genre tags in subtle rounded chips matching the hero color world.

### 6. Instant load speed (<300 ms cold, 0 ms warm)
- `resolveArtistIdentity` uses `skipChannelResolve: true` on profile open to eliminate the 2.8s channel timeout.
- `loadProfileForIdentity` paints `popular` tracks immediately in ~200ms and writes to cache immediately.
- Background Piped discography fetching is non-blocking and merges into the list without shifting rows.

### 7. Strings & Tokens
- Copy in `strings.ts` (`latestRelease`, `latestSingle`, `latestAlbum`, `latestEp`, `filterAll`, `filterAlbums`, `filterSingles`, `about`, `aboutArtist`, `monthlyListeners`, `fansAlsoLike`, `discography`, `album`, `single`, `ep`, `playAlbum`, `listenersCount`).
- Uses `--noir-*` typography and color tokens; no arbitrary styles.

## Files
- `design/tickets/T19-artist-page.md` — this ticket
- `design/tickets/README.md` — register ticket status
- `src/app/constants/strings.ts` — add artist strings
- `src/styles/noir-shell.css` — latest release card, filter chips, about card
- `src/app/services/musicGraph/index.ts` — export `GraphAlbum`, `getArtistAlbums`, update `getSimilarArtists`
- `src/app/services/musicGraph/deezer.ts` — add `getDeezerArtistAlbums`, update `getDeezerRelatedArtists`
- `src/app/services/artistIdentity/types.ts` & `resolveArtist.ts` — support `listeners`
- `src/app/types.ts` — add `listeners` to `VerifiedArtist`
- `src/app/hooks/useSearchLogic.ts` — instant popular paint, immediate cache, non-blocking discography
- `src/app/components/shell/noir/NoirArtistView.tsx` — 2-column layout, discography filter, Fans also like, About card
- `src/app/components/LandingPage.tsx` — wire `onSelectArtist`, `onPlayAlbum`, `onSelectAlbum`

## Acceptance
- [x] Artist page loads 2-column layout with Latest Release spotlight card and Popular tracks side by side on desktop.
- [x] Discography has filter tabs (`All`, `Albums`, `Singles & EPs`) when multiple release formats exist.
- [x] About [Artist] section renders with dithered portrait backdrop, monthly listeners count, country origin, and genre tags.
- [x] Artist page loads "Fans also like" shelf with similar artists when available (>= 3).
- [x] Playing or clicking an album plays the tracklist or opens the collection overlay.
- [x] Hero displays listeners count and genre tags when available without redundant song count.
- [x] Profile paints in <300ms on cold load (popular-first) and 0ms on revisit.
- [x] Switching artists resets `showAll` and filter state, and scrolls to top.
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
