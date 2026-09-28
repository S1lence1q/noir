import { AnimatePresence, motion } from 'motion/react';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { strings } from '../../../constants/strings';

type NoirQueueEndPromptProps = {
  isVisible: boolean;
  dontAskAgain: boolean;
  onDontAskAgainChange: (value: boolean) => void;
  onKeep: () => void;
  onDismiss: () => void;
};

/** Toast-card above the compact bar when the queue is about to run out. */
export function NoirQueueEndPrompt({
  isVisible,
  dontAskAgain,
  onDontAskAgainChange,
  onKeep,
  onDismiss,
}: NoirQueueEndPromptProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="noir-queue-end-prompt"
          role="dialog"
          aria-label={strings.nextUp.queueEndsSoon}
          initial={{ opacity: 0, y: 8, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 4, x: '-50%' }}
          transition={withReducedMotion(MOTION.panel)}
        >
          <p className="noir-queue-end-prompt-title">{strings.nextUp.queueEndsSoon}</p>
          <div className="noir-queue-end-prompt-row">
            <label className="noir-queue-end-prompt-check">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(event) => onDontAskAgainChange(event.target.checked)}
                className="accent-[var(--noir-accent)]"
              />
              {strings.nextUp.dontAskAgain}
            </label>
            <div className="noir-queue-end-prompt-actions">
              <button type="button" className="noir-button-secondary elva-focus-ring" onClick={onDismiss}>
                {strings.nextUp.noThanks}
              </button>
              <button type="button" className="noir-button-primary elva-focus-ring" onClick={onKeep}>
                {strings.nextUp.keepPlaying}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
