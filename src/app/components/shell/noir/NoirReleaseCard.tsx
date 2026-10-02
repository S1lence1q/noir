import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { Playlist } from '../../PlaylistDetailsView';
import { NoirArtwork } from './NoirArtwork';
import { worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';
import { DiscoverReleaseCard, loadAlbumAsPlaylistTracks } from '../../../services/discover/discoverFeed';
import { SearchResult } from '../../../types';

export function formatReleaseDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function openRelease(release: DiscoverReleaseCard, onSelectPlaylist: (playlist: Playlist) => void) {
  const tracks = await loadAlbumAsPlaylistTracks(release);
  onSelectPlaylist({
    id: `release:${release.id}`,
    name: release.title,
    description: strings.discover.releaseMeta(release.artist, formatReleaseDate(release.releaseDate)),
    tracks,
    thumbnail: release.image ?? '',
    accent: 'navy',
  });
}

export async function playRelease(
  release: DiscoverReleaseCard,
  onPlayPlaylist: (tracks: SearchResult[], label?: string) => void
) {
  const tracks = await loadAlbumAsPlaylistTracks(release);
  if (tracks.length > 0) onPlayPlaylist(tracks, release.title);
}

export function ReleaseCard({
  release,
  index,
  reduced,
  onOpen,
  onPlay,
}: {
  release: DiscoverReleaseCard;
  index: number;
  reduced: boolean;
  onOpen: () => void;
  onPlay: () => void;
}) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="noir-collection-card noir-home-shelf-card group noir-focus-ring"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: index * 0.03 }}
    >
      <span className="relative block">
        <NoirArtwork
          source={release.image}
          world={worldForCollection(release.id)}
          seed={release.id}
          size={168}
        />
        <motion.button
          type="button"
          className="noir-discover-release-play noir-play-round !h-10 !w-10 noir-focus-ring"
          aria-label={`${strings.discover.playRelease}: ${release.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          whileTap={{ scale: 0.94 }}
          transition={MOTION.tap}
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </motion.button>
      </span>
      <span className="min-w-0">
        <span className="noir-song-title block truncate">{release.title}</span>
        <span className="noir-song-meta mt-0.5 block truncate">
          {strings.discover.releaseMeta(release.artist, formatReleaseDate(release.releaseDate))}
        </span>
      </span>
    </motion.div>
  );
}

