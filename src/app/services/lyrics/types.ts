/** One version of a song's lyrics, as a source describes it. Several sources use this same shape. */
export type LyricsTrack = {
  /** `.lrc` text with [mm:ss.xx] stamps. */
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  /** Length of the recording these lyrics were timed against, in seconds. */
  duration?: number;
  artistName?: string;
};

export type LookupResult = {
  list: LyricsTrack[];
  /** False when some searches failed outright, so an empty answer may just be an outage. */
  complete: boolean;
};

/** A place lyrics can come from. Add a source by adding one of these to `PROVIDERS` in `index.ts`. */
export type LyricsProvider = {
  name: string;
  lookup(title: string, artist: string): Promise<LookupResult>;
};
