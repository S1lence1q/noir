# NOIR lyrics proxy (experiment)

A tiny Cloudflare Worker that lets the web app get synced lyrics from Musixmatch. Uncertain by design — read
`LYRICS_ENHANCEMENT_PLAN.md` §0 first. lrclib keeps working without it.

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
