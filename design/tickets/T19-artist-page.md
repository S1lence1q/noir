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
- Strictly evaluates the true latest release chronologically by `releaseDate` across all formats (singles, EPs, and albums), avoiding cases where an older album was shown over newer singles.
- Latest release card highlights album/single cover with dither fallback, badge (`Latest single` / `Latest album` / `Latest EP` / `Latest release`), title, year, and a hover play button overlay.

### 3. Discography with Filter Tabs
- Fetches artist albums, EPs, and singles via `getArtistAlbums(artist.name, artist.deezerId)`.
- All releases are sorted strictly chronologically (`releaseDate` descending), so "All" shows the newest releases first across all types.
- Features filter chips (`All` · `Albums` · `Singles & EPs`), shown when the artist has both albums and singles.
- Rendered in a dedicated horizontal shelf (`NoirHomeShelf`).
- Hover play button plays the album immediately (`onPlayAlbum`), clicking opens the album as a playlist overlay (`onSelectAlbum`).

### 4. About [Artist] Editorial Card (Apple Music style)
- Renders at the bottom of the artist profile below "Fans also like".
- Sourced from Last.fm and Wikipedia summary (`getArtistBio`), providing real biographical context (e.g. KESI, Smøgmænd, Artigeardit, Frank Ocean, Daft Punk).
- Features clean, readable typography (`text-[14px] leading-relaxed text-white/80`) with expandable "Read more" / "Read less" toggle for long text.
- Includes concrete metadata: country of origin and calculated discography summary (e.g. `Denmark · 2 albums · 8 singles & EPs`).
- Displays quiet source attribution (`Source: Last.fm` / `Source: Wikipedia`).
- Strictly conditional: if no verified bio exists for an artist, the section remains hidden, preventing empty dummy cards.
- Pure editorial typography: ZERO pill badges or artificial tags.

### 5. Hero metadata: Clean Minimalist Banner (Apple Music / Tidal style)
- Displays artist label, name, and non-redundant metadata: genre (from Deezer) and formatted country of origin (e.g. `Hip-Hop · Denmark` or `Denmark`).
- Completely eliminates redundant / tautological strings (e.g. `Danish Rapper · Denmark`) and removes all pill badges.
- Follows Apple Music / Tidal approach: avoids platform-skewed listener counters and keeps the banner typography pristine and uncluttered.

### 6. Instant load speed (<300 ms cold, 0 ms warm)
- `resolveArtistIdentity` uses `skipChannelResolve: true` on profile open to eliminate the 2.8s channel timeout.
- `loadProfileForIdentity` paints `popular` tracks immediately in ~200ms and writes to cache immediately.
- Background Piped discography fetching is non-blocking and merges into the list without shifting rows.

### 7. Strings & Tokens
- Copy in `strings.ts` (`latestRelease`, `latestSingle`, `latestAlbum`, `latestEp`, `filterAll`, `filterAlbums`, `filterSingles`, `aboutArtist`, `readMore`, `readLess`, `sourcePrefix`, `sourceLastFm`, `sourceWikipedia`, `discographySummary`, `fansAlsoLike`, `discography`, `album`, `single`, `ep`, `playAlbum`).
- Uses `--noir-*` typography and color tokens; no arbitrary styles.

## Files
- `design/tickets/T19-artist-page.md` — this ticket
- `design/tickets/README.md` — register ticket status
- `src/app/constants/strings.ts` — add artist strings
- `src/styles/noir-shell.css` — latest release card, filter chips, about card
- `src/app/services/musicGraph/index.ts` — export `GraphAlbum`, `getArtistAlbums`, `getArtistBio`, update `getSimilarArtists`
- `src/app/services/musicGraph/lastfm.ts` — add `getLastFmArtistBio`
- `src/app/services/musicGraph/wikipedia.ts` — add `getWikipediaArtistSummary`
- `src/app/services/musicGraph/deezer.ts` — add `getDeezerArtistAlbums`, update `getDeezerRelatedArtists`
- `src/app/services/artistIdentity/types.ts` & `resolveArtist.ts` — forward `country`, `tags`
- `src/app/types.ts` — verified artist definition
- `src/app/hooks/useSearchLogic.ts` — instant popular paint, immediate cache, non-blocking discography, shortcut artists
- `src/app/components/shell/noir/NoirArtistView.tsx` — 2-column layout, discography filter, Fans also like, About card, clean hero banner
- `src/app/components/LandingPage.tsx` — wire `onSelectArtist`, `onPlayAlbum`, `onSelectAlbum`

## Acceptance
- [x] Artist page loads 2-column layout with Latest Release spotlight card and Popular tracks side by side on desktop.
- [x] Discography has filter tabs (`All`, `Albums`, `Singles & EPs`) when multiple release formats exist.
- [x] About [Artist] section renders editorial biography from Last.fm / Wikipedia with expandable Read More toggle, origin & discography statistics.
- [x] About [Artist] section automatically hides when no biographical info is available.
- [x] Artist page loads "Fans also like" shelf with similar artists when available (>= 3).
- [x] Playing or clicking an album plays the tracklist or opens the collection overlay.
- [x] Hero displays a clean, minimalist header (Artist, Name, non-redundant Origin/Genre, Play/Shuffle) without tag pill clutter or tautologies.
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
