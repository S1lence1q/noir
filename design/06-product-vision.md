# 06 — Product vision: from player to personal music experience

**Status:** Direction (2026-09-27).
**Constraints:** Personal project. Browser only (no Electron). Zero running costs. Local-first; everything stored in the browser.

## The goal

Today: a player that can play music and show a chart.
Target: an app that **knows you** — it continues when the queue ends, suggests artists like the ones you love, builds mixes for you, and shows you your listening. Like Spotify's Home/Discover: one coherent experience that *does something*.

## The engine (invisible, but everything depends on it)

```
Playback ─▶ Listening events (IndexedDB)
              │
              ▼
        Taste profile ◀── musicGraph (Last.fm + Deezer, cached)
              │                 │
              ▼                 ▼
        Recommendation engine ──▶ Home shelves · Mixes · Radio · Discover
              │
              ▼
        Stats / Replay
```

### 1. Listening events
Stored locally in IndexedDB (store `listeningEvents`). One event per play:

```ts
type ListeningEvent = {
  id: string;
  songKey: string;          // existing playbackSongKey
  title: string;
  artist: string;
  artistMbid?: string;      // from Last.fm/MusicBrainz when known
  startedAt: number;        // epoch ms
  listenedMs: number;
  durationMs?: number;
  outcome: 'completed' | 'skipped' | 'partial'; // skipped = <30 s
  source: 'search' | 'chart' | 'playlist' | 'favorites' | 'radio' | 'mix' | 'queue' | 'local';
  sourceId?: string;
};
```
Existing Recently played stays as is; events are an additional, richer log.

### 2. Taste profile (computed locally, cached, recomputed at most every 10 min)
- Top artists / tracks for 7 days, 30 days, all time (weight: completed = 1, partial = 0.5, skipped = −0.3).
- Top tags (from Last.fm `artist.getTopTags`).
- Listening times (hour-of-day histogram).
- "Dormant favorites": favorited but not played in 30+ days.

### 3. musicGraph service (`src/app/services/musicGraph/`)
One entry point. Every call cached in IndexedDB with TTL (similar: 7 days, tags: 30 days, releases: 1 day).

| Need | Source | Endpoint |
|------|--------|----------|
| Similar artists | Last.fm | `artist.getSimilar` |
| Similar tracks | Last.fm | `track.getSimilar` |
| Artist tags | Last.fm | `artist.getTopTags` |
| Artist top tracks | Last.fm / Deezer | `artist.getTopTracks` / `/artist/{id}/top` |
| Artist identity (fix wrong-artist bug) | Last.fm mbid + MusicBrainz | `artist.getInfo` |
| Related artists (backup) | Deezer | `/artist/{id}/related` |
| Artist radio | Deezer | `/artist/{id}/radio` |
| New releases | Deezer | `/artist/{id}/albums` (sorted by date) |
| Artist photos (for dither) | Deezer | `picture_xl` |
| Tag charts | Last.fm | `tag.getTopTracks` |

**Access (browser only):**
- Last.fm supports CORS → call directly. Free key in `.env` as `VITE_LASTFM_API_KEY`.
- Deezer does not → Vite dev proxy: `server.proxy['/deezer'] → https://api.deezer.com` in `vite.config.ts`. Replaces `corsproxy.io` for Deezer.
- Recommendations are **metadata only**. YouTube matching happens at play time via the existing chart playback path (`chartPlaybackUtils.ts`). Never resolve 50 songs up front.

## Features (priority order)

### F1. Radio + autoplay — biggest "it's alive" win
- "Start radio" on any song / artist (song menu, artist page, Now Playing).
- Radio = seed + Last.fm similar tracks + Deezer artist radio, shuffled, max 2 per artist in a row, excludes last 50 plays.
- **Autoplay:** when the queue has ≤ 1 song left, prompt once ("Queue ends soon. Keep playing similar songs?" Yes / No, remember choice in Settings). If on, append 10 radio tracks silently.

### F2. "Artists like X"
- Artist page shelf "Fans also like" (8 artists, dither avatars).
- Now Playing: small line "Similar: A, B, C" under the artist name (click → artist).

### F3. Personal Home (shelves)
In this order; a shelf hides itself if it has < 3 items:
1. Greeting + one action ("Continue *Mix 2*" / "Resume *Top Hits: Denmark*")
2. **Jump back in** — last 6 collections/artists played (small cards)
3. **Your mixes** — see F4 (large dither covers)
4. **On repeat** — top tracks last 14 days
5. **Because you played {artist}** — similar artists' top tracks (rotates artist daily)
6. **Rediscover** — dormant favorites
7. **New from artists you play** — Deezer releases, last 30 days

### F4. Mixes ("Daily mixes")
- 3–6 mixes. Cluster top-30 artists (30 days) by their top Last.fm tag.
- Each mix: 25 tracks = 40 % your plays from those artists + 60 % similar artists' top tracks. Regenerated once a day (seeded by date).
- Name: "{Tag} Mix" (e.g. "Danish Hip-Hop Mix"), subtitle "Kundo, Gilli, Lamin and more".
- Cover: `NoirDitherCover`, source = top artist photo, world from tag:
  - hip-hop / rap / trap → Ember
  - chill / lo-fi / ambient / electronic → Cobalt
  - indie / folk / acoustic / rock → Moss
  - pop / dance → Rose
  - metal / dark / industrial → Ink
  - fallback → hash of id

### F5. Stats + NOIR Replay
- Stats page (inside Library, tab "Your sound"): minutes this week/month, top 5 artists, top 5 tracks, top tags, listening clock (hour-of-day), streak (days in a row).
- **Monthly Replay**: 5 Bone cards shown one by one (story format), each with a dither image; "Save image" exports PNG. Created on the 1st of the month from last month's events.
- Human copy: "3 h 12 min this week", "Your #1: Kundo — 41 plays".

### F6. Discover as a feed (outward, what's new)
1. New releases from your artists
2. Artists you don't know yet (similar to your top 5, never played)
3. Charts (DK = Ember cover, Global = Cobalt cover)
4. Browse by tag (your top tags → Last.fm `tag.getTopTracks`)

### F7. Cold start
First run (no events): "Pick 3 artists you love" — search field + 12 suggestions from the DK chart. Seeds the taste profile so Home is never empty.

## Information architecture

| Tab | Is | Contains |
|-----|----|----------|
| **Home** | Yours, now | Greeting, shelves F3 |
| **Discover** | Outward, new | Feed F6 |
| **Library** | Saved | Overview grid (Favorites, playlists, artists, local files) + "Your sound" stats |
| **Settings** | Preferences | See audit |

Detail pages (collection, artist) open inside the canvas with back navigation.

## Out of scope
Accounts, cloud sync, servers, paid APIs, mobile layout, social features.
