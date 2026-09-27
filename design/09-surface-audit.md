# 09 — Surface audit

**Status:** 2026-09-27. Based on screenshots in `design/audit/Noir/`.
**Verdicts:** KEEP · POLISH · REDESIGN · KILL

## The big picture (applies everywhere)

1. **Every page is the same template: title + one long list.** Home, Discover, Library, chart, and artist are all rows. There are no modules, no shelves, and no cards. That's why the app feels like "a player that shows lists" rather than an experience. Spotify's Discover feels alive because of *varied module scale*: shelves, large cards, small cards, and rows mixed together.
2. **No shared layout grid.** Home and Library rows span the full width, with the heart floating ~700 px from the title. Chart and artist use a narrow centered column. Settings is a narrow left column. → One content grid is needed (max width, gutters, and column rules), used everywhere.
3. **Rows are empty in the middle.** Title on the left, heart far right, nothing in between. → Rows need columns (album / "played 2h ago" / duration) or should be narrower. Hover actions must be the same everywhere (the heart is always visible on Home but only on hover in Discover).
4. **Weak hierarchy.** Section headings ("Recently played", "Charts") have the same size and weight as row titles. Everything is bold white. → Headings, meta, and row titles need three clearly distinct levels.
5. **Accent color is incoherent.** Hearts are coral, the volume popup is pink, the progress bar is white. → One accent token (warm red/orange) with fixed uses: favorite, active, progress.
6. **Detail pages feel like modals.** Chart and artist use an X + centered title, with no back/forward. → They should be real pages in the canvas with back navigation.
7. **Artwork is the only visual.** When the artwork is bad (a t-shirt photo, the same Taylor Swift cover on both charts), the whole screen gets bad. → Generated covers and graphic slots (see the plan) must carry the screens where artwork is missing or repeated.

## Per surface

### Sidebar — POLISH
- KEEP: NOIR + the plate wave. It's the only graphic that works.
- "Quick access → Favorites" duplicates Library. Playlists have a generic icon and no cover.
- → Playlists show a small cover (generated). Currently playing collection gets a small wave indicator. Drag a song onto a playlist to add it. "+" next to the "Playlists" heading.

### Home — REDESIGN
- The hero is the last-played artwork, upscaled and cropped (the t-shirt image looks broken), and it repeats what is already playing.
- Then only "Recently played" as a list.
- → Personal shelves: "Jump back in" (small cards), "Your mixes" (large generated covers), "On repeat", "Because you played X", "Rediscover". The hero becomes a greeting + one genuinely useful action (resume / today's mix), with a graphic slot instead of stretched artwork.

### Discover — REDESIGN
- The plate wave is pasted on top of the chart #1 artwork in the hero. This is exactly the "just dropped in" feeling.
- Both chart cards use the same Taylor Swift artwork.
- → Discover as a feed of shelves: new releases from your artists, "Artists like…", charts as generated cards (DK and Global each get their own color world), tags/genres. The hero is either a generated cover or nothing.

### Chart page — POLISH
- The best template in the app. Clear header, readable list.
- → Generated cover instead of the artwork. Actions: Play, Shuffle, Save. Duration column. Sticky mini-header on scroll. Back instead of X.

### Library — REDESIGN
- Favorites/Playlists tabs duplicate the sidebar. It's a long list with no overview.
- → Library as an overview grid: Favorites (special card), playlists, artists you follow, local files. Filter chips at the top. Clicking opens a real detail page (same template as the chart page).

### Playlist page — REDESIGN (high priority)
- Tiny header ("fih · 2 tracks") inside the Library tab, with a back arrow inside a tab.
- "Delete" sits as text right next to "Play all". Dangerous and cheap-looking.
- → Same template as the chart page: generated cover, large title (click to rename), description, Play/Shuffle, "…" menu (Rename, Delete with undo). Drag to reorder. Empty playlist → "Let's find something for this playlist" + suggestions and a search field directly on the page.

### Create playlist — REDESIGN
- An inline field above a 2-column grid with a huge gap between the columns. "+ New" is far away in the corner. The empty playlist gets a grey icon.
- → Spotify pattern: "New playlist" immediately creates "Playlist #3", opens the page, and puts focus on the title. No form. Available from the sidebar "+", the song menu, and Cmd+N.

### Add to playlist — POLISH
- The submenu replaces the menu, with "SELECT PLAYLIST / Back". It works but is dry.
- Missing "New playlist" at the top, search once there are more than 6 playlists, and a checkmark on playlists the song is already in.
- → Confirmation toast: "Added to fih · Undo".

### Song menu — POLISH → shared component
- Only Play Next / Add to Queue / Add to Playlist.
- → One shared menu (also on right-click) everywhere: Play next, Add to queue, Start radio, Go to artist, Add to playlist, Favorite, (Remove from playlist / queue depending on context), Copy link. `SongRowOptions.tsx` becomes this component.

### Now Playing — POLISH
- Structure is right (artwork + Next up). But the artwork sits low and to the left, leaving a large empty area above it, and the red gradient glow at the top reads as the rejected "CSS glow".
- The Next up list has no actions (clear, shuffle, save as playlist).
- → Center the composition vertically. Replace the glow with the graphic slot (spray wave in the cover's colors, reacting to the music). Lyrics toggle. Next up header gets actions + a "Playing from: Top Hits Denmark" label.
- **Double UI (decided 2026-09-27):** while Now Playing is open, cover + title + artist + favorite were shown twice (large in canvas, small in the bar). Decision: **never both at once.** Opening Now Playing flies the bar's cover and title up into the large cover/title (shared element); the bar's left zone empties and the bar is controls only (transport, scrubber, queue, volume). Closing flies them back. The view earns its place with content the bar can't show: "Playing from…", similar artists, lyrics, spray wave. → Ticket T14.

### Empty queue — POLISH (golden sample)
- "What should play next? / Add a favorite to keep it going." + 3 tiny cards with truncated text.
- The copy is okay, but the presentation is weak and there is no "add all" action.
- → Spec in `08-craft.md`. This is the first golden sample.

### Search palette — KEEP / POLISH
- Works and looks right. The best interaction in the app.
- → Group results (Top result, Songs, Artists). Show keyboard hints at the bottom (↵ play, ⇧↵ play next, ⌘↵ queue). Empty state: recent searches.

### Settings — POLISH (expression)
- Clean, but a generic "SaaS card" look.
- "Volume" duplicates the bar. "Currently 🇩🇰 Denmark" under the dropdown is redundant. "Clear play history" is red with no confirmation.
- → Remove Volume. Crossfade with a visual curve + "Preview". Region without the extra line. Destructive actions → confirmation inline ("Clear 214 plays? Clear / Cancel"). About section with the asterisk mark, version, and shortcuts.

### Volume popup — KILL
- Duplicates the bar slider, in a different color (pink) from the bar (white). An Elva leftover.
- → The bar slider is the only control. While dragging, scrolling, or using the keyboard, the % is shown next to the slider. Mute on click on the icon. `GlobalVolumeHUD.tsx` is deleted. `showMiniHUD` merges into the shared toast.

### Artist page — REDESIGN (after identity is solved, see 004)
- A square photo, "18 tracks", and duplicates ("Shen Mao" and "Kundo - Shen Mao").
- → Hero with a dithered artist photo (graphic slot), Popular (5), Releases (cards), "Fans also like" (Last.fm similar), Start artist radio. Deduplication of titles.

### Compact player bar — KEEP / POLISH
- Solid. The collapse chevron far right is hard to find. The heart is only sometimes visible.
- → Heart always next to the title. Volume % inline (see above). Small "Playing from" label on hover.

## Order (redesign of existing surfaces)

1. Shared foundation: layout grid, type hierarchy, accent token, shared toast, shared song menu
2. Volume KILL + toast (small, fast win)
3. Playlists (create + page + add-to) → the chart page becomes the shared "collection" template
4. Empty queue (golden sample) + Now Playing polish
5. Settings polish
6. Library as an overview
7. Home + Discover redesign (requires the data engine + generated covers)
8. Artist page (requires identity + Last.fm)
