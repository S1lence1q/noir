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

export interface VerifiedArtist {
  name: string;
  thumbnail: string;
  channelId?: string;
  disambiguation?: string;
  country?: string;
  tags?: string[];
  isTopic?: boolean;
}
export interface LyricLine {
  time: number;
  text: string;
}
