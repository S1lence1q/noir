import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SearchResult, VerifiedArtist } from '../types';
import { getPrimaryArtist } from '../utils/stringUtils';
import {
  shouldShowArtistCard,
  getArtistName,
  getHandPickedImage,
  executeSearchAPI,
  fetchWithTimeout,
  resolveUrlToSearchResult,
} from '../utils/apiUtils';
import {
  peekCachedDiscographyEntry,
  loadArtistDiscographyWithCache,
  loadArtistPopularTracks,
  mergeArtistTrackLists,
  prefetchArtistProfile,
} from '../utils/artistDiscographyLoader';
import {
  resolveArtistIdentity,
  identityToVerifiedArtist,
  setCachedIdentity,
  identityCacheKey,
  type ArtistIdentity,
} from '../services/artistIdentity';
import '../services/musicGraph';

// Simple in-memory LRU search cache — max 30 entries, 5-minute TTL
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
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
    const firstKey = searchCache.keys().next().value;
    if (firstKey !== undefined) searchCache.delete(firstKey);
  }
  searchCache.set(key, { results, timestamp: Date.now() });
}

const SHORTCUT_ARTISTS: VerifiedArtist[] = [
  {
    name: 'KESI',
    thumbnail:
      'https://cdn-images.dzcdn.net/images/artist/50656cb54b66a32d095c3e0532c9dc32/250x250-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK'],
  },
  {
    name: 'Kundo',
    thumbnail:
      'https://cdn-images.dzcdn.net/images/cover/2bbca104b7dd8d14bed865e4cebf3c79/500x500-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK'],
  },
  {
    name: 'Lamin',
    thumbnail:
      'https://cdn-images.dzcdn.net/images/artist/7375da7e864a9cf0bdd6add7578df724/250x250-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK'],
  },
  {
    name: 'Artigeardit',
    thumbnail:
      'https://cdn-images.dzcdn.net/images/artist/54920f6d4791b6923f008effd0b3b2ef/250x250-000000-80-0-0.jpg',
    disambiguation: 'Danish Rapper • DK',
    country: 'DK',
    tags: ['Hip-Hop', 'Rap', 'DK'],
  },
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

function isPlaceholderOrEmpty(url?: string) {
  if (!url) return true;
  return url.includes('unsplash.com') || url === '';
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
  setTourStep,
}: SearchLogicOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<VerifiedArtist | null>(null);
  const [verifiedArtist, setVerifiedArtist] = useState<VerifiedArtist | null>(null);
  const [isVerifyingArtist, setIsVerifyingArtist] = useState(false);
  const [artistTracks, setArtistTracks] = useState<SearchResult[]>([]);
  const [isLoadingArtist, setIsLoadingArtist] = useState(false);
  const [artistCandidates, setArtistCandidates] = useState<ArtistIdentity[] | null>(null);
  const [recentArtists, setRecentArtists] = useState<VerifiedArtist[]>(() => {
    try {
      const saved = localStorage.getItem('elva_recent_artists');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SHORTCUT_ARTISTS;
  });
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  const [resolvedVideoIds] = useState<Record<string, string>>({});
  const profileGenRef = useRef(0);

  useEffect(() => {
    if (!searchQuery.trim()) {
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
        isTopic: candidate.isTopic,
      });

      // Prefetch identity + Popular while the card is visible
      void prefetchArtistProfile({
        name: candidate.name,
        channelId: candidate.channelId,
        isTopic: candidate.isTopic,
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
              const deezerArtist =
                (deezerData.data || []).find(
                  (a: any) => a.name.toLowerCase() === queryVal.toLowerCase()
                ) || deezerData.data?.[0];

              if (active && deezerArtist && (deezerArtist.picture_big || deezerArtist.picture_medium)) {
                const imgUrl = deezerArtist.picture_big || deezerArtist.picture_medium;
                localStorage.setItem(`elva_artist_img_${queryVal.toLowerCase()}`, imgUrl);
                setVerifiedArtist((prev) =>
                  prev
                    ? {
                        ...prev,
                        thumbnail: imgUrl,
                        deezerId: typeof deezerArtist.id === 'number' ? deezerArtist.id : prev.deezerId,
                      }
                    : null
                );
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
              'User-Agent': 'ElvaMusicApp/1.0 ( contact@elva.fm )',
            },
            timeout: 2500,
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
          return (
            score >= 85 &&
            (nameLower === queryLower || nameLower.includes(queryLower) || queryLower.includes(nameLower))
          );
        });

        if (matchedArtist && active) {
          const tagsList = (matchedArtist.tags || [])
            .filter((t: any) => (t.count || 0) > 0)
            .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
            .map((t: any) => t.name)
            .slice(0, 3);

          setVerifiedArtist((prev) =>
            prev
              ? {
                  ...prev,
                  mbid: matchedArtist.id || prev.mbid,
                  disambiguation: matchedArtist.disambiguation || undefined,
                  country: matchedArtist.country || undefined,
                  tags: tagsList.length > 0 ? tagsList : undefined,
                }
              : null
          );
        }
      } catch (error) {
        console.warn('Background MusicBrainz metadata enrichment failed:', error);
      } finally {
        if (active) setIsVerifyingArtist(false);
      }
    };

    verifyArtist();

    return () => {
      active = false;
    };
  }, [searchResults, lastSearchedQuery]);

  const loadProfileForIdentity = async (
    identity: ArtistIdentity,
    generation: number,
    seedArtist: VerifiedArtist
  ) => {
    const verified = identityToVerifiedArtist(identity, { thumbnail: seedArtist.thumbnail });
    const handPickedUrl = getHandPickedImage(verified.name);
    const displayArtist: VerifiedArtist = {
      ...verified,
      thumbnail: handPickedUrl || verified.thumbnail || seedArtist.thumbnail,
    };

    if (generation !== profileGenRef.current) return;

    setSelectedArtist(displayArtist);
    setArtistCandidates(null);
    setIsLoadingArtist(true);

    const cacheKey = identityCacheKey(identity);

    const cached = peekCachedDiscographyEntry(cacheKey, {
      allowStale: true,
      artistName: displayArtist.name,
    });

    if (cached?.tracks.length) {
      setArtistTracks(cached.tracks);
      setIsLoadingArtist(false);
    } else {
      setArtistTracks([]);
    }

    setRecentArtists((prev) => {
      const filtered = prev.filter((a) => a.name.toLowerCase() !== displayArtist.name.toLowerCase());
      const updated = [displayArtist, ...filtered].slice(0, 4);
      try {
        localStorage.setItem('elva_recent_artists', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      // Popular first — usable within ~1s even on cold open
      const popular = await loadArtistPopularTracks(displayArtist.name, 10);
      if (generation !== profileGenRef.current) return;

      if (popular.length > 0) {
        setArtistTracks((prev) => (prev.length > 0 ? mergeArtistTrackLists(popular, prev) : popular));
        setIsLoadingArtist(false);
      }

      if (displayArtist.thumbnail && !isPlaceholderOrEmpty(displayArtist.thumbnail)) {
        localStorage.setItem(
          `elva_artist_img_${displayArtist.name.toLowerCase()}`,
          displayArtist.thumbnail
        );
      }

      // Background discography (SWR: refresh even if we showed stale cache)
      const needsRefresh = !cached || cached.stale;
      if (needsRefresh) {
        const discog = await loadArtistDiscographyWithCache(displayArtist.name, {
          limit: 40,
          channelId: identity.channelId || displayArtist.channelId,
          channelType: identity.channelType,
          identity,
          skipFetchIfFresh: false,
        });
        if (generation !== profileGenRef.current) return;

        if (discog.length > 0) {
          setArtistTracks((prev) => mergeArtistTrackLists(prev.length ? prev : popular, discog));
        } else if (!cached?.tracks.length && popular.length === 0) {
          toast.error('No releases found', {
            description: `Could not load tracks for ${displayArtist.name}. Try searching for a specific song.`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load artist profile:', error);
      if (generation === profileGenRef.current && !cached?.tracks.length) {
        toast.error('Could not load artist', {
          description: `Something went wrong while fetching releases for ${displayArtist.name}.`,
        });
        setArtistTracks([]);
      }
    } finally {
      if (generation === profileGenRef.current) {
        setIsLoadingArtist(false);
      }
    }

    // MusicBrainz tags (non-blocking)
    fetchWithTimeout(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(displayArtist.name)}&fmt=json`,
      { headers: { 'User-Agent': 'ElvaMusicApp/1.0 ( contact@elva.fm )' } },
      2500
    )
      .then(async (mbRes) => {
        if (!mbRes.ok || generation !== profileGenRef.current) return;
        const mbData = await mbRes.json();
        const matchedArtist = (mbData.artists || []).find((a: any) => {
          const nLower = (a.name || '').toLowerCase();
          const nameLower = displayArtist.name.trim().toLowerCase();
          return (
            (a.score || 0) >= 85 &&
            (nLower === nameLower || nLower.includes(nameLower) || nameLower.includes(nLower))
          );
        });
        if (!matchedArtist) return;
        const tagsList = (matchedArtist.tags || [])
          .filter((t: any) => (t.count || 0) > 0)
          .sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
          .map((t: any) => t.name)
          .slice(0, 3);
        setSelectedArtist((prev) =>
          prev
            ? {
                ...prev,
                mbid: matchedArtist.id || prev.mbid,
                disambiguation: matchedArtist.disambiguation || prev.disambiguation,
                country: matchedArtist.country || prev.country,
                tags: tagsList.length > 0 ? tagsList : prev.tags,
              }
            : null
        );
      })
      .catch(() => {});
  };

  const handleViewArtistProfile = async (artist: VerifiedArtist) => {
    const generation = ++profileGenRef.current;
    const handPickedUrl = getHandPickedImage(artist.name);

    // Shell opens immediately
    setSelectedArtist({
      ...artist,
      thumbnail: handPickedUrl || artist.thumbnail,
    });
    setArtistCandidates(null);
    setIsLoadingArtist(true);
    setArtistTracks([]);

    try {
      const identity = await resolveArtistIdentity({
        name: artist.name,
        channelId: artist.channelId,
        thumbnail: handPickedUrl || artist.thumbnail,
        isTopic: artist.isTopic,
        mbid: artist.mbid,
        deezerId: artist.deezerId,
      });

      if (generation !== profileGenRef.current) return;

      if (identity.confidence === 'low' && identity.candidates && identity.candidates.length > 1) {
        setArtistCandidates(identity.candidates);
        setIsLoadingArtist(false);
        setSelectedArtist({
          ...artist,
          name: identity.canonicalName || artist.name,
          thumbnail: identity.image || handPickedUrl || artist.thumbnail,
          confidence: 'low',
        });
        return;
      }

      await loadProfileForIdentity(identity, generation, artist);
    } catch (error) {
      console.error('Artist identity resolve failed:', error);
      if (generation !== profileGenRef.current) return;
      // Fall back to name-only load
      await loadProfileForIdentity(
        {
          canonicalName: artist.name,
          channelId: artist.channelId,
          image: artist.thumbnail,
          confidence: artist.channelId ? 'medium' : 'low',
          mbid: artist.mbid,
          deezerId: artist.deezerId,
        },
        generation,
        artist
      );
    }
  };

  const handlePickArtistCandidate = async (candidate: ArtistIdentity) => {
    const generation = ++profileGenRef.current;
    const picked: ArtistIdentity = { ...candidate, confidence: 'high', candidates: undefined };
    void setCachedIdentity(picked);
    setArtistCandidates(null);
    await loadProfileForIdentity(picked, generation, identityToVerifiedArtist(picked));
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
    const foundInRecent = recentArtists.find((a) => a.name.toLowerCase() === nameTrimmed.toLowerCase());
    if (foundInRecent) {
      handleViewArtistProfile(foundInRecent);
      return;
    }

    const handPicked = getHandPickedImage(nameTrimmed);
    const tempArtist: VerifiedArtist = {
      name: nameTrimmed,
      thumbnail:
        handPicked ||
        songData?.artworkUrl ||
        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxtdXNpYyUyMGJhY2tncm91bmR8ZW58MHx8fDE3Nzg5Nzk5NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
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
      setArtistCandidates(null);
      if (shouldShowArtistCard(query)) {
        const candidate = getArtistName(query, cached);
        if (candidate) {
          const handPicked = getHandPickedImage(candidate.name);
          setVerifiedArtist({
            name: candidate.name,
            thumbnail: handPicked || candidate.thumbnail,
            channelId: candidate.channelId,
            isTopic: candidate.isTopic,
          });
          void prefetchArtistProfile({
            name: candidate.name,
            channelId: candidate.channelId,
            isTopic: candidate.isTopic,
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
    setArtistCandidates(null);

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
            isTopic: candidate.isTopic,
          });
          void prefetchArtistProfile({
            name: candidate.name,
            channelId: candidate.channelId,
            isTopic: candidate.isTopic,
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
    artistCandidates,
    setArtistCandidates,
    recentArtists,
    setRecentArtists,
    focusedResultIndex,
    setFocusedResultIndex,
    loadingSongId,
    setLoadingSongId,
    resolvedVideoIds,
    handleViewArtistProfile,
    handlePickArtistCandidate,
    handleViewArtistByName,
    handleSearch,
    handleUrlSubmit,
    prefetchArtistProfile,
  };
}
