import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';

type NoirQueueEndPromptProps = {
  isVisible: boolean;
  /** Seconds left of the current (last) song — drives the hairline. */
  secondsLeft: number;
  onKeep: () => void;
  onDismiss: () => void;
};

/** Seconds of song the prompt represents; matches the 20 s trigger in useQueueEndPrompt. */
const WINDOW_S = 20;

/**
 * Queue ends soon — same surface family as the toast, one row, two verbs.
 * The hairline underneath empties with the song, so the card says *why* it is here.
 * "Always" is learned afterwards (see App), not asked up front with a checkbox.
 */
export function NoirQueueEndPrompt({ isVisible, secondsLeft, onKeep, onDismiss }: NoirQueueEndPromptProps) {
  // Toasts step up while this card holds the spot above the bar.
  useEffect(() => {
    const root = document.documentElement;
    if (isVisible) root.dataset.queueEndPrompt = 'true';
    else delete root.dataset.queueEndPrompt;
    return () => {
      delete root.dataset.queueEndPrompt;
    };
  }, [isVisible]);

  const left = Math.max(0, Math.min(1, secondsLeft / WINDOW_S));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="noir-queue-end-prompt"
          role="dialog"
          aria-label={strings.nextUp.queueEndsSoon}
          initial={{ opacity: 0, y: 14, scale: 0.97, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 6, scale: 0.98, x: '-50%', transition: withReducedMotion({ duration: 0.18, ease: 'easeIn' }) }}
          transition={withReducedMotion({ ...MOTION.settle, opacity: { duration: 0.2 } })}
        >
          <div className="noir-queue-end-prompt-body">
            <p className="noir-queue-end-prompt-title">{strings.nextUp.queueEndsSoon}</p>
            <p className="noir-queue-end-prompt-desc">{strings.nextUp.queueEndsSoonDesc}</p>
          </div>
          <button type="button" className="noir-toast-action noir-toast-action--quiet elva-focus-ring" onClick={onDismiss}>
            {strings.nextUp.notNow}
          </button>
          <button type="button" className="noir-button-primary elva-focus-ring" onClick={onKeep}>
            {strings.nextUp.keepPlaying}
          </button>
          <span className="noir-queue-end-prompt-time" aria-hidden>
            <span style={{ transform: `scaleX(${left})` }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
