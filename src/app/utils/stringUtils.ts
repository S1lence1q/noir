export function cleanSongTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\([^)]*\)/g, '') // remove anything in parentheses (e.g., "(Official Video)")
    .replace(/\[[^\]]*\]/g, '') // remove anything in brackets (e.g., "[Lyrics]")
    .replace(/ft\..*$/gi, '') // remove "ft." and everything after
    .replace(/feat\..*$/gi, '') // remove "feat." and everything after
    .replace(/\|.*$/g, '') // remove "|" and everything after
    .replace(/"/g, '') // remove quotes
    .trim();
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
