import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useFadeVolume } from './useFadeVolume';
import {
  initAudioAnalyzer,
  resumeGlobalAudioContext,
  suspendGlobalAudioContext,
} from '../utils/audioAnalyzer';
import type { PlaybackSongData, PlaybackQueueItem } from '../types/playback';
import { getPlaybackSongKey } from '../utils/playbackSongKey';

interface UsePlaybackCoreOptions {
  songData: PlaybackSongData;
  queue: PlaybackQueueItem[];
  onSelectFromQueue?: (id: string, isCrossfade?: boolean) => void;
  onPlayingStateChange?: (playing: boolean) => void;
}

export function usePlaybackCore({
  songData,
  queue,
  onSelectFromQueue,
  onPlayingStateChange,
}: UsePlaybackCoreOptions) {
  // 1. Core States
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('elva_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });
  const [preMuteVolume, setPreMuteVolume] = useState<number>(() => {
    const saved = localStorage.getItem('elva_player_premute_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });
  const [activeEngine, setActiveEngine] = useState<'A' | 'B'>('A');

  // 2. Playback System Refs
  const audioRefA = useRef<HTMLAudioElement>(null);
  const audioRefB = useRef<HTMLAudioElement>(null);
  const ytPlayerRefA = useRef<any>(null);
  const ytPlayerRefB = useRef<any>(null);
  const isYouTubeRefA = useRef(false);
  const isYouTubeRefB = useRef(false);
  
  const audioSourceRefA = useRef<MediaElementAudioSourceNode | null>(null);
  const audioSourceRefB = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const activeEngineRef = useRef<'A' | 'B'>('A');
  const isPlayingRef = useRef(isPlaying);
  const lastIsPlayingRef = useRef(isPlaying);
  const lastToggleTimeRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const isCrossfadingRef = useRef(false);
  const ytPlayResolveRef = useRef<(() => void) | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const handleNextSongRef = useRef<() => Promise<void>>(async () => {});
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);

  const isTogglingPlayPauseRef = useRef(false);
  const lastLoadedSongRef = useRef<string | null>(null);

  // Sync state variables to refs instantly to prevent async closure lag
  useEffect(() => {
    activeEngineRef.current = activeEngine;
  }, [activeEngine]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // 3. Dual Volume Faders
  const { 
    fadeVolume: fadeVolumeA, 
    faderRef: faderRefA, 
    faderAnimationRef: faderAnimationRefA, 
    fadeResolveRef: fadeResolveRefA, 
    isFadingOutRef: isFadingOutRefA 
  } = useFadeVolume({
    volumeRef,
    ytPlayerRef: ytPlayerRefA,
    audioRef: audioRefA,
    isYouTubeRef: isYouTubeRefA
  });

  const { 
    fadeVolume: fadeVolumeB, 
    faderRef: faderRefB, 
    faderAnimationRef: faderAnimationRefB, 
    fadeResolveRef: fadeResolveRefB, 
    isFadingOutRef: isFadingOutRefB 
  } = useFadeVolume({
    volumeRef,
    ytPlayerRef: ytPlayerRefB,
    audioRef: audioRefB,
    isYouTubeRef: isYouTubeRefB
  });

  // 4. State Modification Setters
  const setPlaying = useCallback((value: boolean) => {
    isPlayingRef.current = value;
    setIsPlaying(value);
  }, []);

  // 5. Playback Engine Core Operations
  const initAnalyzer = useCallback((element: HTMLAudioElement, sourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>) => {
    initAudioAnalyzer(element, sourceRef, analyserRef, audioContextRef);
  }, []);

  const stopAllPlayback = useCallback(() => {
    if (audioRefA.current) {
      try {
        audioRefA.current.pause();
        audioRefA.current.src = '';
      } catch {}
    }
    if (audioRefB.current) {
      try {
        audioRefB.current.pause();
        audioRefB.current.src = '';
      } catch {}
    }
    if (ytPlayerRefA.current && typeof ytPlayerRefA.current.pauseVideo === 'function') {
      try { ytPlayerRefA.current.pauseVideo(); } catch {}
    }
    if (ytPlayerRefB.current && typeof ytPlayerRefB.current.pauseVideo === 'function') {
      try { ytPlayerRefB.current.pauseVideo(); } catch {}
    }
  }, []);

  // Abort any active background crossfade
  const abortActiveCrossfade = useCallback(() => {
    if (isCrossfadingRef.current) {
      isCrossfadingRef.current = false;
      
      const inactiveEngine = activeEngineRef.current === 'A' ? 'B' : 'A';
      const oldAudio = inactiveEngine === 'A' ? audioRefA.current : audioRefB.current;
      const oldYT = inactiveEngine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      
      if (oldAudio) {
        try {
          oldAudio.pause();
          oldAudio.src = '';
        } catch {}
      }
      if (oldYT?.pauseVideo) {
        try { oldYT.pauseVideo(); } catch {}
      }
    }
  }, []);

  // YouTube State Change callback mapping
  const handleYTStateChange = useCallback((engineId: 'A' | 'B', e: any) => {
    if (engineId !== activeEngineRef.current) {
      if (isCrossfadingRef.current && e.data === window.YT.PlayerState.PLAYING) {
        if (ytPlayResolveRef.current) {
          ytPlayResolveRef.current();
          ytPlayResolveRef.current = null;
        }
      }
      return;
    }
    
    const isEngineA = engineId === 'A';
    const activeFader = isEngineA ? faderRefA : faderRefB;
    const activeFadeVolume = isEngineA ? fadeVolumeA : fadeVolumeB;

    if (e.data === window.YT.PlayerState.ENDED) {
      if (isCrossfadingRef.current) return; // ignore ended event during active crossfade
      void handleNextSong();
    } else if (e.data === window.YT.PlayerState.PLAYING) {
      setPlaying(true);
      isTransitioningRef.current = false;
      setDuration(e.target.getDuration());
      if (activeFader.current < 0.1) {
        void activeFadeVolume(1, 800);
      }
    } else if (e.data === window.YT.PlayerState.PAUSED) {
      if (!isTransitioningRef.current && !isCrossfadingRef.current) {
        setPlaying(false);
      }
    }
  }, [setPlaying, fadeVolumeA, fadeVolumeB, faderRefA, faderRefB]);

  // Safe and robust get-or-initialize YouTube Player
  const getOrInitYTPlayer = useCallback((engineId: 'A' | 'B'): Promise<any> => {
    return new Promise((resolve) => {
      const isEngineA = engineId === 'A';
      const playerRef = isEngineA ? ytPlayerRefA : ytPlayerRefB;
      const containerId = isEngineA ? 'yt-player-container-A' : 'yt-player-container-B';
      const isYouTubeRef = isEngineA ? isYouTubeRefA : isYouTubeRefB;

      // Check if player exists and its iframe is still alive in the DOM
      if (
        playerRef.current &&
        typeof playerRef.current.loadVideoById === 'function' &&
        playerRef.current.getIframe() &&
        document.body.contains(playerRef.current.getIframe())
      ) {
        resolve(playerRef.current);
        return;
      }

      // If the player exists but is stale (e.g. its iframe was removed/re-rendered by React), destroy it
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          }
        } catch (err) {
          console.warn("Failed to destroy stale YouTube player:", err);
        }
        playerRef.current = null;
      }

      let attempts = 0;
      const checkAndInit = () => {
        // Double check in case it initialized in a concurrent call
        if (
          playerRef.current &&
          typeof playerRef.current.loadVideoById === 'function' &&
          playerRef.current.getIframe() &&
          document.body.contains(playerRef.current.getIframe())
        ) {
          resolve(playerRef.current);
          return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
          resolve(null);
          return;
        }

        // Wait until window.YT and window.YT.Player are fully loaded
        if (!window.YT || typeof window.YT.Player !== 'function') {
          attempts++;
          if (attempts > 100) { // 10 seconds timeout
            console.warn("YouTube API failed to load in 10 seconds");
            resolve(null);
            return;
          }
          setTimeout(checkAndInit, 100);
          return;
        }

        try {
          playerRef.current = new window.YT.Player(containerId, {
            height: '0',
            width: '0',
            playerVars: { autoplay: 0, controls: 0, disablekb: 1 },
            events: {
              onReady: (e: any) => {
                if (activeEngineRef.current === engineId && isYouTubeRef.current) {
                  setDuration(e.target.getDuration());
                }
                resolve(e.target);
              },
              onStateChange: (e: any) => {
                handleYTStateChange(engineId, e);
              }
            }
          });
        } catch (err) {
          console.warn("Failed to construct YouTube player instance:", err);
          resolve(null);
        }
      };

      checkAndInit();
    });
  }, [handleYTStateChange]);

  const loadSongIntoEngine = useCallback(async (engineId: 'A' | 'B', song: PlaybackSongData, playImmediately: boolean) => {
    const isYT = !!song.videoId;
    const isEngineA = engineId === 'A';
    
    const audioEl = isEngineA ? audioRefA.current : audioRefB.current;
    const isYouTubeRef = isEngineA ? isYouTubeRefA : isYouTubeRefB;
    const fader = isEngineA ? faderRefA : faderRefB;
    const fadeVolumeFn = isEngineA ? fadeVolumeA : fadeVolumeB;
    const sourceRef = isEngineA ? audioSourceRefA : audioSourceRefB;
    
    isYouTubeRef.current = isYT;
    
    if (isYT) {
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.src = '';
        } catch {}
      }
      
      // On-demand YouTube instantiation guaranteed
      const ytPlayer = await getOrInitYTPlayer(engineId);
      
      if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        fader.current = 0;
        try { ytPlayer.setVolume(0); } catch {}
        
        if (playImmediately) {
          try {
            ytPlayer.loadVideoById(song.videoId);
            ytPlayer.playVideo();
            void fadeVolumeFn(1, 800);
          } catch {}
        } else {
          try {
            ytPlayer.loadVideoById(song.videoId);
            ytPlayer.setVolume(0);
            ytPlayer.playVideo();
            isTransitioningRef.current = false;
          } catch {}
        }
      }
    } else if (song.audioUrl) {
      // Pause YouTube players only if they have already been initialized
      const ytPlayerActive = isEngineA ? ytPlayerRefA.current : ytPlayerRefB.current;
      const ytPlayerInactive = isEngineA ? ytPlayerRefB.current : ytPlayerRefA.current;
      
      if (ytPlayerActive && typeof ytPlayerActive.pauseVideo === 'function') {
        try { ytPlayerActive.pauseVideo(); } catch {}
      }
      if (ytPlayerInactive && typeof ytPlayerInactive.pauseVideo === 'function') {
        try { ytPlayerInactive.pauseVideo(); } catch {}
      }
      
      if (audioEl) {
        audioEl.src = song.audioUrl;
        fader.current = 0;
        audioEl.volume = 0;
        
        initAnalyzer(audioEl, sourceRef);
        await resumeGlobalAudioContext();
        
        if (playImmediately) {
          try {
            await audioEl.play();
            void fadeVolumeFn(1, 800);
            isTransitioningRef.current = false;
          } catch (err) {
            // Sleep / autoplay: one retry after forcing context resume
            try {
              await resumeGlobalAudioContext();
              await audioEl.play();
              void fadeVolumeFn(1, 800);
            } catch (retryErr) {
              console.error(retryErr || err);
            }
            isTransitioningRef.current = false;
          }
        } else {
          try {
            audioEl.load();
            audioEl.volume = 0;
            await resumeGlobalAudioContext();
            void audioEl.play().catch(() => {});
            isTransitioningRef.current = false;
          } catch {}
        }
      }
    }
  }, [initAnalyzer, fadeVolumeA, fadeVolumeB, faderRefA, faderRefB, getOrInitYTPlayer]);

  const handleNextSong = useCallback(async () => {
    // Abort crossfade since user takes manual skip control
    abortActiveCrossfade();

    const activeFadeVolume = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;

    if (queue.length === 0) {
      toast.info('Queue is empty', {
        description: 'Add more songs to keep the music playing!',
      });
      return;
    }

    if (isPlaying) {
      void activeFadeVolume(0, 400);
    }
    
    const activeKey = getPlaybackSongKey(songData);
    const currentIndex = activeKey
      ? queue.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    const nextIndex = currentIndex === -1 || currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;
    const nextSong = queue[nextIndex];
    if (nextSong && onSelectFromQueue) {
      onSelectFromQueue(nextSong.id);
    }
  }, [isPlaying, queue, songData, fadeVolumeA, fadeVolumeB, setPlaying, onSelectFromQueue, stopAllPlayback, abortActiveCrossfade]);

  const handlePreviousSong = useCallback(async () => {
    abortActiveCrossfade();

    const activeYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
    const activeAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
    const activeIsYT = activeEngineRef.current === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;

    // 1. Standard Behavior: If song has played for more than 3 seconds, restart it from 0:00
    if (currentTimeRef.current > 3.0) {
      setCurrentTime(0);
      if (activeIsYT && activeYT?.seekTo) {
        try { activeYT.seekTo(0, true); } catch {}
      } else if (activeAudio) {
        activeAudio.currentTime = 0;
      }
      return;
    }

    // 2. Otherwise, if there are no songs in the queue, also restart it from 0:00
    if (queue.length === 0) {
      setCurrentTime(0);
      if (activeIsYT && activeYT?.seekTo) {
        try { activeYT.seekTo(0, true); } catch {}
      } else if (activeAudio) {
        activeAudio.currentTime = 0;
      }
      return;
    }

    const activeFadeVolume = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;
    if (isPlaying) {
      void activeFadeVolume(0, 400);
    }
    
    const activeKey = getPlaybackSongKey(songData);
    const currentIndex = activeKey
      ? queue.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;

    const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1;
    const prevSong = queue[prevIndex];
    if (prevSong && onSelectFromQueue) {
      onSelectFromQueue(prevSong.id);
    }
  }, [isPlaying, queue, songData, fadeVolumeA, fadeVolumeB, onSelectFromQueue, abortActiveCrossfade]);

  useEffect(() => {
    handleNextSongRef.current = handleNextSong;
  }, [handleNextSong]);

  const togglePlayPause = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 250) {
      return;
    }
    lastToggleTimeRef.current = now;
    isTogglingPlayPauseRef.current = true;

    // Abort crossfade on manual pause/play actions
    abortActiveCrossfade();

    const activeYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
    const activeAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
    const activeIsYT = activeEngineRef.current === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
    const activeFadeVolume = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;
    const activeFader = activeEngineRef.current === 'A' ? faderRefA : faderRefB;

    try {
      const nextPlaying = !isPlaying;
      if (nextPlaying) {
        if (activeIsYT && activeYT?.playVideo) {
          activeFader.current = 0;
          try {
            activeYT.setVolume(0);
            activeYT.playVideo();
          } catch {}
          void activeFadeVolume(1, 400);
        } else if (activeAudio) {
          activeFader.current = 0;
          activeAudio.volume = 0;
          try {
            await resumeGlobalAudioContext();
            await activeAudio.play();
            void activeFadeVolume(1, 400);
          } catch (err) {
            try {
              await resumeGlobalAudioContext();
              await activeAudio.play();
              void activeFadeVolume(1, 400);
            } catch (retryErr) {
              console.error(retryErr || err);
            }
          }
        }
        setPlaying(true);
      } else {
        if (activeIsYT && activeYT?.pauseVideo) {
          try { activeYT.pauseVideo(); } catch {}
        } else if (activeAudio) {
          activeAudio.pause();
        }
        setPlaying(false);
      }
    } catch (e) {
      console.warn("Play/pause failed:", e);
    } finally {
      isTogglingPlayPauseRef.current = false;
    }
  }, [isPlaying, setPlaying, fadeVolumeA, fadeVolumeB, faderRefA, faderRefB, abortActiveCrossfade]);

  const handleVolumeChange = useCallback(
    (newVol: number) => {
      setVolume(newVol);
      
      const activeYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = activeEngineRef.current === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      const activeFader = activeEngineRef.current === 'A' ? faderRefA : faderRefB;
      
      const targetVol = Math.round(newVol * activeFader.current);
      
      if (activeIsYT && activeYT?.setVolume) {
        try { activeYT.setVolume(targetVol); } catch {}
      }
      if (activeAudio) {
        activeAudio.volume = targetVol / 100;
      }

      window.dispatchEvent(new CustomEvent('elva-volume-change', { detail: { volume: newVol } }));
    },
    [faderRefA, faderRefB]
  );

  const skipTime = useCallback(
    (seconds: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      setCurrentTime(newTime);
      
      const activeYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = activeEngineRef.current === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      
      if (activeIsYT && activeYT?.seekTo) {
        try { activeYT.seekTo(newTime, true); } catch {}
      } else if (activeAudio) {
        activeAudio.currentTime = newTime;
      }
    },
    [duration, currentTime]
  );

  const seekToAbsoluteTime = useCallback(
    (time: number) => {
      const newTime = Math.max(0, Math.min(duration || 9999, time));
      setCurrentTime(newTime);
      
      const activeYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = activeEngineRef.current === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      
      if (activeIsYT && activeYT?.seekTo) {
        try { activeYT.seekTo(newTime, true); } catch {}
      } else if (activeAudio) {
        activeAudio.currentTime = newTime;
      }
    },
    [duration]
  );

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newTime = value[0];
      setCurrentTime(newTime);
      
      const activeYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = activeEngineRef.current === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      
      if (activeIsYT && activeYT?.seekTo) {
        try { activeYT.seekTo(newTime, true); } catch {}
      } else if (activeAudio) {
        activeAudio.currentTime = newTime;
      }
    },
    []
  );

  const formatTime = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const waveformData = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const pattern = Math.sin(i * 0.3) * 0.4 + Math.random() * 0.3 + 0.3;
      return Math.min(1, Math.max(0.15, pattern));
    });
  }, []);



  // 6. Natural Song End Crossfading Check
  const checkCrossfade = useCallback(async (current: number, dur: number) => {
    if (isCrossfadingRef.current || dur <= 0 || queue.length < 2) return;

    const saved = localStorage.getItem('elva_crossfade_duration');
    const crossfadeWindow = saved !== null ? parseFloat(saved) : 3.0;

    if (crossfadeWindow <= 0) return;

    if (current < dur - crossfadeWindow) return;

    const activeKey = getPlaybackSongKey(songData);
    const currentIndex = activeKey
      ? queue.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    const nextIndex = currentIndex === -1 || currentIndex >= queue.length - 1 ? 0 : currentIndex + 1;
    const nextSong = queue[nextIndex];

    if (!nextSong) return;

    const resolvedSong: PlaybackSongData = {
      title: nextSong.title || 'Unknown Title',
      artist: nextSong.artist || 'Unknown Artist',
      artworkUrl: nextSong.thumbnail || songData.artworkUrl,
      videoId: nextSong.videoId,
      audioUrl:
        nextSong.audioUrl ||
        (nextSong.videoId ? `https://www.youtube.com/watch?v=${nextSong.videoId}` : ''),
    };

    const nextSongKey = getPlaybackSongKey(resolvedSong);
    if (!nextSongKey || (activeKey && nextSongKey === activeKey)) return;

    isCrossfadingRef.current = true;
    setCurrentTime(0);
    setDuration(0);

    try {
      const nextEngine = activeEngineRef.current === 'A' ? 'B' : 'A';

      // Prevent manual-load effect from hijacking mid-crossfade
      lastLoadedSongRef.current = nextSongKey;

      if (onSelectFromQueue) {
        onSelectFromQueue(nextSong.id, true);
      }

      // Cue on inactive engine at vol 0 — crossfade curves control both engines
      await loadSongIntoEngine(nextEngine, resolvedSong, false);

      // Set up a promise to wait until the next engine actually starts playing (to avoid silence during buffering)
      let playPromise = Promise.resolve();

      if (resolvedSong.videoId) {
        playPromise = new Promise<void>((resolve) => {
          ytPlayResolveRef.current = resolve;
          // Set a safety timeout of 4 seconds in case YouTube API fails or freezes
          setTimeout(() => {
            if (ytPlayResolveRef.current === resolve) {
              ytPlayResolveRef.current = null;
              resolve();
            }
          }, 4000);
        });
      } else {
        // For local audio, wait for the 'playing' event on the HTML5 audio element
        const audio = nextEngine === 'A' ? audioRefA.current : audioRefB.current;
        if (audio) {
          playPromise = new Promise<void>((resolve) => {
            const onPlaying = () => {
              audio.removeEventListener('playing', onPlaying);
              audio.removeEventListener('error', onError);
              resolve();
            };
            const onError = () => {
              audio.removeEventListener('playing', onPlaying);
              audio.removeEventListener('error', onError);
              resolve();
            };
            audio.addEventListener('playing', onPlaying);
            audio.addEventListener('error', onError);
            // Safety timeout
            setTimeout(() => {
              audio.removeEventListener('playing', onPlaying);
              audio.removeEventListener('error', onError);
              resolve();
            }, 3000);
          });
        }
      }



      // Wait until the next engine starts making sound/playing before blending
      await playPromise;

      const activeFadeOut = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;
      const inactiveFadeIn = activeEngineRef.current === 'A' ? fadeVolumeB : fadeVolumeA;

      const fadeDurationMs = Math.max(200, Math.round(crossfadeWindow * 1000));
      await Promise.all([
        activeFadeOut(0, fadeDurationMs),
        inactiveFadeIn(1, fadeDurationMs),
      ]);

      const oldAudio = activeEngineRef.current === 'A' ? audioRefA.current : audioRefB.current;
      const oldYT = activeEngineRef.current === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;

      if (oldAudio) {
        try {
          oldAudio.pause();
          oldAudio.src = '';
        } catch {}
      }
      if (oldYT?.pauseVideo) {
        try {
          oldYT.pauseVideo();
        } catch {}
      }

      setActiveEngine(nextEngine);
    } catch (err) {
      console.error('Crossfade failed:', err);
    } finally {
      isCrossfadingRef.current = false;
    }
  }, [
    queue,
    songData,
    loadSongIntoEngine,
    onSelectFromQueue,
    fadeVolumeA,
    fadeVolumeB,
  ]);

  // ==========================================
  // 7. EFFECTS GROUP (Grouped at the bottom)
  // ==========================================

  // Sync volume to localStorage
  useEffect(() => {
    localStorage.setItem('elva_player_volume', String(volume));
    if (volume > 0) {
      localStorage.setItem('elva_player_premute_volume', String(volume));
    }
  }, [volume]);

  // Dispatch global volume change events
  useEffect(() => {
    onPlayingStateChange?.(isPlaying);
  }, [isPlaying, onPlayingStateChange]);

  // Load YouTube API script & initialize if already ready
  useEffect(() => {
    const handleAPIReady = () => {
      setTimeout(() => {
        void getOrInitYTPlayer('A');
        void getOrInitYTPlayer('B');
      }, 500);
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = handleAPIReady;
    } else {
      handleAPIReady();
    }
  }, [getOrInitYTPlayer]);

  // Active Player isPlaying Synchronization (Guarded by lastIsPlayingRef)
  useEffect(() => {
    if (lastIsPlayingRef.current === isPlaying) {
      return;
    }
    lastIsPlayingRef.current = isPlaying;

    if (isTogglingPlayPauseRef.current || isTransitioningRef.current || isCrossfadingRef.current) {
      return;
    }

    const activeYT = activeEngine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
    const activeAudio = activeEngine === 'A' ? audioRefA.current : audioRefB.current;
    const activeIsYT = activeEngine === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
    const activeFadeVolume = activeEngine === 'A' ? fadeVolumeA : fadeVolumeB;
    const activeFader = activeEngine === 'A' ? faderRefA : faderRefB;

    if (activeIsYT && activeYT?.playVideo) {
      if (isPlaying) {
        activeFader.current = 0;
        try {
          activeYT.setVolume(0);
          activeYT.playVideo();
        } catch {}
        void activeFadeVolume(1, 400);
      } else {
        try { activeYT.pauseVideo(); } catch {}
      }
    } else if (activeAudio) {
      if (isPlaying) {
        activeFader.current = 0;
        activeAudio.volume = 0;
        void (async () => {
          try {
            await resumeGlobalAudioContext();
            await activeAudio.play();
            void activeFadeVolume(1, 400);
          } catch (err) {
            console.error(err);
          }
        })();
      } else {
        activeAudio.pause();
      }
    }
  }, [isPlaying, activeEngine, fadeVolumeA, fadeVolumeB, faderRefA, faderRefB]);

  // Manual Load Effect (Abort active crossfade and load new song)
  useEffect(() => {
    if (isCrossfadingRef.current) return;

    const songKey = getPlaybackSongKey(songData);
    if (songKey && songKey !== lastLoadedSongRef.current) {
      const isFirstLoad = !lastLoadedSongRef.current;
      lastLoadedSongRef.current = songKey;
      isTransitioningRef.current = true;
      
      const proceedManualLoad = async () => {
        // Reset playhead timeline and duration instantly
        setCurrentTime(0);
        setDuration(0);
        setPlaying(true);
        
        // Abort crossfade since user triggered a manual load
        abortActiveCrossfade();
        
        // Stop other engine completely
        const inactiveEngine = activeEngine === 'A' ? 'B' : 'A';
        const oldAudio = inactiveEngine === 'A' ? audioRefA.current : audioRefB.current;
        const oldYT = inactiveEngine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
        if (oldAudio) {
          try {
            oldAudio.pause();
            oldAudio.src = '';
          } catch {}
        }
        if (oldYT?.pauseVideo) {
          try { oldYT.pauseVideo(); } catch {}
        }

        // Load active engine and force playImmediately to true
        await loadSongIntoEngine(activeEngine, songData, true);
      };

      if (!isFirstLoad && isPlaying) {
        const activeFadeVolume = activeEngine === 'A' ? fadeVolumeA : fadeVolumeB;
        activeFadeVolume(0, 300).then(() => {
          void proceedManualLoad();
        });
      } else {
        void proceedManualLoad();
      }
    }
  }, [songData, activeEngine, loadSongIntoEngine, abortActiveCrossfade, setPlaying, isPlaying, fadeVolumeA, fadeVolumeB]);

  // Media Session API registration
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: songData.title,
      artist: songData.artist,
      artwork: songData.artworkUrl
        ? [{ src: songData.artworkUrl, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => {
      if (!isPlayingRef.current) {
        void togglePlayPause();
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (isPlayingRef.current) {
        void togglePlayPause();
      }
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      void handlePreviousSong();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      void handleNextSongRef.current();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        handleSliderChange([details.seekTime]);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [songData.title, songData.artist, songData.artworkUrl, isPlaying, togglePlayPause, handlePreviousSong, handleSliderChange]);

  // Progress update timer — setInterval at 250ms.
  // RAF at 60fps caused React to re-render the entire tree 60x/second, which
  // created race conditions that randomly triggered togglePlayPause. 250ms
  // is fast enough for a smooth seek-bar and avoids the re-render overload.
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = window.setInterval(() => {
        let current = 0;
        let dur = 0;

        const displayEngine = isCrossfadingRef.current 
          ? (activeEngineRef.current === 'A' ? 'B' : 'A')
          : activeEngineRef.current;

        const activeYT = displayEngine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
        const activeAudio = displayEngine === 'A' ? audioRefA.current : audioRefB.current;
        const activeIsYT = displayEngine === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;

        if (activeIsYT && activeYT?.getCurrentTime) {
          try {
            current = activeYT.getCurrentTime();
            dur = activeYT.getDuration();
          } catch {}
        } else if (activeAudio) {
          current = activeAudio.currentTime;
          dur = activeAudio.duration || 0;
        }

        setCurrentTime(current);
        if (dur > 0 || isCrossfadingRef.current) {
          setDuration(dur);
        }
        void checkCrossfade(current, dur);
      }, 250);
    } else {
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }

    return () => {
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isPlaying, checkCrossfade]);

  // After sleep / tab blur: AudioContext stays suspended (silent MediaElementSource).
  // Keep this gentle — YT/HTML APIs often lie after sleep (false ENDED / dead iframe).
  // Auto-skip or force playVideo() here caused long stalls and empty NP bar flashes.
  useEffect(() => {
    const YT_PAUSED = 2;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const wakePlayback = async () => {
      if (document.visibilityState !== 'visible') return;

      await resumeGlobalAudioContext();
      if (!isPlayingRef.current) return;

      const engine = activeEngineRef.current;
      const activeYT = engine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = engine === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = engine === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      const activeFadeVolume = engine === 'A' ? fadeVolumeA : fadeVolumeB;
      const activeFader = engine === 'A' ? faderRefA : faderRefB;

      if (activeIsYT && activeYT) {
        try {
          const state =
            typeof activeYT.getPlayerState === 'function' ? activeYT.getPlayerState() : null;
          // Only unpause. Never treat wake as ENDED (false positives → slow next-track resolve).
          if (state === YT_PAUSED || state === window.YT?.PlayerState?.PAUSED) {
            if (typeof activeYT.playVideo === 'function') {
              activeYT.playVideo();
            }
          }
          if (activeFader.current < 0.5) {
            void activeFadeVolume(1, 300);
          }
        } catch {
          /* ignore */
        }
        return;
      }

      if (!activeAudio) return;

      // Only trust the ended flag — not currentTime heuristics (0/NaN duration after sleep).
      if (activeAudio.ended && !isCrossfadingRef.current) {
        void handleNextSongRef.current();
        return;
      }

      if (activeAudio.paused) {
        try {
          await activeAudio.play();
          if (activeFader.current < 0.5) {
            void activeFadeVolume(1, 300);
          }
        } catch {
          /* needs another gesture */
        }
      } else if (activeFader.current < 0.15) {
        void activeFadeVolume(1, 300);
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void wakePlayback();
      }, 120);
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fadeVolumeA, fadeVolumeB, faderRefA, faderRefB]);

  // Native ended via refs (React onEnded can see a stale activeEngine after long background).
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    const onEndedA = () => {
      if (isCrossfadingRef.current) return;
      if (activeEngineRef.current !== 'A') return;
      void handleNextSongRef.current();
    };
    const onEndedB = () => {
      if (isCrossfadingRef.current) return;
      if (activeEngineRef.current !== 'B') return;
      void handleNextSongRef.current();
    };

    audioA?.addEventListener('ended', onEndedA);
    audioB?.addEventListener('ended', onEndedB);
    return () => {
      audioA?.removeEventListener('ended', onEndedA);
      audioB?.removeEventListener('ended', onEndedB);
    };
  }, []);

  // Global event receivers
  useEffect(() => {
    const handleTogglePlayEvent = () => {
      void togglePlayPause();
    };
    const handleNextSongEvent = () => {
      void handleNextSong();
    };
    const handlePrevSongEvent = () => {
      void handlePreviousSong();
    };

    const handleSeekEvent = (e: Event) => {
      const time = (e as CustomEvent<{ time?: number }>).detail?.time;
      if (typeof time === 'number' && Number.isFinite(time)) {
        seekToAbsoluteTime(time);
      }
    };
    const handleSetVolumeEvent = (e: Event) => {
      const volume = (e as CustomEvent<{ volume?: number }>).detail?.volume;
      if (typeof volume === 'number' && Number.isFinite(volume)) {
        handleVolumeChange(Math.max(0, Math.min(100, volume)));
      }
    };

    window.addEventListener('elva-toggle-play', handleTogglePlayEvent);
    window.addEventListener('elva-play-next', handleNextSongEvent);
    window.addEventListener('elva-play-prev', handlePrevSongEvent);
    window.addEventListener('elva-seek', handleSeekEvent);
    window.addEventListener('elva-set-volume', handleSetVolumeEvent);

    return () => {
      window.removeEventListener('elva-toggle-play', handleTogglePlayEvent);
      window.removeEventListener('elva-play-next', handleNextSongEvent);
      window.removeEventListener('elva-play-prev', handlePrevSongEvent);
      window.removeEventListener('elva-seek', handleSeekEvent);
      window.removeEventListener('elva-set-volume', handleSetVolumeEvent);
    };
  }, [togglePlayPause, handleNextSong, handlePreviousSong, seekToAbsoluteTime, handleVolumeChange]);

  // Cleanup active animations on unmount
  useEffect(() => {
    return () => {
      if (faderAnimationRefA.current) cancelAnimationFrame(faderAnimationRefA.current);
      if (faderAnimationRefB.current) cancelAnimationFrame(faderAnimationRefB.current);
      if (fadeResolveRefA.current) fadeResolveRefA.current();
      if (fadeResolveRefB.current) fadeResolveRefB.current();
      if (progressTimerRef.current !== null) clearInterval(progressTimerRef.current);
      
      if (audioSourceRefA.current) {
        try { audioSourceRefA.current.disconnect(); } catch {}
      }
      if (audioSourceRefB.current) {
        try { audioSourceRefB.current.disconnect(); } catch {}
      }
      suspendGlobalAudioContext();
    };
  }, [faderAnimationRefA, faderAnimationRefB, fadeResolveRefA, fadeResolveRefB]);

  return {
    isPlaying,
    isPlayingRef,
    currentTime,
    duration,
    setDuration,
    volume,
    preMuteVolume,
    setPreMuteVolume,
    audioRefA,
    audioRefB,
    activeEngine,
    fadeVolume: activeEngine === 'A' ? fadeVolumeA : fadeVolumeB,
    togglePlayPause,
    handleNextSong,
    handlePreviousSong,
    handleSliderChange,
    handleVolumeChange,
    skipTime,
    seekToAbsoluteTime,
    formatTime,
    waveformData,
    setPlaying,
    analyserRef,
    isCrossfadingRef
  };
}
