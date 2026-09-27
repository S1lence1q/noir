export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  videoId: string;
  channelId?: string;
  audioUrl?: string;
  duration?: number;
}

export type ArtistConfidence = 'high' | 'medium' | 'low';

export interface VerifiedArtist {
  name: string;
  thumbnail: string;
  channelId?: string;
  /** MusicBrainz / Last.fm artist id when known. */
  mbid?: string;
  /** Deezer artist id when known. */
  deezerId?: number;
  confidence?: ArtistConfidence;
  disambiguation?: string;
  country?: string;
  tags?: string[];
  isTopic?: boolean;
}
export interface LyricLine {
  time: number;
  text: string;
}
