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

export function getPrimaryArtist(artist: string): string {
  if (!artist) return '';

  // Clean off standard feature suffixes first
  let cleaned = artist
    .split(/\s+feat\.?\s+/i)[0]
    .split(/\s+ft\.?\s+/i)[0]
    .split(/\s+featuring\s+/i)[0];

  // Split on collaborative delimiters and take the first item
  const delimiters = [',', ' & ', ' and ', ' x ', ' X '];
  for (const delimiter of delimiters) {
    if (cleaned.includes(delimiter)) {
      cleaned = cleaned.split(delimiter)[0];
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
