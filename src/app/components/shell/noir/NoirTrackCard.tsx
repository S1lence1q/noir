import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { SearchResult } from '../../../types';
import { NoirArtwork } from './NoirArtwork';
import { worldForCollection } from '../../../utils/ditherCover';
import { EASE_PREMIUM, MOTION } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';

/** A song as a cover card for shelves: tap plays it. */
export function NoirTrackCard({
  track,
  index,
  reduced,
  onPlay,
}: {
  track: SearchResult;
  index: number;
  reduced: boolean;
  onPlay: () => void;
}) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay();
        }
      }}
      className="noir-collection-card noir-home-shelf-card group noir-focus-ring"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_PREMIUM, delay: index * 0.03 }}
    >
      <span className="relative block">
        <NoirArtwork
          source={track.thumbnail}
          world={worldForCollection(track.id)}
          seed={track.id}
          size={168}
        />
        <motion.span
          aria-hidden
          className="noir-discover-release-play noir-play-round !h-10 !w-10"
          whileTap={{ scale: 0.94 }}
          transition={MOTION.tap}
        >
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </motion.span>
      </span>
      <span className="min-w-0">
        <span className="noir-song-title block truncate">{track.title}</span>
        <span className="noir-song-meta mt-0.5 block truncate">{track.artist}</span>
      </span>
    </motion.div>
  );
}
