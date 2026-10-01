import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { noirToast } from '../components/shell/noir/NoirToast';
import { strings } from '../constants/strings';
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
  const crossfadeRunIdRef = useRef(0);
  /** Until a freshly picked song reports PLAYING, the engine's own PAUSED events (from loading) are not the user pausing. */
  const awaitingPlayUntilRef = useRef(0);
  const ytPlayResolveRef = useRef<(() => void) | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const handleNextSongRef = useRef<() => Promise<void>>(async () => {});
  const checkCrossfadeRef = useRef<(current: number, dur: number) => Promise<void>>(async () => {});
  const queueLengthRef = useRef(queue.length);
  const endWatchTimerRef = useRef<number | null>(null);
  const endWatchTokenRef = useRef(0);
  const advanceInFlightRef = useRef(false);
  const lastAdvanceFromKeyRef = useRef<string | null>(null);
  const activeQueueIndexRef = useRef(0);
  const queueRef = useRef(queue);
  const songDataRef = useRef(songData);
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

  useEffect(() => {
    queueLengthRef.current = queue.length;
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    songDataRef.current = songData;
    const key = getPlaybackSongKey(songData);
    if (!key) return;
    const idx = queueRef.current.findIndex((item) => getPlaybackSongKey(item) === key);
    if (idx >= 0) activeQueueIndexRef.current = idx;
  }, [songData]);

  const clearEndWatch = useCallback(() => {
    if (endWatchTimerRef.current != null) {
      window.clearTimeout(endWatchTimerRef.current);
      endWatchTimerRef.current = null;
    }
    endWatchTokenRef.current += 1;
  }, []);

  /**
   * Background tabs freeze JS (Arc) — timers + YT ENDED then flush together on focus and
   * double-advance (skip). Also never re-read a frozen YT clock to decide whether to advance.
   */
  const scheduleEndWatch = useCallback((current: number, dur: number) => {
    if (endWatchTimerRef.current != null) {
      window.clearTimeout(endWatchTimerRef.current);
      endWatchTimerRef.current = null;
    }

    if (!isPlayingRef.current || isCrossfadingRef.current || advanceInFlightRef.current) return;
    if (!(dur > 0) || !Number.isFinite(dur) || !Number.isFinite(current)) return;

    const saved = localStorage.getItem('elva_crossfade_duration');
    const crossfadeWindow = saved !== null ? parseFloat(saved) : 3.0;
    const canCrossfade = crossfadeWindow > 0 && queueLengthRef.current >= 2;
    const lead = canCrossfade ? crossfadeWindow : 0.25;
    const remainingSec = Math.max(0.05, dur - lead - current);
    const token = ++endWatchTokenRef.current;

    endWatchTimerRef.current = window.setTimeout(() => {
      if (token !== endWatchTokenRef.current) return;
      if (!isPlayingRef.current || isCrossfadingRef.current || advanceInFlightRef.current) return;

      // Force the end window — do not trust getCurrentTime() after a frozen background tab.
      if (canCrossfade) {
        void checkCrossfadeRef.current(dur - lead + 0.05, dur);
      } else {
        void handleNextSongRef.current();
      }
    }, Math.ceil(remainingSec * 1000));
  }, []);

  /** Returns false if another advance already claimed this song. */
  const claimAdvanceFrom = useCallback((fromKey: string | null) => {
    if (advanceInFlightRef.current) return false;
    if (fromKey && lastAdvanceFromKeyRef.current === fromKey) return false;
    advanceInFlightRef.current = true;
    if (fromKey) lastAdvanceFromKeyRef.current = fromKey;
    clearEndWatch();
    window.setTimeout(() => {
      advanceInFlightRef.current = false;
    }, 2000);
    return true;
  }, [clearEndWatch]);

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
      crossfadeRunIdRef.current += 1; // invalidates the running crossfade
      
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
      if (isCrossfadingRef.current || isTransitioningRef.current) return; // ignore ended during crossfade / manual load
      clearEndWatch();
      void handleNextSongRef.current();
    } else if (e.data === window.YT.PlayerState.PLAYING) {
      awaitingPlayUntilRef.current = 0;
      setPlaying(true);
      isTransitioningRef.current = false;
      let dur = 0;
      try {
        dur = e.target.getDuration() || 0;
      } catch {
        dur = 0;
      }
      if (dur > 0) setDuration(dur);
      let current = 0;
      try {
        current = e.target.getCurrentTime() || 0;
      } catch {
        current = currentTimeRef.current;
      }
      scheduleEndWatch(current, dur > 0 ? dur : durationRef.current);
      if (activeFader.current < 0.1) {
        void activeFadeVolume(1, 800);
      }
    } else if (e.data === window.YT.PlayerState.PAUSED) {
      if (!isTransitioningRef.current && !isCrossfadingRef.current && Date.now() > awaitingPlayUntilRef.current) {
        clearEndWatch();
        setPlaying(false);
      }
    }
  }, [setPlaying, fadeVolumeA, fadeVolumeB, faderRefA, faderRefB, clearEndWatch, scheduleEndWatch]);

  const ytInitPromiseRefA = useRef<Promise<any> | null>(null);
  const ytInitPromiseRefB = useRef<Promise<any> | null>(null);

  // Safe and robust get-or-initialize YouTube Player (single-flight per engine)
  const getOrInitYTPlayer = useCallback((engineId: 'A' | 'B'): Promise<any> => {
    const isEngineA = engineId === 'A';
    const playerRef = isEngineA ? ytPlayerRefA : ytPlayerRefB;
    const initPromiseRef = isEngineA ? ytInitPromiseRefA : ytInitPromiseRefB;
    const containerId = isEngineA ? 'yt-player-container-A' : 'yt-player-container-B';
    const isYouTubeRef = isEngineA ? isYouTubeRefA : isYouTubeRefB;

    const isLivePlayer = (player: any) =>
      !!player &&
      typeof player.loadVideoById === 'function' &&
      typeof player.getIframe === 'function' &&
      !!player.getIframe() &&
      document.body.contains(player.getIframe());

    if (isLivePlayer(playerRef.current)) {
      return Promise.resolve(playerRef.current);
    }

    // Concurrent first-play + warm-up must share one constructor — destroying mid-init
    // left the first song stuck at 0:00 until a second click rebuilt the player.
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    initPromiseRef.current = new Promise((resolve) => {
      if (playerRef.current && !isLivePlayer(playerRef.current)) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          }
        } catch (err) {
          console.warn('Failed to destroy stale YouTube player:', err);
        }
        playerRef.current = null;
      }

      let attempts = 0;
      const checkAndInit = () => {
        if (isLivePlayer(playerRef.current)) {
          resolve(playerRef.current);
          return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
          initPromiseRef.current = null;
          resolve(null);
          return;
        }

        if (!window.YT || typeof window.YT.Player !== 'function') {
          attempts++;
          if (attempts > 100) {
            console.warn('YouTube API failed to load in 10 seconds');
            initPromiseRef.current = null;
            resolve(null);
            return;
          }
          setTimeout(checkAndInit, 100);
          return;
        }

        // Another caller may have started constructing while we waited for YT.
        if (playerRef.current && !isLivePlayer(playerRef.current)) {
          setTimeout(checkAndInit, 50);
          return;
        }

        try {
          playerRef.current = new window.YT.Player(containerId, {
            height: '0',
            width: '0',
            playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1 },
            events: {
              onReady: (e: any) => {
                playerRef.current = e.target;
                if (activeEngineRef.current === engineId && isYouTubeRef.current) {
                  try {
                    const dur = e.target.getDuration();
                    if (dur > 0) setDuration(dur);
                  } catch {}
                }
                resolve(e.target);
              },
              onStateChange: (e: any) => {
                handleYTStateChange(engineId, e);
              },
              onError: () => {
                // Allow a later call to rebuild after a hard failure
                initPromiseRef.current = null;
              },
            },
          });
        } catch (err) {
          console.warn('Failed to construct YouTube player instance:', err);
          initPromiseRef.current = null;
          resolve(null);
        }
      };

      checkAndInit();
    });

    return initPromiseRef.current;
  }, [handleYTStateChange]);

  const startYouTubePlayback = useCallback(
    (ytPlayer: any, videoId: string, fadeVolumeFn: (t: number, d: number) => Promise<void>) => {
      if (!ytPlayer || !videoId) return;
      try {
        // Muted start satisfies autoplay after async resolve (click gesture already spent).
        if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
        ytPlayer.setVolume?.(0);
        ytPlayer.loadVideoById(videoId);
        ytPlayer.playVideo?.();
      } catch (err) {
        console.warn('YouTube load/play failed:', err);
        return;
      }

      void fadeVolumeFn(1, 800);

      // If autoplay was ignored, retry once shortly after cue.
      window.setTimeout(() => {
        try {
          const state = typeof ytPlayer.getPlayerState === 'function' ? ytPlayer.getPlayerState() : null;
          const playing = state === 1 || state === window.YT?.PlayerState?.PLAYING;
          const buffering = state === 3 || state === window.YT?.PlayerState?.BUFFERING;
          if (playing || buffering) return;
          if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
          ytPlayer.playVideo?.();
          void fadeVolumeFn(1, 600);
        } catch {
          /* ignore */
        }
      }, 700);
    },
    []
  );

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
      
      const ytPlayer = await getOrInitYTPlayer(engineId);
      
      if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        fader.current = 0;
        if (playImmediately) {
          startYouTubePlayback(ytPlayer, song.videoId!, fadeVolumeFn);
          isTransitioningRef.current = false;
        } else {
          try {
            if (typeof ytPlayer.mute === 'function') ytPlayer.mute();
            ytPlayer.setVolume?.(0);
            ytPlayer.loadVideoById(song.videoId);
            ytPlayer.playVideo?.();
            isTransitioningRef.current = false;
          } catch {}
        }
      } else {
        isTransitioningRef.current = false;
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
  }, [initAnalyzer, fadeVolumeA, fadeVolumeB, faderRefA, faderRefB, getOrInitYTPlayer, startYouTubePlayback]);

  const handleNextSong = useCallback(async () => {
    const activeKey = getPlaybackSongKey(songDataRef.current);
    if (!claimAdvanceFrom(activeKey)) return;

    // Abort crossfade since user takes manual skip control
    abortActiveCrossfade();

    const activeFadeVolume = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;
    const q = queueRef.current;

    if (q.length === 0) {
      noirToast({
        text: strings.toast.queueEmpty,
        description: strings.toast.queueEmptyDesc,
      });
      return;
    }

    if (isPlayingRef.current) {
      void activeFadeVolume(0, 400);
    }

    let currentIndex = activeKey
      ? q.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    // Key mismatch used to wrap to 0 and feel like a random jump — prefer last known index.
    if (currentIndex < 0) {
      currentIndex = Math.min(activeQueueIndexRef.current, q.length - 1);
    }
    const nextIndex = currentIndex >= q.length - 1 ? 0 : currentIndex + 1;
    const nextSong = q[nextIndex];
    if (nextSong && onSelectFromQueue) {
      activeQueueIndexRef.current = nextIndex;
      onSelectFromQueue(nextSong.id);
    }
  }, [fadeVolumeA, fadeVolumeB, onSelectFromQueue, abortActiveCrossfade, claimAdvanceFrom]);

  const handlePreviousSong = useCallback(async () => {
    abortActiveCrossfade();
    clearEndWatch();

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
      scheduleEndWatch(0, durationRef.current);
      return;
    }

    const q = queueRef.current;
    // 2. Otherwise, if there are no songs in the queue, also restart it from 0:00
    if (q.length === 0) {
      setCurrentTime(0);
      if (activeIsYT && activeYT?.seekTo) {
        try { activeYT.seekTo(0, true); } catch {}
      } else if (activeAudio) {
        activeAudio.currentTime = 0;
      }
      return;
    }

    const activeFadeVolume = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;
    if (isPlayingRef.current) {
      void activeFadeVolume(0, 400);
    }

    const activeKey = getPlaybackSongKey(songDataRef.current);
    let currentIndex = activeKey
      ? q.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    if (currentIndex < 0) {
      currentIndex = Math.min(activeQueueIndexRef.current, q.length - 1);
    }

    const prevIndex = currentIndex <= 0 ? q.length - 1 : currentIndex - 1;
    const prevSong = q[prevIndex];
    if (prevSong && onSelectFromQueue) {
      lastAdvanceFromKeyRef.current = null;
      activeQueueIndexRef.current = prevIndex;
      onSelectFromQueue(prevSong.id);
    }
  }, [fadeVolumeA, fadeVolumeB, onSelectFromQueue, abortActiveCrossfade, clearEndWatch, scheduleEndWatch]);

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
            activeYT.mute?.();
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
      scheduleEndWatch(newTime, durationRef.current || duration);
    },
    [duration, currentTime, scheduleEndWatch]
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
      scheduleEndWatch(newTime, durationRef.current || duration);
    },
    [duration, scheduleEndWatch]
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
      scheduleEndWatch(newTime, durationRef.current);
    },
    [scheduleEndWatch]
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
    // While a manual pick is loading, the old song's clock is still near its end but songDataRef
    // already names the new song: advancing now would skip the song the listener just picked.
    if (isTransitioningRef.current || isCrossfadingRef.current || advanceInFlightRef.current || dur <= 0 || queueRef.current.length < 2) {
      return;
    }

    const saved = localStorage.getItem('elva_crossfade_duration');
    const crossfadeWindow = saved !== null ? parseFloat(saved) : 3.0;

    if (crossfadeWindow <= 0) return;

    if (current < dur - crossfadeWindow) return;

    const q = queueRef.current;
    const activeSong = songDataRef.current;
    const activeKey = getPlaybackSongKey(activeSong);
    if (!claimAdvanceFrom(activeKey)) return;

    let currentIndex = activeKey
      ? q.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    if (currentIndex < 0) {
      currentIndex = Math.min(activeQueueIndexRef.current, q.length - 1);
    }
    const nextIndex = currentIndex >= q.length - 1 ? 0 : currentIndex + 1;
    const nextSong = q[nextIndex];

    if (!nextSong) {
      advanceInFlightRef.current = false;
      return;
    }

    const resolvedSong: PlaybackSongData = {
      title: nextSong.title || 'Unknown Title',
      artist: nextSong.artist || 'Unknown Artist',
      artworkUrl: nextSong.thumbnail || activeSong.artworkUrl,
      videoId: nextSong.videoId,
      audioUrl:
        nextSong.audioUrl ||
        (nextSong.videoId ? `https://www.youtube.com/watch?v=${nextSong.videoId}` : ''),
    };

    const nextSongKey = getPlaybackSongKey(resolvedSong);
    if (!nextSongKey || (activeKey && nextSongKey === activeKey)) {
      advanceInFlightRef.current = false;
      return;
    }

    isCrossfadingRef.current = true;
    const runId = ++crossfadeRunIdRef.current;
    const cancelled = () => crossfadeRunIdRef.current !== runId;
    activeQueueIndexRef.current = nextIndex;
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
      if (cancelled()) return;

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
      if (cancelled()) return;

      const activeFadeOut = activeEngineRef.current === 'A' ? fadeVolumeA : fadeVolumeB;
      const inactiveFadeIn = activeEngineRef.current === 'A' ? fadeVolumeB : fadeVolumeA;

      const fadeDurationMs = Math.max(200, Math.round(crossfadeWindow * 1000));
      await Promise.all([
        activeFadeOut(0, fadeDurationMs),
        inactiveFadeIn(1, fadeDurationMs),
      ]);
      if (cancelled()) return;

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
      if (!cancelled()) isCrossfadingRef.current = false;
      advanceInFlightRef.current = false;
    }
  }, [
    loadSongIntoEngine,
    onSelectFromQueue,
    fadeVolumeA,
    fadeVolumeB,
    claimAdvanceFrom,
  ]);

  useEffect(() => {
    checkCrossfadeRef.current = checkCrossfade;
  }, [checkCrossfade]);

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
    const songKey = getPlaybackSongKey(songData);
    // A crossfade sets lastLoadedSongRef itself, so only a genuine user pick gets past this check.
    if (songKey && songKey !== lastLoadedSongRef.current) {
      const isFirstLoad = !lastLoadedSongRef.current;
      lastLoadedSongRef.current = songKey;
      awaitingPlayUntilRef.current = Date.now() + 8000;
      setPlaying(true);
      // Kill any running crossfade now, before the 300ms fade-out, so it can't finish mid-load.
      abortActiveCrossfade();
      advanceInFlightRef.current = false;
      isTransitioningRef.current = true;
      // A timer armed for the old song must not fire against the new one.
      clearEndWatch();
      
      const proceedManualLoad = async () => {
        // User-initiated load (not a queue advance) — allow future advances from this song.
        if (!advanceInFlightRef.current) {
          lastAdvanceFromKeyRef.current = null;
        }
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
  }, [songData, activeEngine, loadSongIntoEngine, abortActiveCrossfade, clearEndWatch, setPlaying, isPlaying, fadeVolumeA, fadeVolumeB]);

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
      clearEndWatch();
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
  }, [isPlaying, checkCrossfade, clearEndWatch]);

  // Arm a wall-clock advance when the tab hides (Arc freezes intervals). On show, collapse
  // deferred ENDED + timer flush into a single claimAdvanceFrom.
  useEffect(() => {
    const YT_ENDED = 0;
    const YT_PAUSED = 2;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const readClock = (): { current: number; dur: number; state: number | null; isYT: boolean; ended: boolean } => {
      const engine = activeEngineRef.current;
      const activeYT = engine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = engine === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = engine === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      if (activeIsYT && activeYT) {
        let current = currentTimeRef.current;
        let dur = durationRef.current;
        let state: number | null = null;
        try {
          if (typeof activeYT.getCurrentTime === 'function') current = activeYT.getCurrentTime();
          if (typeof activeYT.getDuration === 'function') dur = activeYT.getDuration() || dur;
          if (typeof activeYT.getPlayerState === 'function') state = activeYT.getPlayerState();
        } catch {
          /* ignore */
        }
        return {
          current,
          dur,
          state,
          isYT: true,
          ended: state === YT_ENDED || state === window.YT?.PlayerState?.ENDED,
        };
      }
      if (activeAudio) {
        return {
          current: activeAudio.currentTime,
          dur: activeAudio.duration || durationRef.current,
          state: null,
          isYT: false,
          ended: activeAudio.ended,
        };
      }
      return { current: currentTimeRef.current, dur: durationRef.current, state: null, isYT: false, ended: false };
    };

    const wakePlayback = async () => {
      if (document.visibilityState !== 'visible') return;

      // Drop any timers that Arc deferred during freeze so they can't double-fire with ENDED.
      clearEndWatch();
      await resumeGlobalAudioContext();
      if (!isPlayingRef.current) return;

      const clock = readClock();
      const nearEnd =
        clock.ended ||
        (clock.dur > 0 && clock.current >= clock.dur - 0.5);

      if (nearEnd && !isCrossfadingRef.current && !isTransitioningRef.current) {
        void handleNextSongRef.current();
        return;
      }

      const engine = activeEngineRef.current;
      const activeYT = engine === 'A' ? ytPlayerRefA.current : ytPlayerRefB.current;
      const activeAudio = engine === 'A' ? audioRefA.current : audioRefB.current;
      const activeIsYT = engine === 'A' ? isYouTubeRefA.current : isYouTubeRefB.current;
      const activeFadeVolume = engine === 'A' ? fadeVolumeA : fadeVolumeB;
      const activeFader = engine === 'A' ? faderRefA : faderRefB;

      if (activeIsYT && activeYT) {
        try {
          const state = clock.state;
          if (state === YT_PAUSED || state === window.YT?.PlayerState?.PAUSED) {
            if (typeof activeYT.playVideo === 'function') {
              activeYT.playVideo();
            }
          }
          if (activeFader.current < 0.5) {
            void activeFadeVolume(1, 300);
          }
          if (clock.dur > 0) scheduleEndWatch(clock.current, clock.dur);
        } catch {
          /* ignore */
        }
        return;
      }

      if (!activeAudio) return;

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
      if (clock.dur > 0) scheduleEndWatch(clock.current, clock.dur);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (!isPlayingRef.current || isCrossfadingRef.current) return;
        // Prefer last known UI clock — YT getCurrentTime is often frozen/wrong while hiding.
        const current = currentTimeRef.current;
        const dur = durationRef.current;
        if (dur > 0) scheduleEndWatch(current, dur);
        return;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void wakePlayback();
      }, 80);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fadeVolumeA, fadeVolumeB, faderRefA, faderRefB, scheduleEndWatch, clearEndWatch]);

  // Native ended via refs (React onEnded can see a stale activeEngine after long background).
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    const onEndedA = () => {
      if (isCrossfadingRef.current || isTransitioningRef.current) return;
      if (activeEngineRef.current !== 'A') return;
      void handleNextSongRef.current();
    };
    const onEndedB = () => {
      if (isCrossfadingRef.current || isTransitioningRef.current) return;
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

    // Relative controls for keyboard shortcuts (the core owns time and volume).
    const handleSeekByEvent = (e: Event) => {
      const delta = (e as CustomEvent<{ delta?: number }>).detail?.delta;
      if (typeof delta !== 'number' || durationRef.current <= 0) return;
      seekToAbsoluteTime(Math.max(0, Math.min(durationRef.current - 0.5, currentTimeRef.current + delta)));
    };
    const handleVolumeByEvent = (e: Event) => {
      const delta = (e as CustomEvent<{ delta?: number }>).detail?.delta;
      if (typeof delta !== 'number') return;
      handleVolumeChange(Math.max(0, Math.min(100, volumeRef.current + delta)));
    };
    const handleToggleMuteEvent = () => {
      if (volumeRef.current > 0) {
        handleVolumeChange(0);
      } else {
        const saved = parseInt(localStorage.getItem('elva_player_premute_volume') || '70', 10);
        handleVolumeChange(Number.isFinite(saved) && saved > 0 ? saved : 70);
      }
    };

    window.addEventListener('elva-seek-by', handleSeekByEvent);
    window.addEventListener('elva-volume-by', handleVolumeByEvent);
    window.addEventListener('elva-toggle-mute', handleToggleMuteEvent);
    window.addEventListener('elva-toggle-play', handleTogglePlayEvent);
    window.addEventListener('elva-play-next', handleNextSongEvent);
    window.addEventListener('elva-play-prev', handlePrevSongEvent);
    window.addEventListener('elva-seek', handleSeekEvent);
    window.addEventListener('elva-set-volume', handleSetVolumeEvent);

    return () => {
      window.removeEventListener('elva-seek-by', handleSeekByEvent);
      window.removeEventListener('elva-volume-by', handleVolumeByEvent);
      window.removeEventListener('elva-toggle-mute', handleToggleMuteEvent);
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
      clearEndWatch();
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
  }, [faderAnimationRefA, faderAnimationRefB, fadeResolveRefA, fadeResolveRefB, clearEndWatch]);

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
