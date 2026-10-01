import { readExtraLyricsSource } from '../../utils/lyricsSources';
import type { LyricsProvider, LyricsTrack } from './types';

/**
 * EXPERIMENT, uncertain: Musixmatch has no free official synced-lyrics API. This talks to a small proxy of
 * ours (see LYRICS_ENHANCEMENT_PLAN.md §0) that uses the unofficial access Musixmatch's own desktop app uses.
 * It can stop working at any time. Off unless VITE_LYRICS_PROXY_URL is set; lrclib is unaffected either way.
 *
 * The proxy answers GET {url}/lyrics?title=&artist= with a LyricsTrack as JSON, or 404 for "not found".
 */
const PROXY_URL: string | undefined = import.meta.env?.VITE_LYRICS_PROXY_URL;

export const musixmatchProvider: LyricsProvider | null = PROXY_URL
  ? {
      name: 'musixmatch',
      async lookup(title, artist) {
        if (!readExtraLyricsSource()) return { list: [], complete: true };
        // No artist to check the match against: too easy to return the wrong song.
        if (!artist) return { list: [], complete: true };
        const res = await fetch(`${PROXY_URL}/lyrics?${new URLSearchParams({ title, artist })}`);
        if (res.status === 404) return { list: [], complete: true };
        if (!res.ok) throw new Error('Lyrics proxy error');
        const track = (await res.json()) as LyricsTrack | null;
        return { list: track && (track.syncedLyrics || track.plainLyrics) ? [track] : [], complete: true };
      },
    }
  : null;
