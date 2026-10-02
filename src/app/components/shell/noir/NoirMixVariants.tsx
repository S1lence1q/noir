import { Play } from 'lucide-react';
import { DailyMix } from '../../../services/mixes/dailyMixes';
import { COLOR_WORLDS, type ColorWorld } from '../../../utils/ditherCover';
import { NoirHomeShelf } from './NoirHomeShelf';
import { NoirMixCover, inkOn } from './NoirMixCover';

type Props = {
  mixes: DailyMix[];
  worlds: ColorWorld[];
  onOpen: (mix: DailyMix, world: ColorWorld) => void;
  onPlay: (mix: DailyMix) => void;
};

/** Dev compare sheet for the Home mixes row: open Home with `?mixes`. */
export function NoirMixVariants({ mixes, worlds, onOpen, onPlay }: Props) {
  const fieldOf = (i: number) => ({ background: COLOR_WORLDS[worlds[i]].field, color: inkOn(worlds[i]) });
  const playButton = (mix: DailyMix, className: string) => (
    <button
      type="button"
      className={`${className} noir-focus-ring`}
      aria-label={`${mix.name}`}
      onClick={(e) => {
        e.stopPropagation();
        onPlay(mix);
      }}
    >
      <Play className="ml-0.5 h-4 w-4 fill-current" />
    </button>
  );

  return (
    <div className="noir-content flex flex-col gap-10 py-6">
      <section>
        <h2 className="noir-section-heading px-1">A · Posters (current)</h2>
        <NoirHomeShelf>
          {mixes.map((mix, i) => (
            <div key={mix.id} role="button" tabIndex={0} className="noir-home-poster" style={fieldOf(i)} onClick={() => onOpen(mix, worlds[i])}>
              <span className="relative block">
                <NoirMixCover tag={mix.tag} world={worlds[i]} size={152} radius={0} />
                {playButton(mix, 'noir-home-poster-play')}
              </span>
              <span className="noir-home-poster-text">
                <span className="noir-home-poster-name">{mix.name}</span>
                <span className="noir-home-poster-meta">{mix.subtitle}</span>
              </span>
            </div>
          ))}
        </NoirHomeShelf>
      </section>

      <section>
        <h2 className="noir-section-heading px-1">B · Banners</h2>
        <div className="noir-home-banners">
          {mixes.slice(0, 6).map((mix, i) => (
            <div key={mix.id} role="button" tabIndex={0} className="noir-home-banner" style={fieldOf(i)} onClick={() => onOpen(mix, worlds[i])}>
              <span className="noir-home-banner-text">
                <span className="noir-home-banner-name">{mix.name.replace(/\s+Mix$/, '')}</span>
                <span className="noir-home-banner-meta">{mix.subtitle}</span>
              </span>
              <NoirMixCover tag={mix.tag} world={worlds[i]} size={92} radius={0} />
              {playButton(mix, 'noir-home-banner-play')}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="noir-section-heading px-1">C · Pills</h2>
        <div className="noir-home-pills">
          {mixes.map((mix, i) => (
            <div key={mix.id} role="button" tabIndex={0} className="noir-home-pill" onClick={() => onOpen(mix, worlds[i])}>
              <NoirMixCover tag={mix.tag} world={worlds[i]} size={44} radius={999} />
              <span className="min-w-0">
                <span className="noir-song-title block truncate">{mix.name}</span>
                <span className="noir-song-meta block truncate">{mix.subtitle}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="noir-section-heading px-1">D · Fan</h2>
        <div className="noir-home-fan">
          {mixes.map((mix, i) => (
            <div
              key={mix.id}
              role="button"
              tabIndex={0}
              className="noir-home-poster noir-home-fan-card"
              style={{ ...fieldOf(i), zIndex: i }}
              onClick={() => onOpen(mix, worlds[i])}
            >
              <span className="relative block">
                <NoirMixCover tag={mix.tag} world={worlds[i]} size={152} radius={0} />
              </span>
              <span className="noir-home-poster-text">
                <span className="noir-home-poster-name">{mix.name}</span>
                <span className="noir-home-poster-meta">{mix.subtitle}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
