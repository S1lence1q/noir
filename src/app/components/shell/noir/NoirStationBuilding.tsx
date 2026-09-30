import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { strings } from '../../../constants/strings';
import { EASE_PREMIUM, prefersReducedMotion } from '../../../utils/motionPresets';
import { NoirSeedSign } from './NoirSeedSign';

type NoirStationBuildingProps = {
  artists: string[];
  /** The station is built and the first track is being cued. */
  cueing: boolean;
  /** Title of the track being cued, once known. */
  title?: string | null;
};

/** How long "reading your picks" stays up before the search for tracks takes over the stage. */
const READ_MS = 900;

/**
 * First-run takeover: the one screen that owns the wait between "Start listening" and the first note.
 * The seed from the picker carries over and fills out as the station comes together.
 */
export function NoirStationBuilding({ artists, cueing, title }: NoirStationBuildingProps) {
  const reduced = prefersReducedMotion();
  const [read, setRead] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRead(true), READ_MS);
    return () => clearTimeout(id);
  }, []);

  const stage = cueing ? 2 : read ? 1 : 0;
  const steps = [strings.home.buildReading, strings.home.buildFinding, strings.home.buildCueing];
  const names = artists.length > 3 ? `${artists.slice(0, 3).join(', ')} +${artists.length - 3}` : artists.join(', ');

  return (
    <motion.div
      className="noir-station-building"
      role="status"
      aria-live="polite"
      aria-label={strings.home.buildTitle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: reduced ? 1 : 1.02 }}
      transition={{ duration: reduced ? 0.15 : 0.4, ease: EASE_PREMIUM }}
    >
      <div className="noir-station-building-card">
        <NoirSeedSign
          picks={[1, 3, 6][stage]}
          size={168}
          className="noir-station-building-sign"
        />
        <h2 className="noir-station-building-title">{strings.home.buildTitle}</h2>
        {names && <p className="noir-station-building-names">{names}</p>}
        <ol className="noir-station-building-steps">
          {steps.map((label, i) => {
            const state = i < stage ? 'done' : i === stage ? 'active' : 'todo';
            return (
              <li key={label} className="noir-station-building-step" data-state={state}>
                <span className="noir-station-building-dot" aria-hidden>
                  {state === 'done' ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span className="noir-station-building-label">
                  {i === 2 && title ? `${label} · ${title}` : label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </motion.div>
  );
}
