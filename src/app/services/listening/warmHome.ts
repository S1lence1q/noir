import { getListeningEvents } from './eventsStore';
import { loadDailyMixes } from '../mixes/dailyMixes';
import { loadDiscoverFeed } from '../discover/discoverFeed';

/** Mixes and shelves take 15s+ on a fresh profile; wait for what's quick, the rest finishes behind Home. */
const WARM_TIMEOUT_MS = 9000;

function preload(urls: (string | undefined)[]) {
  return Promise.all(
    urls
      .filter((url): url is string => !!url)
      .slice(0, 24)
      .map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = url;
            setTimeout(resolve, 4000);
          })
      )
  );
}

/**
 * After first-run picks: fetch what Home and Discover will ask for (mixes, discover shelves, their covers),
 * so both open filled in. Never throws; gives up after a cap.
 */
export async function warmHome(): Promise<void> {
  const work = (async () => {
    const events = await getListeningEvents();
    await Promise.allSettled([
      loadDailyMixes(events, []).then((mixes) => preload(mixes.flatMap((m) => [m.coverImage, m.tracks[0]?.thumbnail]))),
      loadDiscoverFeed(events).then((feed) =>
        preload([
          ...feed.newReleases.map((r) => r.image),
          ...feed.artistsLike.map((a) => a.image),
          ...feed.tags.flatMap((t) => t.tracks.slice(0, 6).map((track) => track.thumbnail)),
        ])
      ),
    ]);
  })().catch((err) => console.warn('[cold-start] warm failed', err));
  await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, WARM_TIMEOUT_MS))]);
}
