/** How genres are written where the plain title case gets them wrong. */
const SPECIAL: Record<string, string> = {
  'lo fi': 'Lo-Fi',
  lofi: 'Lo-Fi',
  'lo-fi': 'Lo-Fi',
  'hip hop': 'Hip-Hop',
  hiphop: 'Hip-Hop',
  'hip-hop': 'Hip-Hop',
  'r&b': 'R&B',
  rnb: 'R&B',
  edm: 'EDM',
  'k pop': 'K-Pop',
  kpop: 'K-Pop',
  'k-pop': 'K-Pop',
  dnb: 'DnB',
  uk: 'UK',
};

/** A Last.fm tag as a display title: "lo fi" → "Lo-Fi", "singer-songwriter" → "Singer Songwriter". */
export function genreTitle(tag: string): string {
  const key = tag.trim().toLowerCase();
  if (SPECIAL[key]) return SPECIAL[key];
  return key
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => SPECIAL[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
