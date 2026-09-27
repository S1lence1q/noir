# 08 — Craft: states, copy, motion, micro-interactions

**Status:** Standard (2026-09-27). Every ticket must pass the checklist at the bottom.

This is what makes the app feel "thought through". It is not polish for later; it ships with every feature.

## 1. Tone of voice

- English (as today). Short, dry, warm. No exclamation marks. No marketing words ("awesome", "amazing", "oops").
- Buttons are verbs: **Add 10**, **Start radio**, **Clear**, never "OK" / "Submit" / "Yes".
- Be specific when there's data: "Because you played Kundo 14 times this week".
- Errors say what happened + what you can do.
- All copy lives in `src/app/constants/strings.ts`. No inline strings in new code.

## 2. States (every screen and module designs all of these)

| State | Rule |
|-------|------|
| Empty — first time | Explain what goes here + one action that fills it |
| Empty — returning | Suggest from your own data first (favorites → recently played → radio) |
| Loading | Skeleton in the exact shape of the content. No spinners in lists. Asterisk spin only for full-canvas loading > 600 ms |
| Partial | Show what you have; hide shelves with < 3 items |
| Error | Human sentence + retry / alternative. Never raw error text |
| Offline | "You're offline. Local files still play." + local files shortcut |
| Done / success | Toast with undo where reversible |

### Copy for key states

**Queue empty (Now Playing, Next up)** — golden sample
- Title: `Nothing up next`
- Body: `Keep going with your favorites?`
- Row of 3 covers (first 3 favorites), full titles on hover.
- Buttons: **Add 10** (primary, appends 10 shuffled favorites) · **Shuffle all**
- If no favorites: body `Pick up where you left off?` with recently played; buttons **Add 10** · **Start radio**
- If nothing at all: body `Start a radio from this song.`; button **Start radio**
- Graphic: small vector asterisk (16 px) before the title.

**Queue about to end** (≤ 1 track left, 20 s before end, only if autoplay setting is "Ask")
- Toast-card above compact bar: `Queue ends soon. Keep playing similar songs?` **Keep playing** · **No thanks**. Checkbox `Don't ask again`.

**No search results**
- `Nothing for "{query}".` + `Try a shorter search or check the spelling.` + recent searches list.

**Track can't be played**
- Toast: `Couldn't find a playable version of {title}.` **Try another match** · **Skip**.

**Empty playlist**
- Title: `Let's fill this up`
- Body: `Search for songs, or add some we think fit.`
- Inline search field + "Suggested" list (similar to playlist title / first track once there is one).

**No favorites (Library)**
- `Songs you love end up here.` + `Tap the asterisk on any song.` (or heart until the swap).

**First run Home**
- `Pick 3 artists you love` — see F7 in `06-product-vision.md`.

**Clear play history (Settings)**
- Inline confirm replacing the row: `Clear 214 plays? This can't be undone.` **Clear** (danger) · **Cancel**.

## 3. Toasts (one system)

- One `NoirToast` system replaces `showMiniHUD` and the volume popup.
- Position: bottom center, 16 px above the compact bar. Max 1 visible; new replaces old.
- Anatomy: optional 32 px cover · text (1 line) · optional action (**Undo**).
- Duration: 3 s, or 5 s if it has Undo. Pauses on hover.
- Copy: `Added to fih` · `Removed from queue` · `Playlist deleted` · `Added 10 songs to queue`.
- Undo is required for: remove from queue, remove from playlist, delete playlist, unfavorite, clear queue.

## 4. Motion system

Extend `src/app/utils/motionPresets.ts` (easings + reduced motion already exist).

| Token | Duration | Ease | Use |
|-------|----------|------|-----|
| `tap` | 120 ms | `EASE_OUT_SMOOTH` | Press, toggle, hover in |
| `panel` | 280 ms | `EASE_PREMIUM` | Menus, toasts, panels, list add/remove |
| `scene` | 450 ms | `EASE_PREMIUM` | Page change, Now Playing open/close |

- No bounce, except the asterisk (small overshoot when favoriting).
- Things enter from where they come from (a menu from its button, a toast from the bar).
- Lists: items added animate height + opacity; removed items collapse (no jump).
- The only ambient motion: the playing indicator. Nothing else moves by itself.
- `prefers-reduced-motion`: durations → 0.

## 5. Micro-interactions catalog

| Interaction | Behavior |
|-------------|----------|
| Favorite | Icon fills in accent with a small spray burst (6 grain particles, 280 ms). Sidebar "Favorites" count ticks up |
| Add to queue | Mini cover flies to the queue icon in the compact bar (panel); counter ticks up |
| Play / pause | Icon morphs (not swapped). Compact bar cover gets a 1 px accent line on first play |
| Song change | Title + cover crossfade synced with audio crossfade length |
| Open / close Now Playing | Bar cover + title fly into the large cover + title (`scene`, shared element); bar left zone empties. Reverse on close. Never show the song identity in both places |
| Hover a cover | Play button fades in; cover scales 1.02 |
| Row hover | Actions (favorite, add, more) appear on the right, same on every list |
| Drag in queue / playlist | Row lifts (shadow + 1.02), others slide away; drop settles with 120 ms |
| Drag a song to sidebar playlist | Playlist row highlights; drop → toast `Added to {name}` |
| Volume | Dragging/scrolling on the bar slider shows `55` next to it; fades 800 ms after release. Click speaker = mute/unmute |
| Right-click any song | Opens the shared song menu (same as "…") |
| Keyboard | Space play/pause · ←/→ seek 5 s · ⇧←/⇧→ prev/next · ⌘K search · ⌘N new playlist · L lyrics · ? shortcuts |

## 6. Shared song menu (one component everywhere)

Order: **Play next · Add to queue · Start radio** — divider — **Add to playlist ▸ · Favorite / Remove favorite** — divider — **Go to artist** — divider (contextual) — **Remove from this playlist / Remove from queue**.

Add to playlist submenu: **New playlist** (top) · search field if > 6 playlists · list with checkmark on playlists already containing the song.

## 7. Data details

- Relative times: `Just now`, `12 min ago`, `Yesterday`, `Mon`, then `12 Sep`.
- Durations: `3:42` in rows; `2 h 14 min` for totals.
- Recommendation labels (small, tertiary): `Similar to Daft Punk`, `New from Kundo`, `Because you played Gilli`.
- Sidebar: small animated bars next to the collection currently playing.

## Craft checklist (paste into every ticket)

- [ ] All states designed and built: empty (first / returning), loading, error, (offline if network)
- [ ] All copy from this doc, placed in `strings.ts`
- [ ] Motion uses `tap` / `panel` / `scene` tokens only; reduced motion works
- [ ] Reversible actions have a toast with Undo
- [ ] Hover, focus, and active states exist for every interactive element
- [ ] Keyboard reachable; right-click opens the shared song menu on song rows
- [ ] No new graphics outside the slots in `05-visual-language.md`
- [ ] Screenshot attached for review
