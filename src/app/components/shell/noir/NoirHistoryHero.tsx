import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { SearchResult } from "../../../types";
import { strings } from "../../../constants/strings";
import {
  COLOR_WORLDS,
  renderGrainField,
  worldForCollection,
} from "../../../utils/ditherCover";

/**
 * History's one graphic: the song that's on (or the last one played), as grain in its own cover's colours (the same
 * atmosphere Now Playing uses). It works from the first listen and changes with every one.
 */
export function NoirHistoryHero({
  track,
  playingNow,
  onPlay,
}: {
  track: SearchResult;
  playingNow: boolean;
  onPlay: () => void;
}) {
  const [grain, setGrain] = useState<string | null>(null);
  const world =
    COLOR_WORLDS[worldForCollection(`${track.artist}:${track.title}`)];

  useEffect(() => {
    setGrain(null);
    if (!track.thumbnail) return;
    let cancelled = false;
    renderGrainField(track.thumbnail)
      .then((url) => !cancelled && setGrain(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [track.thumbnail]);

  return (
    <section className="noir-history-hero">
      <div
        className="noir-history-hero-field"
        data-ready={grain || !track.thumbnail ? "true" : undefined}
        style={
          grain
            ? { backgroundImage: `url(${grain})` }
            : { background: world.field }
        }
        aria-hidden
      />
      <div className="noir-history-hero-copy" key={track.id}>
        <p className="noir-history-hero-eyebrow">
          {playingNow
            ? strings.library.historyPlayingNow
            : strings.library.historyLastPlayed}
        </p>
        <h2 className="noir-history-hero-title" data-tip={track.title}>
          {track.title}
        </h2>
        <p className="noir-history-hero-artist">{track.artist}</p>
        {/* Already playing: nothing to press. The button is for starting it again. */}
        {!playingNow && (
          <button
            type="button"
            className="noir-play-round mt-5 elva-focus-ring"
            onClick={onPlay}
            aria-label={strings.library.historyPlayAgain}
            data-tip={strings.library.historyPlayAgain}
          >
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </button>
        )}
      </div>
    </section>
  );
}
