# The six states: audit

Read from the code (not every state was triggered in the browser). ✅ exists · ◐ partly · ✗ missing · – doesn't apply (local data only).

| Screen | Empty | Loading | Partial | Error | Offline | Done |
|---|---|---|---|---|---|---|
| **Home** | ✅ cold start (`NoirColdStart`), "no mixes" guard | ✅ mix skeletons, search spinner | ✅ mixes stream in via `loadDailyMixes(…, partial)` | ✅ mix failure: "Couldn’t build your mixes" + Retry | ✗ | ✅ |
| **Home › search** | ✅ "No results for …" + Back to Home | ✅ `SearchLoadingState` | ◐ artist card can appear before songs | ✗ a failed search looks like "No results" | ✗ | ✅ |
| **Discover** | ✅ taste-empty copy, cold-start charts | ✅ skeletons (charts, spotlight) | ✅ charts without personal feed, and vice versa | ✅ "Trending unavailable" + Retry (only when *nothing* loaded) | ✗ same message as any error, no hint it's the connection | ✅ |
| **Artist** | ✅ "No songs found for this artist yet." | ✅ exact-shape skeletons | ✅ page reveals latched; discography fills in later | ◐ toast only, page stays on skeleton/empty, no retry | ✗ | ✅ |
| **Search palette (⌘K)** | ✅ "No results for …" | ◐ inherits search loading | – | ✗ error = "No results" | ✗ | ✅ |
| **Library** | ✅ Favorites / playlists empty copy | – | – | – | – (local) | ✅ |

## Gaps, in the order I'd fix them

1. **Offline** is missing everywhere (`navigator.onLine` is never read). One shared quiet signal would cover most: a single "You're offline" line using the toast/empty-state voice, plus Retry on the screens that fetch.
2. **Error ≠ empty** in Search and the palette: a failed request currently reads "No results for …". Needs its own copy and a Retry.
3. **Artist error**: toast only; give the page a Discover-style "couldn't load" + Retry.
4. **Home mix failure**: silent. Either hide the shelf deliberately or show the same retry line.
5. Library has nothing to add (local data).

## Decision needed

Which of these to build? My recommendation: 1 + 2 + 3 (one shared `NoirStateNotice` used by Discover, Artist and Search, reusing the Discover layout), skip 4.
