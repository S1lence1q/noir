import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import 'sonner/dist/styles.css';

import { MusicPlayer } from './components/MusicPlayer';
import { OnboardingTour } from './components/OnboardingTour';
import { AccentColor, ACCENT_THEMES } from './components/themeUtils';

import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { FluidBackground } from './components/FluidBackground';
import { showMiniHUD } from './utils/hudUtils';
import { SearchResult, VerifiedArtist } from './types';
import { getDynamicFallbackColors, extractColorsFromImage } from './utils/playerColorUtils';
import { executeSearchAPI, executeChannelUploadsAPI } from './utils/apiUtils';
import { resolveYouTubeForChartTrack } from './utils/chartPlaybackUtils';
import { isLikelyMusicVideoStream } from './utils/apiUtils';
import { prefetchChartTracks } from './utils/chartPrefetch';
import { parseLocalMetadata } from './utils/metadataParser';
import { getPlaybackSongKey } from './utils/playbackSongKey';
import { isTrackFavorite } from './utils/favoriteUtils';
import { restoreLocalTrack, saveLocalTrack } from './utils/localTrackStorage';
import { strings } from './constants/strings';
import { waitForYouTubeApi } from './utils/youtubeApiReady';
import { addTrackToPlaylist, createPlaylist, readPlaylists } from './utils/playlistStore';
import { displayArtistName } from './utils/stringUtils';
import { hasRealArtwork, youtubeThumb } from './utils/artwork';
import { getTrackImage } from './services/musicGraph';

// Import newly extracted hooks and components
import { useScrollTracking } from './hooks/useScrollTracking';
import { useBackgroundColors } from './hooks/useBackgroundColors';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSearchLogic } from './hooks/useSearchLogic';
import { useListeningRecorder } from './hooks/useListeningRecorder';
import { LandingPage } from './components/LandingPage';
import { Playlist } from './components/PlaylistDetailsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/shell/AppShell';
import { ShellPlaybackState } from './components/shell/types';
import { NoirNowPlayingView } from './components/shell/noir/NoirNowPlayingView';
import { NoirToastHost, noirToast } from './components/shell/noir/NoirToast';
import { NoirSearchPalette } from './components/shell/noir/NoirSearchPalette';
import { NoirSongMenuHost } from './components/SongRowOptions';
import {
  buildAutoplayTracks,
  buildRadioTracks,
  radioStationLabel,
} from './services/radio/buildRadio';
type AppState = 'landing' | 'processing' | 'ready';
// landing = shell, processing = resolving a track. `ready` is unused (fullscreen player is parked).

function dedupeRecentlyPlayed(list: SearchResult[]) {
  const seen = new Set<string>();
  return list
    .filter((item) => {
      const localKey = `${item.title.trim().toLowerCase()}::${item.artist.trim().toLowerCase()}`;
      const isLocal = item.id.startsWith('local_') || item.audioUrl?.startsWith('blob:');
      const key =
        (isLocal ? `local:${localKey}` : '') ||
        item.videoId?.trim() ||
        item.audioUrl?.trim() ||
        localKey;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

async function hydrateLocalTracks(list: SearchResult[]) {
  const hydrated = await Promise.all(
    list.map(async (item) => {
      const isLocal = item.id.startsWith('local_') || item.audioUrl?.startsWith('blob:');
      if (!isLocal) return item;

      const storageKey = item.id.startsWith('local_') ? item.id : item.audioUrl || item.id;
      const audioUrl = await restoreLocalTrack(storageKey).catch(() => null);
      return audioUrl ? { ...item, audioUrl } : null;
    })
  );
  return hydrated.filter((item): item is SearchResult => item !== null);
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  // Settings is now a tab in the shell, not a modal

  const [navMode, setNavMode] = useState<'tabs' | 'scroll'>(() => {
    return (localStorage.getItem('elva_nav_mode') as 'tabs' | 'scroll') || 'tabs';
  });
  const [navPosition, setNavPosition] = useState<'bottom' | 'top' | 'right'>(() => {
    return (localStorage.getItem('elva_nav_position') as 'bottom' | 'top' | 'right') || 'bottom';
  });

  const handleSetNavMode = (mode: 'tabs' | 'scroll') => {
    if (mode === 'scroll') {
      isAutoScrollingRef.current = true;
      if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
      
      setNavMode(mode);
      
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const index = activeTab === 'search' ? 0 : activeTab === 'discover' ? 1 : 2;
          const height = container.clientHeight || window.innerHeight;
          container.scrollTop = index * height;
        }
        isAutoScrollingRef.current = false;
      }, 50);
    } else {
      setNavMode(mode);
      if (navPosition === 'right') {
        setNavPosition('bottom');
      }
    }
  };

  const [activeTab, setActiveTabState] = useState<'search' | 'discover' | 'myhub' | 'settings'>('search');
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [isMiniPlaying, setIsMiniPlaying] = useState(true);
  const [shellPlayback, setShellPlayback] = useState<ShellPlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: true,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Scroll Tracking Hook
  const { scrollProgress, scrollVelocity, handleScroll } = useScrollTracking(activeTab, navMode, scrollContainerRef);

  // Synchronize scroll container position before paint when switching to scroll mode
  useLayoutEffect(() => {
    if (navMode === 'scroll') {
      const container = scrollContainerRef.current;
      if (container) {
        const index = activeTab === 'search' ? 0 : activeTab === 'discover' ? 1 : 2;
        const height = container.clientHeight || window.innerHeight;
        container.scrollTop = index * height;
      }
    }
  }, [navMode]);

  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<any>(null);

  const setActiveTab = (tab: 'search' | 'discover' | 'myhub' | 'settings') => {
    setNowPlayingOpen(false);
    setSelectedPlaylist(null);
    setActiveTabState(tab);
    const shellActive = appState === 'landing' || appState === 'processing' || appState === 'ready';
    if (navMode === 'scroll' && !shellActive) {
      const container = scrollContainerRef.current;
      if (container) {
        isAutoScrollingRef.current = true;
        if (autoScrollTimeoutRef.current) clearTimeout(autoScrollTimeoutRef.current);
        
        const index = tab === 'search' ? 0 : tab === 'discover' ? 1 : 2;
        container.scrollTo({
          top: index * container.clientHeight,
          behavior: 'smooth',
        });
        
        autoScrollTimeoutRef.current = setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, 800);
      }
    }
  };

  // Scroll spy for scroll-snap mode (legacy landing only — shell uses sidebar tabs)
  useEffect(() => {
    if (navMode !== 'scroll') return;
    if (appState === 'landing' || appState === 'processing') return;
    if (isAutoScrollingRef.current) return;

    let targetTab: 'search' | 'discover' | 'myhub' = 'search';
    if (scrollProgress < 0.25) {
      targetTab = 'search';
    } else if (scrollProgress >= 0.25 && scrollProgress <= 0.75) {
      targetTab = 'discover';
    } else {
      targetTab = 'myhub';
    }

    if (activeTab !== targetTab) {
      setActiveTabState(targetTab);
    }
  }, [scrollProgress, navMode, activeTab, appState]);

  const [favorites, setFavorites] = useState<SearchResult[]>(() => {
    try {
      const stored = localStorage.getItem('elva_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = localStorage.getItem('elva_favorites');
      const current: SearchResult[] = stored ? JSON.parse(stored) : [];
      const hydrated = await hydrateLocalTracks(current);
      if (cancelled) return;
      setFavorites(hydrated);
      localStorage.setItem('elva_favorites', JSON.stringify(hydrated));
    })().catch(() => {
      // Keep the persisted favorite entries if local media storage is unavailable.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [isIntroActive, setIsIntroActive] = useState(() => {
    const hasSeenIntro = sessionStorage.getItem('elva_intro_seen');
    return !hasSeenIntro;
  });

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [libraryFocus, setLibraryFocus] = useState<{
    section: 'favorites' | 'playlists';
    playlistId: string | null;
    requestId: number;
  }>({ section: 'favorites', playlistId: null, requestId: 0 });
  const [libraryOpenPlaylistId, setLibraryOpenPlaylistId] = useState<string | null>(null);

  const [resolvedVideoIds, setResolvedVideoIds] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('elva_resolved_video_ids');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [queue, setQueue] = useState<SearchResult[]>([]);
  const [songData, setSongData] = useState<{
    id?: string;
    title: string;
    artist: string;
    artworkUrl: string;
    audioUrl: string;
    videoId?: string;
    channelId?: string;
  } | null>(null);
  useListeningRecorder(songData, shellPlayback);

  const backToHomeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [colorsSongData, setColorsSongData] = useState<any>(null);
  const colorsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [songColors, setSongColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  const [colorTransitionDuration, setColorTransitionDuration] = useState<number>(1.2);
  const colorTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);

  const resolvedVideoIdsRef = useRef(resolvedVideoIds);
  const queueRef = useRef(queue);
  const prefetchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    resolvedVideoIdsRef.current = resolvedVideoIds;
  }, [resolvedVideoIds]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Lifted Settings States
  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    return (localStorage.getItem('elva_accent_color') as AccentColor) || 'emerald';
  });

  const [textureStyle, setTextureStyle] = useState<'paper' | 'dots' | 'none'>(() => {
    return (localStorage.getItem('elva_texture_style') as 'paper' | 'dots' | 'none') || 'paper';
  });

  const [backgroundStyle, setBackgroundStyle] = useState<'default' | 'particles' | 'liquid' | 'mesh'>(() => {
    return (localStorage.getItem('elva_bg_style') as 'default' | 'particles' | 'liquid' | 'mesh') || 'mesh';
  });

  const [zenMode, setZenMode] = useState(() => {
    return localStorage.getItem('elva_zen_mode') === 'true';
  });

  const [showVolumeSlider, setShowVolumeSlider] = useState(() => {
    return localStorage.getItem('elva_volume_slider') === 'true';
  });

  const [enable3DTilt, setEnable3DTilt] = useState(() => {
    return localStorage.getItem('elva_3d_tilt') !== 'false';
  });

  const [showSettingsButton, setShowSettingsButton] = useState(() => {
    return localStorage.getItem('elva_show_settings_btn') === 'true';
  });

  const [enableCustomLyrics, setEnableCustomLyrics] = useState(() => {
    return localStorage.getItem('elva_enable_custom_lyrics') === 'true';
  });

  const [showVisualizer, setShowVisualizer] = useState(() => {
    return localStorage.getItem('elva_show_visualizer') === 'true';
  });

  const [peekProgressStyle, setPeekProgressStyle] = useState<'none' | 'line' | 'border'>(() => {
    return (localStorage.getItem('elva_peek_progress_style') as 'none' | 'line' | 'border') || 'border';
  });


  // Sync settings to localStorage on change
  useEffect(() => {
    localStorage.setItem('elva_accent_color', accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('elva_texture_style', textureStyle);
  }, [textureStyle]);

  useEffect(() => {
    localStorage.setItem('elva_bg_style', backgroundStyle);
  }, [backgroundStyle]);

  useEffect(() => {
    localStorage.setItem('elva_zen_mode', zenMode ? 'true' : 'false');
  }, [zenMode]);

  useEffect(() => {
    localStorage.setItem('elva_volume_slider', showVolumeSlider ? 'true' : 'false');
  }, [showVolumeSlider]);

  useEffect(() => {
    localStorage.setItem('elva_3d_tilt', enable3DTilt ? 'true' : 'false');
  }, [enable3DTilt]);

  useEffect(() => {
    localStorage.setItem('elva_show_settings_btn', showSettingsButton ? 'true' : 'false');
  }, [showSettingsButton]);

  useEffect(() => {
    localStorage.setItem('elva_enable_custom_lyrics', enableCustomLyrics ? 'true' : 'false');
  }, [enableCustomLyrics]);

  useEffect(() => {
    localStorage.setItem('elva_show_visualizer', showVisualizer ? 'true' : 'false');
  }, [showVisualizer]);

  useEffect(() => {
    localStorage.setItem('elva_peek_progress_style', peekProgressStyle);
  }, [peekProgressStyle]);

  useEffect(() => {
    localStorage.setItem('elva_nav_mode', navMode);
  }, [navMode]);

  useEffect(() => {
    localStorage.setItem('elva_nav_position', navPosition);
  }, [navPosition]);


  // Onboarding Tour State
  const [tourType, setTourType] = useState<'landing' | 'player' | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [tourTransitioning, setTourTransitioning] = useState(false);
  const tourBusyRef = useRef(false);
  const [hasSeenTour, setHasSeenTour] = useState(() => localStorage.getItem('elva_tour_completed') === 'true');
  const [showShortcutMap, setShowShortcutMap] = useState(false);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);

  useEffect(() => {
    const handleToggleShortcuts = () => setShowShortcutMap(true);
    window.addEventListener('elva-show-shortcuts', handleToggleShortcuts);
    return () => window.removeEventListener('elva-show-shortcuts', handleToggleShortcuts);
  }, []);
  const [recentlyPlayed, setRecentlyPlayed] = useState<SearchResult[]>(() => {
    try {
      const stored = localStorage.getItem('elva_recently_played');
      const list: SearchResult[] = stored ? JSON.parse(stored) : [];
      const resolvedRaw = localStorage.getItem('elva_resolved_video_ids');
      const resolved: Record<string, string> = resolvedRaw ? JSON.parse(resolvedRaw) : {};
      return dedupeRecentlyPlayed(list.map((item) => ({
        ...item,
        videoId: item.videoId || resolved[item.id] || '',
      })));
    } catch (e) {
      console.warn('Failed to load recently played tracks:', e);
      return [];
    }
  });

  useEffect(() => {
    const handleRecentlyPlayedCleared = () => setRecentlyPlayed([]);
    window.addEventListener('elva-recently-played-cleared', handleRecentlyPlayedCleared);
    return () => window.removeEventListener('elva-recently-played-cleared', handleRecentlyPlayedCleared);
  }, []);

  useEffect(() => {
    setRecentlyPlayed((current) => {
      const cleaned = dedupeRecentlyPlayed(current);
      localStorage.setItem('elva_recently_played', JSON.stringify(cleaned));
      return cleaned;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = localStorage.getItem('elva_recently_played');
      const current: SearchResult[] = stored ? JSON.parse(stored) : [];
      const hydrated = await hydrateLocalTracks(current);
      if (cancelled) return;
      const cleaned = dedupeRecentlyPlayed(hydrated);
      setRecentlyPlayed(cleaned);
      localStorage.setItem('elva_recently_played', JSON.stringify(cleaned));
    })().catch(() => {
      // Keep the in-memory history if local media storage is unavailable.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [isFirstVisit, setIsFirstVisit] = useState(() => !sessionStorage.getItem('elva_intro_seen'));
  const hasSelectedArtistOnce = useRef(false);
  const latestSelectedSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    void waitForYouTubeApi();
  }, []);

  // 2. Background Colors Hook
  const bgColors = useBackgroundColors(songColors, appState, colorsSongData, scrollProgress);

  // Global mouse position tracking for visual grid effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  const handleToggleFavorite = (song: SearchResult) => {
    setFavorites((prev) => {
      const exists = prev.some(
        (item) =>
          item.id === song.id ||
          (!!song.videoId && (item.videoId === song.videoId || item.id === song.videoId))
      );
      let updated;
      if (exists) {
        updated = prev.filter(
          (item) =>
            item.id !== song.id &&
            !(song.videoId && (item.videoId === song.videoId || item.id === song.videoId))
        );
        noirToast({ text: strings.songMenu.removedFromFavorites, cover: song.thumbnail });
      } else {
        updated = [...prev, song];
        noirToast({ text: strings.songMenu.addedToFavorites, cover: song.thumbnail });
      }
      localStorage.setItem('elva_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const saveRecentlyPlayed = (song: SearchResult) => {
    try {
      const stored = localStorage.getItem('elva_recently_played');
      let list: SearchResult[] = stored ? JSON.parse(stored) : [];
      list = dedupeRecentlyPlayed([song, ...list]);
      localStorage.setItem('elva_recently_played', JSON.stringify(list));
      setRecentlyPlayed(list);
    } catch (e) {
      console.warn('Failed to save recently played track:', e);
    }
  };

  const handleDropSongToPlaylist = (playlistId: string, track: SearchResult) => {
    const playlist = readPlaylists().find((item) => item.id === playlistId);
    if (!playlist || !addTrackToPlaylist(playlistId, track)) return;
    noirToast({
      text: strings.playlist.addedTo(playlist.name),
      cover: track.thumbnail,
    });
  };

  const handleFileSelectRef = useRef<(e: React.ChangeEvent<HTMLInputElement>) => void>(() => {});

  const persistResolvedVideoId = (trackId: string, videoId: string, thumbnail?: string) => {
    setResolvedVideoIds((prev) => {
      const next = { ...prev, [trackId]: videoId };
      localStorage.setItem('elva_resolved_video_ids', JSON.stringify(next));
      return next;
    });
    setQueue((prev) =>
      prev.map((item) =>
        item.id === trackId
          ? {
              ...item,
              videoId,
              ...(thumbnail ? { thumbnail } : {}),
            }
          : item
      )
    );
  };

  const startQueuePrefetch = (tracks: SearchResult[], skipTrackId?: string) => {
    prefetchAbortRef.current?.abort();
    const controller = new AbortController();
    prefetchAbortRef.current = controller;

    void prefetchChartTracks(
      tracks,
      (id) => resolvedVideoIdsRef.current[id],
      ({ trackId, videoId, thumbnail }) => {
        if (controller.signal.aborted) return;
        persistResolvedVideoId(trackId, videoId, thumbnail);
      },
      {
        concurrency: 2,
        signal: controller.signal,
        skipTrackIds: skipTrackId ? new Set([skipTrackId]) : undefined,
      }
    );
  };

  const ensureTrackInQueue = (track: SearchResult) => {
    setQueue((prev) => {
      const key = getPlaybackSongKey(track);
      const existingIndex = prev.findIndex(
        (item) => item.id === track.id || (key !== null && getPlaybackSongKey(item) === key)
      );
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (track.videoId && track.videoId !== existing.videoId) {
          const next = [...prev];
          next[existingIndex] = { ...existing, ...track, videoId: track.videoId };
          return next;
        }
        return prev;
      }
      return [...prev, track];
    });
  };

  const handleSelectSong = async (result: SearchResult, isCrossfade?: boolean) => {
    const startingAppState = appState;
    const hadActiveSong = !!songData;
    latestSelectedSongIdRef.current = result.id;
    const isLocal = !!(result.audioUrl?.startsWith('blob:') || result.id?.startsWith('local_'));
    const latestId = latestSelectedSongIdRef.current;
    const queuedMatch = queueRef.current.find((item) => item.id === result.id);
    const hadCachedVideoId = !!(result.videoId || resolvedVideoIdsRef.current[result.id] || queuedMatch?.videoId);
    let finalVideoId = isLocal
      ? ''
      : (result.videoId || resolvedVideoIdsRef.current[result.id] || queuedMatch?.videoId || '');
    let finalArtwork = hasRealArtwork(result.thumbnail) ? result.thumbnail : '';
    if (!finalArtwork) {
      finalArtwork = youtubeThumb(finalVideoId, 'hq') || '';
    }
    if (!finalArtwork && !isLocal) {
      try {
        const fetched = await getTrackImage(result.title, result.artist);
        if (fetched) finalArtwork = fetched;
      } catch {
        /* optional */
      }
    }
    let neededResolve = !isLocal && !finalVideoId;
    const needsAudioSwap =
      !isLocal && !!finalVideoId && isLikelyMusicVideoStream(result);

    // Crossfade path: metadata/colors only — playback stays on dual-engine crossfader
    if (isCrossfade && (startingAppState === 'ready' || startingAppState === 'landing')) {
      if (!isLocal && !finalVideoId) {
        console.warn('Crossfade skipped: missing videoId for', result.title);
        return;
      }

      const saved = localStorage.getItem('elva_crossfade_duration');
      const crossfadeWindow = saved !== null ? parseFloat(saved) : 3.0;
      setColorTransitionDuration(crossfadeWindow);
      if (colorTransitionTimeoutRef.current) {
        clearTimeout(colorTransitionTimeoutRef.current);
      }
      colorTransitionTimeoutRef.current = setTimeout(() => {
        setColorTransitionDuration(1.2);
      }, crossfadeWindow * 1000);

      const fallbacks = getDynamicFallbackColors(result.title, result.artist);

      setSongData({
        id: result.id,
        title: result.title,
        artist: displayArtistName(result.artist),
        artworkUrl: finalArtwork,
        audioUrl: isLocal ? (result.audioUrl || '') : `https://www.youtube.com/watch?v=${finalVideoId}`,
        videoId: finalVideoId,
        channelId: result.channelId,
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      if (
        finalArtwork &&
        (finalArtwork.includes('ytimg.com') ||
          finalArtwork.includes('youtube.com') ||
          finalArtwork.startsWith('http'))
      ) {
        img.src = `https://images.weserv.nl/?url=${encodeURIComponent(finalArtwork)}`;
      } else {
        img.src = finalArtwork;
      }
      img.onload = () => {
        if (latestSelectedSongIdRef.current !== latestId) return;
        const extracted = extractColorsFromImage(img, result.title, result.artist);
        setSongColors(extracted);
      };
      img.onerror = () => {
        if (latestSelectedSongIdRef.current !== latestId) return;
        setSongColors(fallbacks);
      };
      return;
    }

    if (!isLocal) {
      await waitForYouTubeApi();
    }

    if (!isLocal && (neededResolve || needsAudioSwap)) {
      setLoadingSongId(result.id);
      if (!hadActiveSong) {
        setAppState('processing');
      }
      try {
        const resolved = await resolveYouTubeForChartTrack(
          needsAudioSwap ? { ...result, videoId: '' } : result
        );
        if (latestSelectedSongIdRef.current !== latestId) return;
        if (resolved?.videoId) {
          finalVideoId = resolved.videoId;
          finalArtwork = hasRealArtwork(resolved.thumbnail)
            ? resolved.thumbnail
            : youtubeThumb(resolved.videoId, 'hq') || finalArtwork;
          persistResolvedVideoId(result.id, finalVideoId, finalArtwork || resolved.thumbnail);
          startQueuePrefetch(queueRef.current, result.id);
        } else {
          toast.error('Could not play song', {
            description: `No verified YouTube match for "${result.title}". Try searching the song directly.`,
          });
          setLoadingSongId(null);
          setAppState('landing');
          return;
        }
      } catch (e) {
        console.error('Failed to dynamically resolve YouTube video ID:', e);
        toast.error('Playback error', {
          description: 'Could not retrieve the audio stream for this song.',
        });
        setLoadingSongId(null);
        setAppState('landing');
        return;
      }
    }

    const queueTrack: SearchResult = {
      ...result,
      videoId: finalVideoId,
      thumbnail: finalArtwork,
    };

    saveRecentlyPlayed(queueTrack);
    ensureTrackInQueue(queueTrack);

    if (isCrossfade) {
      const saved = localStorage.getItem('elva_crossfade_duration');
      const crossfadeWindow = saved !== null ? parseFloat(saved) : 3.0;
      setColorTransitionDuration(crossfadeWindow);

      if (colorTransitionTimeoutRef.current) {
        clearTimeout(colorTransitionTimeoutRef.current);
      }
      colorTransitionTimeoutRef.current = setTimeout(() => {
        setColorTransitionDuration(1.2);
      }, crossfadeWindow * 1000);
    } else {
      setColorTransitionDuration(1.2);
      if (colorTransitionTimeoutRef.current) {
        clearTimeout(colorTransitionTimeoutRef.current);
      }
    }

    if (hadActiveSong) {
      setSongData({
        id: result.id,
        title: result.title,
        artist: displayArtistName(result.artist),
        artworkUrl: finalArtwork,
        audioUrl: isLocal ? (result.audioUrl || '') : `https://www.youtube.com/watch?v=${finalVideoId}`,
        videoId: finalVideoId,
        channelId: result.channelId
      });
      setAppState('landing');
      setLoadingSongId(null);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      if (finalArtwork && (finalArtwork.includes('ytimg.com') || finalArtwork.includes('youtube.com') || finalArtwork.startsWith('http'))) {
        img.src = `https://images.weserv.nl/?url=${encodeURIComponent(finalArtwork)}`;
      } else {
        img.src = finalArtwork;
      }
      img.onload = () => {
        if (latestSelectedSongIdRef.current !== latestId) return;
        const extracted = extractColorsFromImage(img, result.title, result.artist);
        setSongColors(extracted);
      };
      img.onerror = () => {
        if (latestSelectedSongIdRef.current !== latestId) return;
        setSongColors(getDynamicFallbackColors(result.title, result.artist));
      };

      return;
    }

    setLoadingSongId(result.id);
    setAppState('processing');

    const startTime = Date.now();
    const minDisplayTime = neededResolve || needsAudioSwap || hadCachedVideoId ? 0 : 500;
    const fallbacks = getDynamicFallbackColors(result.title, result.artist);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    if (finalArtwork && (finalArtwork.includes('ytimg.com') || finalArtwork.includes('youtube.com') || finalArtwork.startsWith('http'))) {
      img.src = `https://images.weserv.nl/?url=${encodeURIComponent(finalArtwork)}`;
    } else {
      img.src = finalArtwork;
    }

    const proceedToReady = () => {
      if (latestSelectedSongIdRef.current !== latestId) return;
      const extracted = img.complete && img.naturalWidth > 0
        ? extractColorsFromImage(img, result.title, result.artist)
        : fallbacks;
      setSongColors(extracted);

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      setTimeout(() => {
        if (latestSelectedSongIdRef.current !== latestId) return;
        setSongData({
          id: result.id,
          title: result.title,
          artist: displayArtistName(result.artist),
          artworkUrl: finalArtwork,
          audioUrl: isLocal ? (result.audioUrl || '') : `https://www.youtube.com/watch?v=${finalVideoId}`,
          videoId: finalVideoId,
          channelId: result.channelId
        });
        setAppState('landing');
        setLoadingSongId(null);
      }, remainingTime);
    };

    img.onload = proceedToReady;
    img.onerror = proceedToReady;
  };

  const playLocalFile = async (file: File) => {
    const meta = await parseLocalMetadata(file);
    const localId = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const audioUrl = URL.createObjectURL(file);
    const fileResult: SearchResult = {
      id: localId,
      title: meta.title,
      artist: meta.artist,
      thumbnail: meta.artworkUrl,
      audioUrl,
      videoId: '',
    };
    await Promise.allSettled([
      saveLocalTrack(localId, file),
      saveLocalTrack(audioUrl, file),
    ]);
    await handleSelectSong(fileResult);
  };

  handleFileSelectRef.current = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await playLocalFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFileSelectRef.current(e);
  };

  const handleAddToQueue = (result: SearchResult, options?: { silent?: boolean }) => {
    const key = getPlaybackSongKey(result);
    const activeKey = songData ? getPlaybackSongKey(songData) : null;
    const activeIndex = activeKey
      ? queue.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    const pendingStart = activeIndex >= 0 ? activeIndex : 0;
    const exists = queue.some(
      (item, index) =>
        index >= pendingStart &&
        (item.id === result.id || (key !== null && getPlaybackSongKey(item) === key))
    );
    if (exists) {
      if (!options?.silent) {
        toast.error(strings.songMenu.alreadyInQueue, { description: result.title });
      }
      return;
    }

    setQueue((prev) => {
      if (prev.some((item) => item.id === result.id || (key !== null && getPlaybackSongKey(item) === key))) {
        return prev;
      }
      return [...prev, result];
    });
    if (!options?.silent) {
      noirToast({
        text: strings.songMenu.addedToQueue,
        cover: result.thumbnail,
        action: {
          label: strings.songMenu.undo,
          onClick: () => setQueue((prev) => prev.filter((item) => item.id !== result.id)),
        },
      });
    }
  };

  const handlePlayPlaylist = async (
    tracks: SearchResult[],
    label?: string,
    startIndex = 0
  ) => {
    if (tracks.length === 0) return;

    const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    setQueue(tracks);
    startQueuePrefetch(tracks, tracks[index].id);
    await handleSelectSong(tracks[index]);

    const upNext = tracks.length - index - 1;
    if (label && upNext > 0) {
      showMiniHUD(`Playing ${label} · ${upNext} up next`, 'success');
    } else if (label) {
      showMiniHUD(`Playing ${label}`, 'success');
    } else if (upNext > 0) {
      showMiniHUD(`${upNext} up next`, 'success');
    } else {
      showMiniHUD('Playing', 'success');
    }
  };

  const songDataAsSearchResult = (): SearchResult | null => {
    if (!songData) return null;
    return {
      id: songData.id || songData.videoId || songData.audioUrl || `${songData.title}-${songData.artist}`,
      title: songData.title,
      artist: songData.artist,
      thumbnail: songData.artworkUrl,
      videoId: songData.videoId || '',
      audioUrl: songData.audioUrl,
      channelId: songData.channelId,
    };
  };

  const handleStartRadio = async (seed: SearchResult) => {
    noirToast({ text: strings.radio.starting, cover: seed.thumbnail });
    try {
      const exclude = queue
        .map((item) => getPlaybackSongKey(item) || `${item.artist}::${item.title}`)
        .filter(Boolean) as string[];
      const radioTracks = await buildRadioTracks(seed, { limit: 24, excludeKeys: exclude });
      if (radioTracks.length === 0) {
        noirToast({ text: strings.radio.empty });
        return;
      }
      const station = [seed, ...radioTracks.filter((track) => track.id !== seed.id)];
      await handlePlayPlaylist(station, radioStationLabel(seed.artist));
      noirToast({
        text: strings.radio.started(seed.artist),
        cover: seed.thumbnail,
      });
    } catch (error) {
      console.warn('[radio] Start radio failed', error);
      noirToast({ text: strings.radio.failed });
    }
  };

  const handleStartRadioFromPlayer = () => {
    const seed = songDataAsSearchResult();
    if (seed) void handleStartRadio(seed);
  };

  const handleAppendRadio = async (seed: SearchResult) => {
    try {
      const exclude = queue
        .map((item) => getPlaybackSongKey(item) || `${item.artist}::${item.title}`)
        .filter(Boolean) as string[];
      const radioTracks = await buildAutoplayTracks(seed, exclude);
      if (radioTracks.length === 0) {
        noirToast({ text: strings.radio.empty });
        return;
      }
      radioTracks.forEach((track) => handleAddToQueue(track, { silent: true }));
      noirToast({
        text: strings.nextUp.addedMany(radioTracks.length),
        cover: radioTracks[0]?.thumbnail || seed.thumbnail,
      });
    } catch (error) {
      console.warn('[radio] Autoplay append failed', error);
      noirToast({ text: strings.radio.failed });
    }
  };

  // 3. Search and Artist Profiles Logic Hook
  const searchLogic = useSearchLogic({
    setAppState,
    setSongData,
    setColorsSongData,
    setQueue,
    saveRecentlyPlayed,
    handleSelectSong,
    handleAddToQueue,
    appState,
    songData,
    tourType,
    tourStep,
    setTourStep
  });

  // Share select state back with hoisting reference
  const verifiedArtist = searchLogic.verifiedArtist;
  const selectedArtist = searchLogic.selectedArtist;
  const artistTracks = searchLogic.artistTracks;
  const isLoadingArtist = searchLogic.isLoadingArtist;
  const focusedResultIndex = searchLogic.focusedResultIndex;
  const setFocusedResultIndex = searchLogic.setFocusedResultIndex;

  const handleNewPlaylist = () => {
    const playlist = createPlaylist();
    setLibraryFocus((prev) => ({
      section: 'playlists',
      playlistId: playlist.id,
      requestId: prev.requestId + 1,
    }));
    setActiveTab('myhub');
  };

  useEffect(() => {
    const open = () => setSearchPaletteOpen(true);
    window.addEventListener('elva-open-search-palette', open);
    return () => window.removeEventListener('elva-open-search-palette', open);
  }, []);

  // Tab changes dismiss detail overlays (playlist/chart/artist)
  useEffect(() => {
    searchLogic.setSelectedArtist(null);
    searchLogic.setArtistCandidates?.(null);
  }, [activeTab, searchLogic.setSelectedArtist, searchLogic.setArtistCandidates]);

  /** Open artist profile: close Now Playing / palette so the overlay is visible. */
  const openArtistProfile = (artist: Parameters<typeof searchLogic.handleViewArtistProfile>[0]) => {
    setNowPlayingOpen(false);
    setSearchPaletteOpen(false);
    void searchLogic.handleViewArtistProfile(artist);
  };
  const openArtistByName = (name: string, channelId?: string) => {
    setNowPlayingOpen(false);
    setSearchPaletteOpen(false);
    void searchLogic.handleViewArtistByName(name, channelId);
  };
  const openArtistFromPlayer = () => {
    if (!songData?.artist) return;
    openArtistByName(songData.artist, songData.channelId);
  };

  // Track search interactions to trigger guide variations
  if (selectedArtist) {
    hasSelectedArtistOnce.current = true;
  }

  // 4. Keyboard Navigation Hook
  useKeyboardShortcuts({
    appState,
    nowPlayingOpen,
    setNowPlayingOpen,
    hasActiveSong: !!songData,
    searchQuery: searchLogic.searchQuery,
    lastSearchedQuery: searchLogic.lastSearchedQuery,
    isSearching: searchLogic.isSearching,
    searchResults: searchLogic.searchResults,
    selectedArtist,
    artistTracks,
    verifiedArtist,
    loadingSongId,
    focusedResultIndex,
    setFocusedResultIndex: searchLogic.setFocusedResultIndex,
    setSearchQuery: searchLogic.setSearchQuery,
    setSelectedArtist: searchLogic.setSelectedArtist,
    setArtistTracks: searchLogic.setArtistTracks,
    handleSelectSong,
    handleViewArtistProfile: openArtistProfile,
    showShortcutMap,
    setShowShortcutMap,
    activeTab,
    setActiveTab,
    selectedPlaylist,
    setSelectedPlaylist,
    onOpenSearchPalette: () => setSearchPaletteOpen(true),
    onNewPlaylist: handleNewPlaylist,
  });

  useEffect(() => {
    const handleScrollToHub = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetTab = customEvent.detail?.tab;
      if (targetTab) {
        sessionStorage.setItem('elva_hub_active_tab', targetTab);
      }
      setAppState('landing');
      searchLogic.setSelectedArtist(null);
      setSelectedPlaylist(null);
      setActiveTab('myhub');
    };
    window.addEventListener('elva-scroll-to-hub', handleScrollToHub);
    return () => window.removeEventListener('elva-scroll-to-hub', handleScrollToHub);
  }, [searchLogic]);

  useEffect(() => {
    const handleScrollToDiscover = () => {
      setAppState('landing');
      searchLogic.setSelectedArtist(null);
      setSelectedPlaylist(null);
      setActiveTab('discover');
    };
    window.addEventListener('elva-scroll-to-discover', handleScrollToDiscover);
    return () => window.removeEventListener('elva-scroll-to-discover', handleScrollToDiscover);
  }, [searchLogic]);

  useEffect(() => {
    const handleResetTour = () => {
      setHasSeenTour(false);
      localStorage.removeItem('elva_tour_completed');
      localStorage.removeItem('elva_player_tour_completed');
    };

    window.addEventListener('elva-reset-tour', handleResetTour);
    return () => window.removeEventListener('elva-reset-tour', handleResetTour);
  }, []);

  const openLibraryFavorites = () => {
    setLibraryFocus((prev) => ({
      section: 'favorites',
      playlistId: null,
      requestId: prev.requestId + 1,
    }));
    setActiveTab('myhub');
  };

  const openLibraryPlaylist = (playlistId: string) => {
    setLibraryFocus((prev) => ({
      section: 'playlists',
      playlistId,
      requestId: prev.requestId + 1,
    }));
    setActiveTab('myhub');
  };

  // Home shelves open Library destinations without prop-drilling through LandingPage.
  useEffect(() => {
    const onOpenFavorites = () => {
      setLibraryFocus((prev) => ({ section: 'favorites', playlistId: null, requestId: prev.requestId + 1 }));
      setActiveTab('myhub');
    };
    const onOpenPlaylist = (e: Event) => {
      const playlistId = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (!playlistId) return;
      setLibraryFocus((prev) => ({ section: 'playlists', playlistId, requestId: prev.requestId + 1 }));
      setActiveTab('myhub');
    };
    window.addEventListener('noir-open-favorites', onOpenFavorites);
    window.addEventListener('noir-open-playlist', onOpenPlaylist);
    return () => {
      window.removeEventListener('noir-open-favorites', onOpenFavorites);
      window.removeEventListener('noir-open-playlist', onOpenPlaylist);
    };
  }, []);

  const scrollToLandingSection = (index: number) => {
    const tab = index === 0 ? 'search' : index === 1 ? 'discover' : 'myhub';
    setActiveTab(tab);
  };

  const startTour = () => {
    localStorage.removeItem('elva_tour_completed');
    localStorage.removeItem('elva_player_tour_completed');
    setHasSeenTour(false);
    setAppState('landing');
    setTourTransitioning(false);
    tourBusyRef.current = false;
    scrollToLandingSection(0);
    setTourType('landing');
    setTourStep(0);
  };

  const tourScrollToSection = async (index: number) => {
    const tab = index === 0 ? 'search' : index === 1 ? 'discover' : 'myhub';
    setActiveTab(tab);
    const waitTime = navMode === 'scroll' ? 850 : 300;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  };

  const dismissTour = () => {
    localStorage.setItem('elva_tour_completed', 'true');
    localStorage.setItem('elva_player_tour_completed', 'true');
    setHasSeenTour(true);
  };

  const handleTourNext = async () => {
    if (tourBusyRef.current) return;
    tourBusyRef.current = true;

    if (tourStep === 0) {
      setTourTransitioning(true);
      await tourScrollToSection(1);
      setTourStep(1);
      setTourTransitioning(false);
    } else if (tourStep === 1) {
      setTourTransitioning(true);
      await tourScrollToSection(2);
      setTourStep(2);
      setTourTransitioning(false);
    } else if (tourStep === 2) {
      setTourTransitioning(true);
      await tourScrollToSection(0);
      setTourType(null);
      setTourStep(0);
      setTourTransitioning(false);
      localStorage.setItem('elva_tour_completed', 'true');
      setHasSeenTour(true);
      toast.success(strings.tour.completed, {
        description: strings.tour.completedDesc,
      });
    }

    tourBusyRef.current = false;
  };

  const handleTourBack = async () => {
    if (tourBusyRef.current) return;
    tourBusyRef.current = true;

    if (tourStep === 1) {
      setTourTransitioning(true);
      await tourScrollToSection(0);
      setTourStep(0);
      setTourTransitioning(false);
    } else if (tourStep === 2) {
      setTourTransitioning(true);
      await tourScrollToSection(1);
      setTourStep(1);
      setTourTransitioning(false);
    }

    tourBusyRef.current = false;
  };

  const handleTourSkip = () => {
    if (tourBusyRef.current) return;
    localStorage.setItem('elva_tour_completed', 'true');
    setHasSeenTour(true);
    setTourType(null);
    setTourStep(0);
    setTourTransitioning(false);
    tourBusyRef.current = false;
    scrollToLandingSection(0);
  };

  // Intro sequence logic
  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('elva_intro_seen');
    if (hasSeenIntro) {
      setIsIntroActive(false);
      setIsFirstVisit(false);
      setAppState('landing');
    } else {
      sessionStorage.setItem('elva_intro_seen', 'true');
      setIsIntroActive(true);
      setIsFirstVisit(true);
      setAppState('landing');
      const timer = setTimeout(() => {
        setIsIntroActive(false);
        setIsFirstVisit(false);
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Cleanup color transition timeout on unmount
  useEffect(() => {
    return () => {
      if (colorTransitionTimeoutRef.current) {
        clearTimeout(colorTransitionTimeoutRef.current);
      }
    };
  }, []);

  // Clear transition timer when playing new songs
  useEffect(() => {
    if (appState === 'ready' || appState === 'processing') {
      if (backToHomeTimeoutRef.current) {
        clearTimeout(backToHomeTimeoutRef.current);
        backToHomeTimeoutRef.current = null;
      }
      if (colorsTimeoutRef.current) {
        clearTimeout(colorsTimeoutRef.current);
        colorsTimeoutRef.current = null;
      }
    }
  }, [appState]);

  useEffect(() => {
    if (songData) {
      setColorsSongData(songData);
      if (colorsTimeoutRef.current) {
        clearTimeout(colorsTimeoutRef.current);
        colorsTimeoutRef.current = null;
      }
    }
  }, [songData]);

  const handlePlayNext = (result: SearchResult) => {
    const cleanedQueue = queue.filter(item => item.id !== result.id);
    const activeKey = songData ? getPlaybackSongKey(songData) : null;
    const currentIndex = activeKey
      ? cleanedQueue.findIndex((item) => getPlaybackSongKey(item) === activeKey)
      : -1;
    
    const newQueue = [...cleanedQueue];
    if (currentIndex >= 0) {
      newQueue.splice(currentIndex + 1, 0, result);
    } else {
      newQueue.unshift(result);
    }
    
    setQueue(newQueue);
    noirToast({
      text: strings.songMenu.playingNext,
      cover: result.thumbnail,
      action: {
        label: strings.songMenu.undo,
        onClick: () => setQueue((prev) => prev.filter((item) => item.id !== result.id)),
      },
    });
  };

  const handleRemoveFromQueue = (id: string) => {
    const removedIndex = queue.findIndex((item) => item.id === id);
    const removed = removedIndex >= 0 ? queue[removedIndex] : null;
    if (!removed) return;
    setQueue((prev) => prev.filter((item) => item.id !== id));
    return () => {
      setQueue((prev) => {
        if (prev.some((item) => item.id === removed.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(removedIndex, next.length), 0, removed);
        return next;
      });
    };
  };

  const handleReorderQueue = (orderedUpNextIds: string[]) => {
    setQueue((prev) => {
      const activeKey = songData ? getPlaybackSongKey(songData) : null;
      const currentIndex = activeKey
        ? prev.findIndex((item) => getPlaybackSongKey(item) === activeKey)
        : -1;
      const byId = new Map(prev.map((item) => [item.id, item]));
      const reorderedTail = orderedUpNextIds
        .map((id) => byId.get(id))
        .filter((item): item is SearchResult => !!item);

      if (currentIndex >= 0) {
        return [...prev.slice(0, currentIndex + 1), ...reorderedTail];
      }

      const playing =
        activeKey != null
          ? prev.filter((item) => getPlaybackSongKey(item) === activeKey)
          : [];
      return [...playing, ...reorderedTail];
    });
  };

  const handleClearQueue = () => {
    const previousQueue = queue;
    setQueue([]);
    return () => setQueue(previousQueue);
  };

  const handleSelectFromQueue = (id: string, isCrossfade?: boolean) => {
    const song = queue.find(item => item.id === id);
    if (song) handleSelectSong(song, isCrossfade);
  };

  const handleShuffleQueue = () => {
    if (queue.length <= 1) {
      showMiniHUD('Not enough songs to shuffle', 'info');
      return;
    }

    const activeKey = songData ? getPlaybackSongKey(songData) : null;
    const currentSong = activeKey ? queue.find(item => getPlaybackSongKey(item) === activeKey) : null;
    
    const remaining = queue.filter(item => {
      if (!currentSong) return true;
      return item.id !== currentSong.id;
    });

    const shuffled = [...remaining];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const finalQueue = currentSong ? [currentSong, ...shuffled] : shuffled;
    setQueue(finalQueue);
    showMiniHUD('Queue shuffled');

    // Trigger the controlled slot machine artwork cycling!
    window.dispatchEvent(new CustomEvent('elva-artwork-spin', { detail: { queue: finalQueue } }));
  };

  const handleQueueFileSelect = async (file: File) => {
    const meta = await parseLocalMetadata(file);
    const localId = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const audioUrl = URL.createObjectURL(file);
    const fileResult: SearchResult = {
      id: localId,
      title: meta.title,
      artist: meta.artist,
      thumbnail: meta.artworkUrl,
      audioUrl,
      videoId: ''
    };
    await Promise.allSettled([
      saveLocalTrack(localId, file),
      saveLocalTrack(audioUrl, file),
    ]);
    setQueue(prevQueue => [...prevQueue, fileResult]);
    showMiniHUD('Added file to queue', 'success');
  };

  const theme = ACCENT_THEMES[accentColor];

  return (
    <div
      ref={containerRef}
      data-accent={accentColor}
      className="size-full relative overflow-hidden bg-[#0a0a0a] flex items-center justify-center"
    >

      {/* Premium Multi-Color Ambient Background & Vector Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 overflow-hidden"
      >
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            backgroundPosition: 'center center'
          }} 
        />

        <div 
          className="absolute inset-0 opacity-[0.06] pointer-events-none transition-opacity duration-500"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            backgroundPosition: 'center center',
            maskImage: 'radial-gradient(circle 240px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(circle 240px at var(--mouse-x, 50%) var(--mouse-y, 50%), black 0%, transparent 100%)'
          }} 
        />

        <FluidBackground 
          color1={bgColors.c1} 
          color2={bgColors.c2} 
          color3={bgColors.c3} 
          transitionDuration={colorTransitionDuration}
          speedMultiplier={
            (backgroundStyle === 'liquid' ? 1.4 : backgroundStyle === 'mesh' ? 0.8 : backgroundStyle === 'particles' ? 1.1 : 0.5) +
            Math.min(2.0, scrollVelocity * 15.0)
          }
        />

        <motion.div
          className="absolute inset-0 z-[1] pointer-events-none bg-[color:var(--noir-chrome)]"
          animate={{
            opacity: appState === 'ready' ? 0 : 0.9,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />

        <AnimatePresence>
          {(appState === 'ready' || appState === 'processing' || (appState === 'landing' && songData)) && (
            <motion.div
              key="global-ambient-dimmer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.0)_0%,rgba(7,7,10,0.48)_85%)] bg-black/8"
            />
          )}
        </AnimatePresence>
      </motion.div>

      <AppShell
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasActiveSong={!!songData}
            song={
              songData
                ? {
                    title: songData.title,
                    artist: songData.artist,
                    artworkUrl: songData.artworkUrl,
                  }
                : undefined
            }
            playback={{
              ...shellPlayback,
              isPlaying: isMiniPlaying,
            }}
            nowPlayingOpen={nowPlayingOpen}
            onExpandPlayer={() => {
              if (!songData) return;
              setNowPlayingOpen((open) => !open);
            }}
            onOpenQueue={() => {
              if (!songData) return;
              setNowPlayingOpen(true);
            }}
            showCompactPlayer
            queueCount={(() => {
              const activeKey = songData ? getPlaybackSongKey(songData) : null;
              if (!activeKey) return queue.length;
              const idx = queue.findIndex((item) => getPlaybackSongKey(item) === activeKey);
              if (idx < 0) return queue.length;
              return Math.max(0, queue.length - idx - 1);
            })()}
            favoritesCount={favorites.length}
            favoritesActive={
              activeTab === 'myhub' &&
              libraryFocus.section === 'favorites' &&
              !libraryOpenPlaylistId
            }
            selectedPlaylistId={libraryOpenPlaylistId}
            onOpenFavorites={openLibraryFavorites}
            onOpenPlaylist={openLibraryPlaylist}
            onDropSongToPlaylist={handleDropSongToPlaylist}
            isFavorite={
              !!songData &&
              isTrackFavorite(favorites, {
                id: songData.id || songData.videoId || songData.audioUrl,
                videoId: songData.videoId,
              })
            }
            onToggleFavorite={
              songData
                ? () =>
                    handleToggleFavorite({
                      id: songData.id || songData.videoId || songData.audioUrl || `${songData.title}-${songData.artist}`,
                      title: songData.title,
                      artist: songData.artist,
                      thumbnail: songData.artworkUrl,
                      videoId: songData.videoId || '',
                      audioUrl: songData.audioUrl,
                      channelId: songData.channelId,
                    })
                : undefined
            }
            onStartRadio={songData ? handleStartRadioFromPlayer : undefined}
            onOpenArtist={songData ? openArtistFromPlayer : undefined}
            nowPlaying={
              songData ? (
                <NoirNowPlayingView
                  song={songData}
                  queue={queue}
                  colors={songColors}
                  isFavorite={isTrackFavorite(favorites, {
                    id: songData.id || songData.videoId || songData.audioUrl,
                    videoId: songData.videoId,
                  })}
                  onToggleFavorite={() =>
                    handleToggleFavorite({
                      id: songData.id || songData.videoId || songData.audioUrl || `${songData.title}-${songData.artist}`,
                      title: songData.title,
                      artist: songData.artist,
                      thumbnail: songData.artworkUrl,
                      videoId: songData.videoId || '',
                      audioUrl: songData.audioUrl,
                      channelId: songData.channelId,
                    })
                  }
                  onStartRadio={handleStartRadioFromPlayer}
                  onOpenArtist={openArtistFromPlayer}
                  favoriteTracks={favorites}
                  quickAddTracks={recentlyPlayed}
                  onAddToQueue={handleAddToQueue}
                  onAppendRadio={handleAppendRadio}
                  onOpenDiscover={() => setActiveTab('discover')}
                  onSelectFromQueue={(id) => handleSelectFromQueue(id)}
                  onRemoveFromQueue={handleRemoveFromQueue}
                  onClearQueue={handleClearQueue}
                  onShuffleQueue={handleShuffleQueue}
                  onReorderQueue={handleReorderQueue}
                  playback={{
                    currentTime: shellPlayback.currentTime,
                    duration: shellPlayback.duration,
                    isPlaying: isMiniPlaying,
                  }}
                />
              ) : undefined
            }
          >
            <ErrorBoundary>
              <LandingPage
              isIntroActive={isIntroActive}
              scrollProgress={scrollProgress}
              scrollContainerRef={scrollContainerRef}
              onScroll={handleScroll}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              selectedArtist={selectedArtist}
              setSelectedArtist={searchLogic.setSelectedArtist}
              selectedPlaylist={selectedPlaylist}
              setSelectedPlaylist={setSelectedPlaylist}
              libraryFocus={libraryFocus}
              onLibraryPlaylistOpenChange={setLibraryOpenPlaylistId}
              accentColor={accentColor}
              theme={theme}
              hasSeenTour={hasSeenTour}
              tourType={tourType}
              startTour={startTour}
              isFirstVisit={isFirstVisit}
              hasSelectedArtistOnce={hasSelectedArtistOnce.current}
              searchQuery={searchLogic.searchQuery}
              setSearchQuery={searchLogic.setSearchQuery}
              lastSearchedQuery={searchLogic.lastSearchedQuery}
              isSearching={searchLogic.isSearching}
              searchResults={searchLogic.searchResults}
              recentArtists={searchLogic.recentArtists}
              recentlyPlayed={recentlyPlayed}
              verifiedArtist={verifiedArtist}
              focusedResultIndex={focusedResultIndex}
              loadingSongId={loadingSongId}
              activeSongKey={songData ? getPlaybackSongKey(songData) : null}
              isPlaying={isMiniPlaying}
              artistColors={selectedArtist ? ACCENT_THEMES[accentColor] : null}
              artistTracks={artistTracks}
              isLoadingArtist={isLoadingArtist}
              favorites={favorites}
              handleSelectSong={handleSelectSong}
              handleAddToQueue={handleAddToQueue}
              handlePlayPlaylist={handlePlayPlaylist}
              handlePlayNext={handlePlayNext}
              handleToggleFavorite={handleToggleFavorite}
              handleStartRadio={handleStartRadio}
              handleViewArtistProfile={openArtistProfile}
              handlePickArtistCandidate={searchLogic.handlePickArtistCandidate}
              artistCandidates={searchLogic.artistCandidates}
              setArtistCandidates={searchLogic.setArtistCandidates}
              handleViewArtistByName={openArtistByName}
              handleUrlSubmit={searchLogic.handleUrlSubmit}
              handleFileSelect={handleFileSelect}
              handleSearch={searchLogic.handleSearch}
              setArtistTracks={searchLogic.setArtistTracks}
              onAccentColorChange={setAccentColor}
              textureStyle={textureStyle}
              onTextureStyleChange={setTextureStyle}
              backgroundStyle={backgroundStyle}
              onBackgroundStyleChange={setBackgroundStyle}
              zenMode={zenMode}
              onZenModeChange={setZenMode}
              showVolumeSlider={showVolumeSlider}
              onShowVolumeSliderChange={setShowVolumeSlider}
              enable3DTilt={enable3DTilt}
              onEnable3DTiltChange={setEnable3DTilt}
              showSettingsButton={showSettingsButton}
              onShowSettingsButtonChange={setShowSettingsButton}
              enableCustomLyrics={enableCustomLyrics}
              onEnableCustomLyricsChange={setEnableCustomLyrics}
              peekProgressStyle={peekProgressStyle}
              onPeekProgressStyleChange={setPeekProgressStyle}
              showVisualizer={showVisualizer}
              onShowVisualizerChange={setShowVisualizer}
              navMode={navMode}
              onNavModeChange={handleSetNavMode}
              navPosition={navPosition}
              onNavPositionChange={setNavPosition}
              shellMode
            />
            </ErrorBoundary>

            {appState === 'processing' && !songData && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[color:var(--noir-canvas)]/90">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="h-8 w-8 rounded-full border border-white/10"
                    style={{ borderTopColor: 'rgba(255, 255, 255, 0.7)' }}
                  />
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ delay: 0.1 }}
                  className="text-xs font-light uppercase tracking-[0.2em] text-white"
                >
                  Loading
                </motion.p>
              </div>
            )}
          </AppShell>

      {songData && (
        <div
          aria-hidden
          className="pointer-events-none invisible absolute inset-0 z-0 overflow-hidden"
        >
          <ErrorBoundary>
            <MusicPlayer
              songData={songData}
              queue={queue}
              appState="landing"
              accentColor={accentColor}
              songColors={songColors}
              onAccentColorChange={setAccentColor}
              onRemoveFromQueue={handleRemoveFromQueue}
              onClearQueue={handleClearQueue}
              onShuffleQueue={handleShuffleQueue}
              onSelectFromQueue={handleSelectFromQueue}
              onAddToQueue={handleAddToQueue}
              onPlayNext={handlePlayNext}
              onPlayPlaylist={handlePlayPlaylist}
              onReorderQueue={handleReorderQueue}
              onQueueFileSelect={handleQueueFileSelect}
              onSelectSong={handleSelectSong}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              onSearch={executeSearchAPI}
              onFetchChannelUploads={executeChannelUploadsAPI}
              onViewArtist={openArtistByName}
              tourType={tourType}
              currentStep={tourStep}
              textureStyle={textureStyle}
              onTextureStyleChange={setTextureStyle}
              backgroundStyle={backgroundStyle}
              onBackgroundStyleChange={setBackgroundStyle}
              showVisualizer={showVisualizer}
              onShowVisualizerChange={setShowVisualizer}
              zenMode={zenMode}
              onZenModeChange={setZenMode}
              showVolumeSlider={showVolumeSlider}
              onShowVolumeSliderChange={setShowVolumeSlider}
              enable3DTilt={enable3DTilt}
              onEnable3DTiltChange={setEnable3DTilt}
              showSettingsButton={showSettingsButton}
              onShowSettingsButtonChange={setShowSettingsButton}
              enableCustomLyrics={enableCustomLyrics}
              onEnableCustomLyricsChange={setEnableCustomLyrics}
              onPlayingStateChange={setIsMiniPlaying}
              onShellPlaybackState={setShellPlayback}
              peekProgressStyle={peekProgressStyle}
              onPeekProgressStyleChange={setPeekProgressStyle}
              onFileSelect={(file) => {
                void playLocalFile(file);
              }}
              onUrlSubmit={searchLogic.handleUrlSubmit}
            />
          </ErrorBoundary>
        </div>
      )}

      <NoirSongMenuHost
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onStartRadio={handleStartRadio}
        onToggleFavorite={handleToggleFavorite}
        onGoToArtist={openArtistByName}
        onRemoveFromQueue={(track) => handleRemoveFromQueue(track.id)}
        isFavoriteForTrack={(track) => isTrackFavorite(favorites, track)}
      />

      <NoirToastHost />

      {/* Onboarding Tour Overlay */}
      <OnboardingTour
        tourType={tourType}
        currentStep={tourStep}
        isTransitioning={tourTransitioning}
        onNext={handleTourNext}
        onBack={handleTourBack}
        onSkip={handleTourSkip}
      />

      {/* Arc-style search palette (⌘K) */}
      <NoirSearchPalette
        open={searchPaletteOpen}
        onClose={() => setSearchPaletteOpen(false)}
        onSelectSong={handleSelectSong}
        onAddToQueue={handleAddToQueue}
        onPlayNext={handlePlayNext}
        onToggleFavorite={handleToggleFavorite}
        onViewArtist={openArtistProfile}
        onFileSelect={handleFileSelect}
        favorites={favorites}
        recentTracks={recentlyPlayed}
      />

      {/* Keyboard Shortcuts Map Overlay */}
      <KeyboardShortcutsModal
        isOpen={showShortcutMap}
        onClose={() => setShowShortcutMap(false)}
        accentColor={accentColor}
      />

      <Toaster 
        position="top-center" 
        theme="dark" 
        expand={true}
        visibleToasts={3}
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 20, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            borderRadius: '16px',
            padding: '12px 18px',
          },
          classNames: {
            title: '!text-white !text-sm !font-semibold !font-sans',
            description: '!text-white/70 !text-[11px] !font-light !font-sans !mt-1',
            toast: '!flex !items-center !gap-3 !rounded-2xl !border !border-white/10 !shadow-2xl'
          }
        }} 
      />

      {/* Premium Global Matte-Paper/Dots Texture Overlay */}
      {textureStyle === 'paper' && (
        <div 
          className="fixed inset-0 w-full h-full opacity-[0.08] mix-blend-overlay pointer-events-none z-[150]" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.80' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }} 
        />
      )}
      
      {textureStyle === 'dots' && (
        <>
          <div 
            className="fixed inset-0 opacity-[0.022] pointer-events-none z-[150]"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0.8px, transparent 0.8px)',
              backgroundSize: '5px 5px',
              transform: 'rotate(15deg) scale(1.35)',
              transformOrigin: 'center center'
            }}
          />
          <div 
            className="fixed inset-0 pointer-events-none opacity-[0.008] mix-blend-overlay z-[150]" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} 
          />
        </>
      )}
    </div>
  );
}
