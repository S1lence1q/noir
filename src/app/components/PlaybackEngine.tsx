import { useEffect } from 'react';
import { usePlaybackCore } from '../hooks/usePlaybackCore';
import { usePlayStats } from '../hooks/usePlayStats';
import type { PlaybackSongData } from '../types/playback';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface EngineQueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  videoId: string;
  audioUrl?: string;
}

interface PlaybackEngineProps {
  songData: PlaybackSongData;
  queue: EngineQueueItem[];
  onSelectFromQueue?: (id: string, isCrossfade?: boolean) => void;
  onPlayingStateChange?: (playing: boolean) => void;
  onShellPlaybackState?: (state: { currentTime: number; duration: number; isPlaying: boolean }) => void;
  /** Set when the first song comes from a saved session. */
  restore?: { paused: boolean; at: number } | null;
}

/**
 * The player itself: two audio elements and two YouTube containers (A/B, for the crossfade), driven by
 * usePlaybackCore. Renders nothing visible; the shell reads its state through onShellPlaybackState and
 * controls it through window events.
 */
export function PlaybackEngine({
  songData,
  queue,
  onSelectFromQueue,
  onPlayingStateChange,
  onShellPlaybackState,
  restore,
}: PlaybackEngineProps) {
  const { isPlaying, currentTime, duration, setDuration, audioRefA, audioRefB, activeEngine } = usePlaybackCore({
    songData,
    queue: queue.map((item) => ({
      id: item.id,
      videoId: item.videoId,
      audioUrl: item.audioUrl || '',
      title: item.title,
      artist: item.artist,
      thumbnail: item.thumbnail,
    })),
    onSelectFromQueue,
    onPlayingStateChange,
    restore,
  });

  useEffect(() => {
    onShellPlaybackState?.({ currentTime, duration, isPlaying });
  }, [currentTime, duration, isPlaying, onShellPlaybackState]);

  usePlayStats(songData, isPlaying);

  return (
    <div aria-hidden className="pointer-events-none invisible absolute inset-0 z-0 overflow-hidden">
      <div className="w-0 h-0 overflow-hidden absolute pointer-events-none" style={{ opacity: 0 }}>
        <div key="container-A-parent">
          <div id="yt-player-container-A" key="yt-player-container-A" />
        </div>
        <div key="container-B-parent">
          <div id="yt-player-container-B" key="yt-player-container-B" />
        </div>
      </div>
      <audio
        ref={audioRefA}
        onLoadedMetadata={(e) => {
          if (activeEngine === 'A') setDuration(e.currentTarget.duration);
        }}
        className="hidden"
      />
      <audio
        ref={audioRefB}
        onLoadedMetadata={(e) => {
          if (activeEngine === 'B') setDuration(e.currentTarget.duration);
        }}
        className="hidden"
      />
    </div>
  );
}
