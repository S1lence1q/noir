var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// index.js
var APP_ID = "web-desktop-app-v1.0";
var BASE = "https://apic-desktop.musixmatch.com/ws/1.1/";
var ALLOWED_ORIGINS = ["https://noir.arkivet.xyz", "http://localhost:5173", "http://127.0.0.1:5173"];
var CACHE_SECONDS = 60 * 60 * 24 * 7;
var MISS_CACHE_SECONDS = 60 * 60 * 6;
var token = null;
function corsHeaders(request) {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "access-control-allow-methods": "GET, OPTIONS",
    vary: "origin"
  };
}
__name(corsHeaders, "corsHeaders");
function json(request, body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(request), ...extra }
  });
}
__name(json, "json");
async function mxm(path, params) {
  const url = new URL(BASE + path);
  url.search = new URLSearchParams({ app_id: APP_ID, format: "json", ...params }).toString();
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", cookie: "x-mxm-token-guid=" } });
  const data = await res.json();
  return data.message;
}
__name(mxm, "mxm");
async function getToken(env, force = false) {
  if (env?.MXM_TOKEN) return env.MXM_TOKEN;
  if (token && !force) return token;
  const message = await mxm("token.get", {});
  token = message?.body?.user_token ?? null;
  if (!token) throw new Error("no token");
  return token;
}
__name(getToken, "getToken");
var norm = /* @__PURE__ */ __name((s) => (s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""), "norm");
var roughly = /* @__PURE__ */ __name((a, b) => {
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}, "roughly");
function describe(message) {
  const calls = message?.body?.macro_calls ?? {};
  const out = { header: message?.header, calls: {} };
  for (const [name, call] of Object.entries(calls)) {
    const body = call?.message?.body;
    out.calls[name] = {
      status: call?.message?.header?.status_code,
      hint: call?.message?.header?.hint,
      bodyKeys: body && typeof body === "object" ? Object.keys(body) : typeof body,
      track: body?.track ? { track_name: body.track.track_name, artist_name: body.track.artist_name, has_subtitles: body.track.has_subtitles, has_lyrics: body.track.has_lyrics, track_length: body.track.track_length } : void 0,
      subtitles: Array.isArray(body?.subtitle_list) ? body.subtitle_list.map((x) => ({ keys: Object.keys(x?.subtitle ?? {}), length: x?.subtitle?.subtitle_body?.length })) : void 0,
      lyricsLength: body?.lyrics?.lyrics_body?.length
    };
  }
  return out;
}
__name(describe, "describe");
async function fetchLyrics(env, title, artist, debug = false) {
  const params = /* @__PURE__ */ __name((userToken) => ({
    usertoken: userToken,
    q_track: title,
    q_artist: artist,
    q_artists: artist,
    q_album: "",
    namespace: "lyrics_synched",
    subtitle_format: "lrc",
    optional_calls: "track.richsync"
  }), "params");
  let message = await mxm("macro.subtitles.get", params(await getToken(env)));
  if (message?.header?.status_code === 401) {
    message = await mxm("macro.subtitles.get", params(await getToken(env, true)));
  }
  if (debug) {
    const { usertoken, ...sent } = params("x");
    return { status: "debug", info: { personalToken: Boolean(env?.MXM_TOKEN), sent, ...describe(message) } };
  }
  if (message?.header?.status_code !== 200) return { status: "error" };
  const calls = message.body?.macro_calls ?? {};
  const track = calls["matcher.track.get"]?.message?.body?.track;
  if (!track) return { status: "none" };
  if (!roughly(track.track_name, title) || !roughly(track.artist_name, artist)) return { status: "none" };
  const sub = calls["track.subtitles.get"]?.message?.body?.subtitle_list?.[0]?.subtitle;
  const lyr = calls["track.lyrics.get"]?.message?.body?.lyrics;
  const syncedLyrics = sub?.subtitle_body || null;
  const plainLyrics = lyr?.lyrics_body || null;
  if (!syncedLyrics && !plainLyrics) return { status: "none" };
  return {
    status: "ok",
    track: {
      syncedLyrics,
      plainLyrics,
      duration: sub?.subtitle_length || track.track_length || void 0,
      artistName: track.artist_name
    }
  };
}
__name(fetchLyrics, "fetchLyrics");
var index_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    const url = new URL(request.url);
    if (url.pathname !== "/lyrics" || request.method !== "GET") return json(request, { error: "not found" }, 404);
    const title = url.searchParams.get("title")?.trim();
    const artist = url.searchParams.get("artist")?.trim() ?? "";
    if (!title) return json(request, { error: "title required" }, 400);
    if (url.searchParams.get("debug") === "1") {
      try {
        const r = await fetchLyrics(env, title, artist, true);
        return json(request, r.info ?? r);
      } catch (e) {
        return json(request, { error: String(e) }, 502);
      }
    }
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = new Request(`https://lyrics-cache.invalid/${encodeURIComponent(norm(title))}/${encodeURIComponent(norm(artist))}`);
    const cached = cache ? await cache.match(cacheKey) : null;
    if (cached) {
      const body = await cached.text();
      return new Response(body, { status: cached.status, headers: { "content-type": "application/json", ...corsHeaders(request) } });
    }
    let result;
    try {
      result = await fetchLyrics(env, title, artist);
    } catch {
      return json(request, { error: "upstream failed" }, 502);
    }
    if (result.status === "error") return json(request, { error: "upstream refused" }, 502);
    const response = result.status === "ok" ? json(request, result.track, 200, { "cache-control": `public, max-age=${CACHE_SECONDS}` }) : json(request, { error: "not found" }, 404, { "cache-control": `public, max-age=${MISS_CACHE_SECONDS}` });
    if (cache) await cache.put(cacheKey, response.clone());
    return response;
  }
};

// ../../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-v4saSx/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = index_default;

// ../../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-v4saSx/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
