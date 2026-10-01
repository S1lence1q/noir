/** Video/upload noise that is never part of a song title, as the content of a (...) or [...] group. */
const VIDEO_TAG =
  /official|lyric|visuali[sz]er|audio|video|\bm\/?v\b|\bhd\b|\bhq\b|\b[48]k\b|remaster(?:ed)?\s*\d{0,4}$|^live\b|music\s*video|clip officiel|full (?:song|album)|explicit|clean$/i;

/** "feat. X", "ft. X", "prod. by X", "with X" tails inside or after a title. */
const CREDIT_TAIL = /(?:^|\s)[(\[]?\s*(?:feat\.?|ft\.?|featuring|prod\.?(?:\s*by)?)\s+[^)\]]*[)\]]?\s*$/i;

/** Drop "(...)" / "[...]" groups for which `drop` says yes; keep the rest (e.g. "(Don't Fear) The Reaper"). */
function stripGroups(title: string, drop: (inner: string) => boolean): string {
  return title.replace(/\(([^)]*)\)|\[([^\]]*)\]/g, (all, a, b) => (drop(a ?? b ?? '') ? '' : all));
}

const squash = (s: string) => s.replace(/\s{2,}/g, ' ').trim();

/**
 * Title as lyrics sources know it. Strips only video noise and credits, and a leading "Artist - "
 * when the artist is already known. Parenthesised parts that belong to the title are kept.
 */
export function cleanSongTitle(title: string, artist = ''): string {
  if (!title) return '';
  let t = title.replace(/["“”]/g, '').replace(/\s*\|.*$/, '');
  t = stripGroups(t, (inner) => VIDEO_TAG.test(inner) || /^(?:feat|ft|featuring|prod)\b/i.test(inner.trim()));
  t = squash(t).replace(CREDIT_TAIL, '');
  const dash = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash && artist) {
    const left = dash[1].toLowerCase();
    const known = getPrimaryArtist(artist).toLowerCase();
    if (known && (left === known || left.includes(known) || known.includes(left))) t = dash[2];
  }
  // A trailing " - Official Video" style suffix.
  t = t.replace(/\s+[-–—]\s+(?:official|lyric|audio|video|visuali[sz]er|remaster|live).*$/i, '');
  return squash(t);
}

/**
 * Search titles for lyrics lookup, best first: the careful clean, then with every remaining
 * parenthetical removed (turns "Song (Radio Edit)" into "Song"). Distinct values only.
 */
export function lyricsTitleVariants(title: string, artist = ''): string[] {
  const careful = cleanSongTitle(title, artist);
  const bare = squash(careful.replace(/\([^)]*\)|\[[^\]]*\]/g, ''));
  return [careful, bare].filter((v, i, all) => v.length > 0 && all.indexOf(v) === i);
}

/**
 * Acts whose name contains a collaboration delimiter but are one act. Lower-case, exact match
 * after feature suffixes are removed. Rules below catch most bands; this is for the rest.
 */
const SINGLE_ACTS = new Set([
  'kim larsen & kjukken',
  'kim larsen & bellami',
  'kim larsen & jungledreams',
  'kim larsen & erik clausen',
  'nik & jay',
  'simon & garfunkel',
  'hall & oates',
  'daryl hall & john oates',
  'earth, wind & fire',
  'crosby, stills & nash',
  'crosby, stills, nash & young',
  'emerson, lake & palmer',
  'peter, bjorn and john',
  'of monsters and men',
  'belle and sebastian',
  'iron & wine',
  'angus & julia stone',
  'chase & status',
  'sam & dave',
  'ashford & simpson',
  'peaches & herb',
  'kool & the gang',
  'marina and the diamonds',
  'florence and the machine',
  'years & years',
  'above & beyond',
  'brooks & dunn',
  'big & rich',
  'dan + shay',
  'love and money',
  'tears for fears',
  'me first and the gimme gimmes',
  'huey lewis & the news',
  'tyler, the creator',
  'swedish house mafia',
  'lost frequencies',
]);

/** "X & The Y", "X and his Y", "X & Sons" — a band name, not two artists. */
const BAND_TAIL = /^(the|his|her|their)\b|^(sons|daughters|friends|brothers|sisters|band|orchestra|orkester|crew|gang|co\.?|company)$/i;

function isSingleAct(name: string, delimiter: string, right: string): boolean {
  if (SINGLE_ACTS.has(name.toLowerCase())) return true;
  // "Tyler, The Creator" / "Bob Marley & The Wailers" / "Mumford & Sons"
  if ((delimiter === ' & ' || delimiter === ' and ' || delimiter === ',') && BAND_TAIL.test(right.trim())) return true;
  return false;
}

export function getPrimaryArtist(artist: string): string {
  if (!artist) return '';

  // Clean off standard feature suffixes first
  let cleaned = artist
    .split(/\s+feat\.?\s+/i)[0]
    .split(/\s+ft\.?\s+/i)[0]
    .split(/\s+featuring\s+/i)[0]
    .replace(/\s*-\s*Topic\s*$/i, '')
    .trim();

  // Split on collaborative delimiters and take the first item — unless the whole name is one act.
  if (!SINGLE_ACTS.has(cleaned.toLowerCase())) {
    const delimiters = [',', ' & ', ' and ', ' x ', ' X '];
    for (const delimiter of delimiters) {
      const at = cleaned.indexOf(delimiter);
      if (at <= 0) continue;
      const right = cleaned.slice(at + delimiter.length);
      if (isSingleAct(cleaned, delimiter, right)) break;
      cleaned = cleaned.slice(0, at);
    }
  }

  // Strip YouTube / label channel suffixes (Topic, VEVO, Official)
  return cleaned
    .replace(/\s*-\s*Topic\s*$/i, '')
    .replace(/\s*VEVO\s*$/i, '')
    .replace(/\s*Official\s*$/i, '')
    .trim();
}

/** Display-safe artist label (primary + no Topic/VEVO). */
export function displayArtistName(artist: string): string {
  return getPrimaryArtist(artist) || artist.trim();
}

/**
 * Artist spellings to try when looking up lyrics, best first. Catalogues credit the same song
 * differently ("Kim Larsen & Kjukken" vs "Kim Larsen"), so a band name falls back to its first name.
 */
export function lyricsArtistVariants(artist: string): string[] {
  const primary = getPrimaryArtist(artist);
  if (!primary) return [];
  const first = primary.split(/\s+(?:&|and|x|\+)\s+|\s*,\s*/i)[0].trim();
  return [primary, first].filter((v, i, all) => v.length > 0 && all.indexOf(v) === i);
}
