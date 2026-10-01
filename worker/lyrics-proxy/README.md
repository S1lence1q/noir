# NOIR lyrics proxy (experiment)

A tiny Cloudflare Worker that lets the web app get synced lyrics from Musixmatch. Uncertain by design — read
`LYRICS_ENHANCEMENT_PLAN.md` §0 first. lrclib keeps working without it.

## Your own token (needed in practice)
The anonymous token the Worker can mint itself gets a canned wrong answer back from Musixmatch (tested
2026-10-01: two different songs returned the identical result). The Spicetify lyrics-plus app avoids this by
having each user supply their own token, copied from Musixmatch's official app. Do the same:

1. Open Musixmatch's official app/web player in a browser.
2. Open DevTools → Network, reload, filter by `apic`.
3. Click any request, find `usertoken` in the request URL/headers, copy it.
4. Put it in `worker/lyrics-proxy/.dev.vars` (git-ignored) as one line: `MXM_TOKEN=<the token>`
   (deployed: `npx wrangler secret put MXM_TOKEN`).

Never paste the token into chat, commits or screenshots. It is tied to your session and can be flagged.

## Run locally (no Cloudflare account needed)
```
cd worker/lyrics-proxy
npx wrangler dev          # serves http://localhost:8787
```
Then in the repo root `.env.local`:
```
VITE_LYRICS_PROXY_URL=http://localhost:8787
```
and restart `npm run dev`.

## Deploy (free Cloudflare account)
```
cd worker/lyrics-proxy
npx wrangler login
npx wrangler deploy       # prints https://noir-lyrics-proxy.<you>.workers.dev
```
Put that URL in `VITE_LYRICS_PROXY_URL` for the build.

## Switching it off
- Build without `VITE_LYRICS_PROXY_URL`: the source does not exist in the app at all.
- In the app: Settings → Extra lyrics source.
- Or delete the Worker.

## Test
`curl 'http://localhost:8787/lyrics?title=Kun%20for%20dig&artist=Medina'` → JSON with `syncedLyrics`, or 404.
