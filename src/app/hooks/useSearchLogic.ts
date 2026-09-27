import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SearchResult, VerifiedArtist } from '../types';
import { getPrimaryArtist } from '../utils/stringUtils';
import {
  shouldShowArtistCard,
  getArtistName,
  getHandPickedImage,
  executeSearchAPI,
  resolveTopicChannelId,
  fetchWithTimeout,
  resolveUrlToSearchResult
} from '../utils/apiUtils';
import {
  peekCachedDiscography,
  loadArtistDiscographyWithCache,
} from '../utils/artistDiscographyLoader';
import '../services/musicGraph';

// Simple in-memory LRU search cache — max 30 entries, 5-minute TTL
// Prevents repeated API hits when the user types the same query twice in a session.
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEARCH_CACHE_MAX = 30;
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();

function getCachedSearch(query: string): SearchResult[] | null {
  const key = query.trim().toLowerCase();
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry.results;
}

function setCachedSearch(query: string, results: SearchResult[]) {
  const key = query.trim().toLowerCase();
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    // Evict the oldest entry (Maps preserve insertion order)
    const firstKey = searchCache.keys().next().value;
    if (firstKey !== undefined) searchCache.delete(firstKey);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}


const SHORTCUT_ARTISTS: VerifiedArtist[] = [
  {
    name: 'KESI',
    thumbnail: 'https://cdn-images.dzcdn.net/images/artist/50656cb54b66a32d095c3e0532c9dc32/250x250-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK']
  },
  {
    name: 'Kundo',
    thumbnail: 'https://cdn-images.dzcdn.net/images/cover/2bbca104b7dd8d14bed865e4cebf3c79/500x500-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK']
  },
  {
    name: 'Lamin',
    thumbnail: 'https://cdn-images.dzcdn.net/images/artist/7375da7e864a9cf0bdd6add7578df724/250x250-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK']
  },
  {
    name: 'Artigeardit',
    thumbnail: 'https://cdn-images.dzcdn.net/images/artist/54920f6d4791b6923f008effd0b3b2ef/250x250-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK']
  }
];

interface SearchLogicOptions {
  setAppState: (state: 'landing' | 'processing' | 'ready') => void;
  setSongData: (data: any) => void;
  setColorsSongData: (data: any) => void;
  setQueue: React.Dispatch<React.SetStateAction<SearchResult[]>>;
  saveRecentlyPlayed: (song: SearchResult) => void;
  handleSelectSong: (song: SearchResult) => void;
  handleAddToQueue: (song: SearchResult) => void;
  appState: 'landing' | 'processing' | 'ready';
  songData: any;
  tourType: 'landing' | 'player' | null;
  tourStep: number;
  setTourStep: (step: number) => void;
}

export function useSearchLogic({
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
}: SearchLogicOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedArtist, setSelectedArtist] = useState<VerifiedArtist | null>(null);
  const [verifiedArtist, setVerifiedArtist] = useState<VerifiedArtist | null>(null);
  const [resolvedVideoIds, setResolvedVideoIds] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('elva_resolved_video_ids');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [isVerifyingArtist, setIsVerifyingArtist] = useState(false);
  const [artistTracks, setArtistTracks] = useState<SearchResult[]>([]);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [recentArtists, setRecentArtists] = useState<VerifiedArtist[]>(() => {
    try {
      const stored = localStorage.getItem('elva_recent_artists');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((a: any) => {
            const handPicked = getHandPickedImage(a.name);
            return handPicked ? { ...a, thumbnail: handPicked } : a;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load recent artists from localStorage:', e);
    }
    return SHORTCUT_ARTISTS;
  });

  const [focusedResultIndex, setFocusedResultIndex] = useState<number>(-1);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);

  // Reset focus when searching or changing view
  useEffect(() => {
    setFocusedResultIndex(-1);
  }, [searchQuery, searchResults, selectedArtist]);

  // Reset selected artist only if search query is completely empty
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSelectedArtist(null);
      setArtistTracks([]);
      setVerifiedArtist(null);
      setIsVerifyingArtist(false);
      setLastSearchedQuery('');
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Verify artist via MusicBrainz API in background to enrich metadata
  useEffect(() => {
    let active = true;
    
    const verifyArtist = async () => {
      if (!shouldShowArtistCard(lastSearchedQuery) || searchResults.length === 0) {
        setVerifiedArtist(null);
        return;
      }
      
      const candidate = getArtistName(lastSearchedQuery, searchResults);
      if (!candidate) {
        setVerifiedArtist(null);
        return;
      }

      const handPicked = getHandPickedImage(candidate.name);
      setVerifiedArtist({
        name: candidate.name,
        thumbnail: handPicked || candidate.thumbnail,
        channelId: candidate.channelId,
        isTopic: candidate.isTopic
      });

      setIsVerifyingArtist(true);
      try {
        const queryVal = candidate.name.trim();

        try {
          if (handPicked) {
            localStorage.setItem(`elva_artist_img_${queryVal.toLowerCase()}`, handPicked);
          } else {
            const deezerRes = await fetchWithTimeout(
              `/deezer/search/artist?q=${encodeURIComponent(queryVal)}`,
              {},
              2500
            );
            if (deezerRes.ok) {
              const deezerData = await deezerRes.json();
              const deezerArtist = (deezerData.data || []).find((a: any) => 
                a.name.toLowerCase() === queryVal.toLowerCase()
              ) || deezerData.data?.[0];
              
              if (deezerArtist && active && (deezerArtist.picture_big || deezerArtist.picture_medium)) {
                const imgUrl = deezerArtist.picture_big || deezerArtist.picture_medium;
                localStorage.setItem(`elva_artist_img_${queryVal.toLowerCase()}`, imgUrl);
                setVerifiedArtist(prev => prev ? {
                  ...prev,
                  thumbnail: imgUrl
                } : null);
              }
            }
          }
        } catch (de) {
          console.warn('Deezer artist image fetch failed:', de);
        }

        const response = await fetchWithTimeout(
          `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(queryVal)}&fmt=json`,
          {
            headers: {
              'User-Agent': 'ElvaMusicApp/1.0 ( contact@elva.fm )'
            },
            timeout: 2500
          }
        );
        
        if (!response.ok) {
          throw new Error(`MusicBrainz HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        if (!active) return;
        
        const artists = data.artists || [];
        const queryLower = queryVal.toLowerCase();
        
        const matchedArtist = artists.find((artist: any) => {
          const nameLower = (artist.name || '').toLowerCase();
          const score = artist.score || 0;
          return score >= 85 && (nameLower === queryLower || nameLower.includes(queryLower) || queryLower.includes(nameLower));
        });
        
        if (matchedArtist && active) {
          const tagsList = (matchedArtist.tags || [])
            .filter((t: any) => (t.count || 0) > 0)
            .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
            .map((t: any) => t.name)
            .slice(0, 3);
            
          setVerifiedArtist(prev => prev ? {
            ...prev,
            disambiguation: matchedArtist.disambiguation || undefined,
            country: matchedArtist.country || undefined,
            tags: tagsList.length > 0 ? tagsList : undefined
          } : null);
        }
      } catch (error) {
        console.warn('Background MusicBrainz metadata enrichment failed:', error);
      } finally {
        if (active) {
          setIsVerifyingArtist(false);
        }
      }
    };
    
    verifyArtist();
    
    return () => {
      active = false;
    };
  }, [searchResults, lastSearchedQuery]);

  const handleViewArtistProfile = async (artist: VerifiedArtist) => {
    const isPlaceholderOrEmpty = (url?: string) => {
      if (!url) return true;
      return url.includes('unsplash.com') || url === '';
    };

    const nameLower = artist.name.trim().toLowerCase();
    const handPickedUrl = getHandPickedImage(artist.name);

    // Show artist immediately
    const initialArtist = {
      ...artist,
      thumbnail: handPickedUrl || artist.thumbnail,
    };
    setSelectedArtist(initialArtist);
    setIsLoadingArtist(true);

    // Cache hit — instant discography, no API wait
    const cachedTracks = peekCachedDiscography(artist.name);
    if (cachedTracks) {
      setArtistTracks(cachedTracks);
      setIsLoadingArtist(false);
    } else {
      setArtistTracks([]);
    }

    // Deezer avatar in parallel (never blocks track list)
    const deezerImgPromise = (async () => {
      const existing = handPickedUrl || localStorage.getItem(`elva_artist_img_${nameLower}`);
      if (existing) return existing;
      try {
        const deezerRes = await fetchWithTimeout(
          `/deezer/search/artist?q=${encodeURIComponent(artist.name.trim())}`,
          {},
          2000
        );
        if (!deezerRes.ok) return null;
        const deezerData = await deezerRes.json();
        const deezerArtist =
          (deezerData.data || []).find((a: any) => a.name.toLowerCase() === nameLower) ||
          deezerData.data?.[0];
        const url = deezerArtist?.picture_big || deezerArtist?.picture_medium;
        if (url) {
          localStorage.setItem(`elva_artist_img_${nameLower}`, url);
          window.dispatchEvent(
            new CustomEvent('elva-artist-image-loaded', { detail: { name: artist.name, url } })
          );
          return url;
        }
      } catch {
        // optional enrichment
      }
      return null;
    })();

    // Save to recent artists
    setRecentArtists(prev => {
      const filtered = prev.filter(a => a.name.toLowerCase() !== nameLower);
      const updated = [initialArtist, ...filtered].slice(0, 4);
      try { localStorage.setItem('elva_recent_artists', JSON.stringify(updated)); } catch {}
      return updated;
    });

    try {
      if (!cachedTracks) {
        const [tracks, deezerImg] = await Promise.all([
          loadArtistDiscographyWithCache(artist.name, 120, artist.channelId),
          deezerImgPromise,
        ]);

        if (deezerImg && isPlaceholderOrEmpty(artist.thumbnail)) {
          setSelectedArtist((prev) => (prev ? { ...prev, thumbnail: deezerImg } : prev));
        }

        setArtistTracks(tracks);
        if (tracks.length === 0) {
          toast.error('No releases found', {
            description: `Could not load tracks for ${artist.name}. Try searching for a specific song.`,
          });
        }
      } else if (deezerImgPromise) {
        const deezerImg = await deezerImgPromise;
        if (deezerImg && isPlaceholderOrEmpty(artist.thumbnail)) {
          setSelectedArtist((prev) => (prev ? { ...prev, thumbnail: deezerImg } : prev));
        }
      }
    } catch (error) {
      console.error('Failed to load artist profile:', error);
      toast.error('Could not load artist', {
        description: `Something went wrong while fetching releases for ${artist.name}.`,
      });
      setArtistTracks([]);
    } finally {
      setIsLoadingArtist(false);
    }

    // ── MusicBrainz enrichment (background, non-blocking) ──
    // Runs after loading is done so it never delays the UI.
    fetchWithTimeout(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artist.name)}&fmt=json`,
      { headers: { 'User-Agent': 'ElvaMusicApp/1.0 ( contact@elva.fm )' } },
      2500
    ).then(async mbRes => {
      if (!mbRes.ok) return;
      const mbData = await mbRes.json();
      const matchedArtist = (mbData.artists || []).find((a: any) => {
        const nLower = (a.name || '').toLowerCase();
        const nameLower = artist.name.trim().toLowerCase();
        return (a.score || 0) >= 85 && (nLower === nameLower || nLower.includes(nameLower) || nameLower.includes(nLower));
      });
      if (matchedArtist) {
        const tagsList = (matchedArtist.tags || [])
          .filter((t: any) => (t.count || 0) > 0)
          .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
          .map((t: any) => t.name)
          .slice(0, 3);
        setSelectedArtist(prev => prev ? {
          ...prev,
          disambiguation: matchedArtist.disambiguation || undefined,
          country: matchedArtist.country || undefined,
          tags: tagsList.length > 0 ? tagsList : undefined
        } : null);
      }
    }).catch(() => {});
  };


  const handleViewArtistByName = async (artistName: string, channelId?: string) => {
    const primaryArtistName = getPrimaryArtist(artistName);
    const nameTrimmed = primaryArtistName.trim();
    if (!nameTrimmed || nameTrimmed === 'Unknown Artist' || nameTrimmed === 'Web Stream') {
      toast.error('Invalid artist');
      return;
    }

    if (verifiedArtist && verifiedArtist.name.toLowerCase() === nameTrimmed.toLowerCase()) {
      handleViewArtistProfile(verifiedArtist);
      return;
    }
    const foundInRecent = recentArtists.find(a => a.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (foundInRecent) {
      handleViewArtistProfile(foundInRecent);
      return;
    }

    const handPicked = getHandPickedImage(nameTrimmed);
    const tempArtist: VerifiedArtist = {
      name: nameTrimmed,
      thumbnail: handPicked || songData?.artworkUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxtdXNpYyUyMGJhY2tncm91bmR8ZW58MHx8fDE3Nzg5Nzk5NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      channelId: channelId,
    };

    handleViewArtistProfile(tempArtist);
  };

  const handleSearch = async (overrideQuery?: string) => {
    const query = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    if (!query) return;

    const sameQueryAlreadyShown =
      query.toLowerCase() === lastSearchedQuery.trim().toLowerCase() && searchResults.length > 0;

    if (sameQueryAlreadyShown && !isSearching) {
      return;
    }

    const cached = getCachedSearch(query);
    if (cached) {
      setSelectedArtist(null);
      setArtistTracks([]);
      if (shouldShowArtistCard(query)) {
        const candidate = getArtistName(query, cached);
        if (candidate) {
          const handPicked = getHandPickedImage(candidate.name);
          setVerifiedArtist({
            name: candidate.name,
            thumbnail: handPicked || candidate.thumbnail,
            channelId: candidate.channelId,
            isTopic: candidate.isTopic
          });
        }
      }
      setSearchResults([...cached]);
      setLastSearchedQuery(query);
      return;
    }

    setSelectedArtist(null);
    setArtistTracks([]);
    setVerifiedArtist(null);

    setIsSearching(true);
    const results = await executeSearchAPI(query);
    setIsSearching(false);

    if (results.length > 0) {
      setCachedSearch(query, results);
      if (shouldShowArtistCard(query)) {
        const candidate = getArtistName(query, results);
        if (candidate) {
          const handPicked = getHandPickedImage(candidate.name);
          setVerifiedArtist({
            name: candidate.name,
            thumbnail: handPicked || candidate.thumbnail,
            channelId: candidate.channelId,
            isTopic: candidate.isTopic
          });
        }
      }
      setSearchResults(results);
      setLastSearchedQuery(query);
    } else {
      setSearchResults([]);
      setVerifiedArtist(null);
      setLastSearchedQuery(query);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    const alreadyPlaying = appState === 'ready' && !!songData;

    let targetSong: SearchResult;
    try {
      targetSong = await resolveUrlToSearchResult(url);
    } catch (error) {
      console.error('Failed to resolve pasted URL:', error);
      toast.error('Could not load link', {
        description: 'Check the URL and try again.',
      });
      return;
    }

    if (alreadyPlaying) {
      handleAddToQueue(targetSong);
      return;
    }

    setQueue((prevQueue) => {
      if (prevQueue.some((item) => item.id === targetSong.id)) {
        return prevQueue;
      }
      return [...prevQueue, targetSong];
    });

    handleSelectSong(targetSong);
  };

  return {
    searchQuery,
    setSearchQuery,
    lastSearchedQuery,
    setLastSearchedQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    selectedArtist,
    setSelectedArtist,
    verifiedArtist,
    setVerifiedArtist,
    isVerifyingArtist,
    artistTracks,
    setArtistTracks,
    isLoadingArtist,
    recentArtists,
    setRecentArtists,
    focusedResultIndex,
    setFocusedResultIndex,
    loadingSongId,
    setLoadingSongId,
    resolvedVideoIds,
    handleViewArtistProfile,
    handleViewArtistByName,
    handleSearch,
    handleUrlSubmit
  };
}
