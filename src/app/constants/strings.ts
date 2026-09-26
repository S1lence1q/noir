/** Central UI copy — English for now; swap for i18n later */
export const DEFAULT_PROFILE_NAME = 'Music Lover';

export function hasCustomProfileName(name: string): boolean {
  return name.trim().toLowerCase() !== DEFAULT_PROFILE_NAME.toLowerCase();
}

export const strings = {
  search: {
    keyboardHint: '↑↓ navigate · Enter open · Esc clear',
  },
  queue: {
    upNext: 'Up Next',
    emptyTitle: 'Nothing queued yet',
    emptyHint: 'Search above to add tracks',
    emptyHintWithLikes: 'Search above, or quick-add from your likes below',
    searchPlaceholder: 'Search or paste a link...',
    noResults: 'No results found',
    pressEnter: 'Press Enter to search',
    playlistEmpty: 'This playlist is empty',
    library: {
      playlists: 'No playlists found. Create them in My Hub!',
      artists: 'No artists resolved yet.',
      likes: 'No favorites saved yet.',
    },
  },
  empty: {
    favoritesTitle: 'No favorite songs yet',
    favoritesDesc: 'Tap the heart on a track, in the player bar, or while searching to save it here.',
    favoritesAction: 'Browse Discover',
    playlistEmptyTitle: 'This playlist is empty',
    playlistEmptyDesc: 'Search below to find and add tracks.',
    noPlaylistsTitle: 'No playlists yet',
    noPlaylistsDesc: 'Click "Create New" to start your first collection.',
    noRecentsTitle: 'No recent songs',
    noRecentsDesc: 'Start playing tracks to fill your recents history.',
    noArtistsTitle: 'No artists yet',
    noArtistsDesc: 'Your recently played artists will show up here.',
    noPlaylistsOverviewTitle: 'No playlists created yet',
    noPlaylistsOverviewDesc: 'Go to the Playlists tab to create collections.',
    goToPlaylists: 'Go to Playlists',
  },
  discover: {
    trendingUnavailable: 'Trending unavailable',
    trendingDesc: 'Charts could not load right now. Check your connection and try again.',
    retry: 'Retry',
  },
  profileHub: {
    favoritesTitle: 'Your Favorite Library',
    favoritesCount: (n: number) => (n === 1 ? '1 Song' : `${n} Songs`),
    playlistsTitle: 'Your Playlist Collections',
    createNew: 'Create New',
    backToPlaylists: 'Back to Playlists',
  },
  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    lateNight: 'Late night',
  },
  tour: {
    searchTitle: 'Search anything',
    searchDesc: 'Find songs, artists, or paste a YouTube link. You can also upload local audio from the home screen.',
    discoverTitle: 'Discover',
    discoverDesc: 'Trending charts and daily picks live here. Scroll down or use the section dots on the right.',
    navTitle: 'Quick navigation',
    navDesc: 'Jump between Home, Discover, and My Hub. Favorites, playlists, and your profile live in My Hub.',
    completed: 'You\'re all set!',
    completedDesc: 'Search a track or explore Discover to get started.',
  },
} as const;
