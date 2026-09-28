import { motion } from 'motion/react';
import { NoirMark } from './NoirMark';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';

type NoirPlaybackLoadingProps = {
  title?: string | null;
  artist?: string | null;
};

/** Full-canvas cue state while the first track resolves — replaces the old Elva spinner. */
export function NoirPlaybackLoading({ title, artist }: NoirPlaybackLoadingProps) {
  const reduced = prefersReducedMotion();
  const hasTrack = !!title?.trim();

  return (
    <motion.div
      className="noir-playback-loading"
      role="status"
      aria-live="polite"
      aria-label={hasTrack ? `Cueing ${title}` : 'Cueing track'}
      initial={reduced ? { opacity: 0 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.28, ease: EASE_PREMIUM }}
    >
      <div className="noir-playback-loading-veil" aria-hidden />
      <div className="noir-playback-loading-card">
        <span className="noir-playback-loading-glow" aria-hidden />
        <motion.span
          className="noir-playback-loading-mark"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={
            reduced ? undefined : { duration: 10, repeat: Infinity, ease: 'linear' }
          }
        >
          <NoirMark size={36} variant="spray" color="var(--noir-accent)" />
        </motion.span>
        <p className="noir-playback-loading-kicker">Cueing</p>
        {hasTrack ? (
          <div className="noir-playback-loading-meta">
            <p className="noir-playback-loading-title">{title}</p>
            {artist ? <p className="noir-playback-loading-artist">{artist}</p> : null}
          </div>
        ) : (
          <p className="noir-playback-loading-artist">Getting the track ready</p>
        )}
      </div>
    </motion.div>
  );
}
