import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import type { SearchResult } from '../../../types';
import { strings } from '../../../constants/strings';
import { COLOR_WORLDS, renderGrainField, worldForCollection } from '../../../utils/ditherCover';
import { useGraphicsTheme } from '../../../utils/graphicsTheme';
import { NoirHistoryHeat } from './NoirHistoryHeat';
import { heroField, heroInk, heroWorld } from './NoirHomeHero';

/**
 * History's one graphic: a song from your history as grain in its own cover's colours (the same
 * atmosphere Now Playing uses). It works from the first listen and is never live: it's chosen when
 * the page opens, so nothing moves while you look.
 */
export function NoirHistoryHero({
  track,
  eyebrow,
  meta,
  plays,
  onPlay,
}: {
  track: SearchResult;
  eyebrow: string;
  meta: string;
  plays: number;
  onPlay: () => void;
}) {
  const art = useGraphicsTheme();
  const heatWorld = heroWorld(track);
  const [grain, setGrain] = useState<string | null>(null);
  const world = COLOR_WORLDS[worldForCollection(`${track.artist}:${track.title}`)];

  useEffect(() => {
    setGrain(null);
    if (art !== 'grain' || !track.thumbnail) return;
    let cancelled = false;
    renderGrainField(track.thumbnail)
      .then((url) => !cancelled && setGrain(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [track.thumbnail, art]);

  return (
    <section
      className="noir-history-hero"
      data-art={art}
      style={art === 'heat' ? { background: heroField(heatWorld), color: heroInk(heatWorld) } : undefined}
    >
      {art === 'heat' && <NoirHistoryHeat world={heatWorld} seed={`${track.id}|${plays}`} plays={plays} />}
      {art === 'grain' && (
      <div
        className="noir-history-hero-field"
        data-ready={grain || !track.thumbnail ? 'true' : undefined}
        style={grain ? { backgroundImage: `url(${grain})` } : { background: world.field }}
        aria-hidden
      />
      )}
      <div className="noir-history-hero-copy">
        <p className="noir-history-hero-eyebrow">{eyebrow}</p>
        <h2 className="noir-history-hero-title" data-tip={track.title}>
          {track.title}
        </h2>
        <p className="noir-history-hero-artist">{meta}</p>
        <button
          type="button"
          className="noir-play-round mt-5 elva-focus-ring"
          onClick={onPlay}
          aria-label={strings.library.historyPlayAgain}
          data-tip={strings.library.historyPlayAgain}
        >
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </button>
      </div>
    </section>
  );
}
