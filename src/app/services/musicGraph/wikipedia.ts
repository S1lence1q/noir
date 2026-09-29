import { cleanName } from './normalize';

/**
 * Fetch a clean editorial artist summary from Wikipedia (Danish first, then English).
 * Wikipedia REST API is free, fast, supports CORS, and requires no API key.
 */
export async function getWikipediaArtistSummary(artist: string): Promise<string | undefined> {
  const query = encodeURIComponent(cleanName(artist).replace(/\s+/g, '_'));

  // 1. Try Danish Wikipedia (for Danish artists)
  try {
    const daRes = await fetch(`https://da.wikipedia.org/api/rest_v1/page/summary/${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (daRes.ok) {
      const data = await daRes.json();
      if (
        typeof data.extract === 'string' &&
        data.extract.length >= 40 &&
        data.type !== 'disambiguation'
      ) {
        return data.extract.trim();
      }
    }
  } catch {
    // Non-fatal, continue to fallback
  }

  // 2. Fallback to English Wikipedia
  try {
    const enRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (enRes.ok) {
      const data = await enRes.json();
      if (
        typeof data.extract === 'string' &&
        data.extract.length >= 40 &&
        data.type !== 'disambiguation'
      ) {
        return data.extract.trim();
      }
    }
  } catch {
    // Non-fatal, return undefined
  }

  return undefined;
}
