/**
 * NOIR lyrics proxy — EXPERIMENT, uncertain (see LYRICS_ENHANCEMENT_PLAN.md §0).
 *
 * Browsers can't call Musixmatch directly, so the app asks this Worker, which asks Musixmatch using the
 * unofficial access their own desktop app uses. That is against their terms and can stop working at any
 * time. The app falls back to lrclib alone whenever this fails or is switched off.
 *
 *   GET /lyrics?title=…&artist=…   →  { syncedLyrics, plainLyrics, duration, artistName }  or 404
 */
const APP_ID = 'web-desktop-app-v1.0';
const BASE = 'https://apic-desktop.musixmatch.com/ws/1.1/';
const ALLOWED_ORIGINS = ['https://noir.arkivet.xyz', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const CACHE_SECONDS = 60 * 60 * 24 * 7;
const MISS_CACHE_SECONDS = 60 * 60 * 6;

let token = null; // reused for as long as this isolate lives

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  return {
    'access-control-allow-origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'access-control-allow-methods': 'GET, OPTIONS',
    vary: 'origin',
  };
}

function json(request, body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(request), ...extra },
  });
}

async function mxm(path, params) {
  const url = new URL(BASE + path);
  url.search = new URLSearchParams({ app_id: APP_ID, format: 'json', ...params }).toString();
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', cookie: 'x-mxm-token-guid=' } });
  const data = await res.json();
  return data.message;
}

async function getToken(force = false) {
  if (token && !force) return token;
  const message = await mxm('token.get', {});
  token = message?.body?.user_token ?? null;
  if (!token) throw new Error('no token');
  return token;
}

const norm = (s) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const roughly = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
};

async function fetchLyrics(title, artist) {
  const params = (userToken) => ({
    usertoken: userToken,
    q_track: title,
    q_artist: artist,
    namespace: 'lyrics_synched',
    subtitle_format: 'lrc',
  });
  let message = await mxm('macro.subtitles.get', params(await getToken()));
  // 401 = the token was refused (expired or flagged): get a fresh one and try once more.
  if (message?.header?.status_code === 401) {
    message = await mxm('macro.subtitles.get', params(await getToken(true)));
  }
  if (message?.header?.status_code !== 200) return { status: 'error' };

  const calls = message.body?.macro_calls ?? {};
  const track = calls['matcher.track.get']?.message?.body?.track;
  if (!track) return { status: 'none' };
  // The matcher is generous. Better nothing than the wrong song.
  if (!roughly(track.track_name, title) || !roughly(track.artist_name, artist)) return { status: 'none' };

  const sub = calls['track.subtitles.get']?.message?.body?.subtitle_list?.[0]?.subtitle;
  const lyr = calls['track.lyrics.get']?.message?.body?.lyrics;
  const syncedLyrics = sub?.subtitle_body || null;
  const plainLyrics = lyr?.lyrics_body || null;
  if (!syncedLyrics && !plainLyrics) return { status: 'none' };
  return {
    status: 'ok',
    track: {
      syncedLyrics,
      plainLyrics,
      duration: sub?.subtitle_length || track.track_length || undefined,
      artistName: track.artist_name,
    },
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
    const url = new URL(request.url);
    if (url.pathname !== '/lyrics' || request.method !== 'GET') return json(request, { error: 'not found' }, 404);
    const title = url.searchParams.get('title')?.trim();
    const artist = url.searchParams.get('artist')?.trim() ?? '';
    if (!title) return json(request, { error: 'title required' }, 400);

    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const cacheKey = new Request(`https://lyrics-cache.invalid/${encodeURIComponent(norm(title))}/${encodeURIComponent(norm(artist))}`);
    const cached = cache ? await cache.match(cacheKey) : null;
    if (cached) {
      const body = await cached.text();
      return new Response(body, { status: cached.status, headers: { 'content-type': 'application/json', ...corsHeaders(request) } });
    }

    let result;
    try {
      result = await fetchLyrics(title, artist);
    } catch {
      return json(request, { error: 'upstream failed' }, 502);
    }
    if (result.status === 'error') return json(request, { error: 'upstream refused' }, 502);

    const response =
      result.status === 'ok'
        ? json(request, result.track, 200, { 'cache-control': `public, max-age=${CACHE_SECONDS}` })
        : json(request, { error: 'not found' }, 404, { 'cache-control': `public, max-age=${MISS_CACHE_SECONDS}` });
    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  },
};
