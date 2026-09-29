import { motion } from 'motion/react';
import { prefersReducedMotion } from '../../../utils/motionPresets';

/**
 * Play ↔ pause as one shape that morphs: the triangle splits into two halves that
 * square off into the pause bars. Both states use two 4-point paths so the morph is clean.
 */
const PLAY = ['M7 4.5 L12.5 7.8 L12.5 16.2 L7 19.5 Z', 'M12.5 7.8 L19.5 12 L19.5 12 L12.5 16.2 Z'];
const PAUSE = ['M6.5 5 L10.5 5 L10.5 19 L6.5 19 Z', 'M13.5 5 L17.5 5 L17.5 19 L13.5 19 Z'];

export function NoirPlayPauseIcon({ playing, size = 16 }: { playing: boolean; size?: number }) {
  const shapes = playing ? PAUSE : PLAY;
  const transition = prefersReducedMotion()
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.6 };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      {shapes.map((d, i) => (
        <motion.path
          key={i}
          initial={false}
          animate={{ d }}
          transition={transition}
          fill="currentColor"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
