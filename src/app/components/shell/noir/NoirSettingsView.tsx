import { useMemo, useState } from 'react';
import { ChevronRight, Globe, Info, Volume1, Volume2, VolumeX, Waves, Palette } from 'lucide-react';
import { setGraphicsTheme, useGraphicsTheme, type GraphicsTheme } from '../../../utils/graphicsTheme';
import { readLyricsTimingControls, setLyricsTimingControls } from '../../../utils/lyricsTiming';
import { readExtraLyricsSource, setExtraLyricsSource } from '../../../utils/lyricsSources';
import * as Slider from '@radix-ui/react-slider';
import { readProfileCountry, STOREFRONT_COUNTRIES } from '../../../utils/chartFeeds';
import { showMiniHUD } from '../../../utils/hudUtils';
import { clearListeningEvents } from '../../../services/listening/eventsStore';
import { strings } from '../../../constants/strings';
import type { AutoplayPreference } from '../../../hooks/useQueueEndPrompt';
import type { SearchResult } from '../../../types';
import { NoirGrainField } from './NoirGrainField';
import { NoirHistoryHeat } from './NoirHistoryHeat';
import { heroField, heroInk, heroWorld } from './NoirHomeHero';

const APP_VERSION = '1.0.0';
const GAPLESS_STASH_KEY = 'noir_crossfade_before_gapless';
const AUTOPLAY_STORAGE_KEY = 'noir_autoplay';

function readAutoplayPreference(): AutoplayPreference {
  const value = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
  return value === 'on' || value === 'off' ? value : 'ask';
}

function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <section className="noir-settings-card">
      <header className="noir-settings-card-header">
        <Icon className="h-4 w-4 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
        <h3 className="text-[13px] font-semibold text-[color:var(--noir-text-primary)]">{title}</h3>
      </header>
      <div className="noir-settings-card-body">{children}</div>
    </section>
  );
}

function SettingsRow({
  label,
  description,
  children,
  stacked,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div className={`noir-settings-row ${stacked ? 'noir-settings-row--stacked' : ''}`}>
      <div className="noir-settings-row-label">
        <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-[13px] text-[color:var(--noir-text-tertiary)]">{description}</p>
        )}
      </div>
      <div className="noir-settings-row-control">{children}</div>
    </div>
  );
}

function NoirSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`noir-settings-switch ${checked ? 'noir-settings-switch--on' : ''} ${disabled ? 'opacity-40' : ''}`}
    >
      <span className="noir-settings-switch-thumb" />
    </button>
  );
}

function ActionLink({
  label,
  onClick,
  destructive,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`noir-settings-action ${destructive ? 'noir-settings-action--destructive' : ''}`}
    >
      <span>{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-40" strokeWidth={1.75} />
    </button>
  );
}

const PREVIEW_FALLBACK: SearchResult = { id: 'noir-preview', title: '', artist: 'NOIR', thumbnail: '', videoId: '' };

/** A song you played, so the previews show your own covers. Read once when Settings opens. */
function readPreviewTrack(): SearchResult {
  try {
    const list = JSON.parse(localStorage.getItem('noir_recently_played') || '[]');
    const hit = Array.isArray(list) ? list.find((t: SearchResult) => t?.thumbnail) : null;
    return hit ?? PREVIEW_FALLBACK;
  } catch {
    return PREVIEW_FALLBACK;
  }
}

/** The graphics choice as two real pictures from the same song: pick the one you like. */
function GraphicsChoice({ value, track }: { value: GraphicsTheme; track: SearchResult }) {
  const world = heroWorld(track);
  const tiles: { theme: GraphicsTheme; label: string }[] = [
    { theme: 'heat', label: strings.settings.graphicsHeat },
    { theme: 'grain', label: strings.settings.graphicsGrain },
  ];
  return (
    <div className="noir-graphics-choice" role="radiogroup" aria-label={strings.settings.graphics}>
      {tiles.map(({ theme, label }) => (
        <button
          key={theme}
          type="button"
          role="radio"
          aria-checked={value === theme}
          data-active={value === theme ? 'true' : 'false'}
          className="noir-graphics-tile noir-focus-ring"
          onClick={() => setGraphicsTheme(theme)}
        >
          <span
            className="noir-graphics-tile-art"
            style={theme === 'heat' ? { background: heroField(world), color: heroInk(world) } : undefined}
          >
            {theme === 'heat' ? (
              <NoirHistoryHeat world={world} seed={`settings|${track.id}`} plays={6} />
            ) : (
              <NoirGrainField track={track} />
            )}
          </span>
          <span className="noir-graphics-tile-label">{label}</span>
        </button>
      ))}
    </div>
  );
}

function clearCachedData() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith('noir_apple_chart_') ||
      key.startsWith('noir_discography_v2_') ||
      key === 'noir_discography_index_v2' ||
      key.startsWith('noir_artist_img_')
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  return keysToRemove.length;
}

export function NoirSettingsView() {
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('noir_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });

  const [crossfade, setCrossfade] = useState<number>(() => {
    const saved = localStorage.getItem('noir_crossfade_duration');
    return saved !== null ? parseFloat(saved) : 3.0;
  });

  const [country, setCountry] = useState(readProfileCountry);
  const [previewTrack] = useState(readPreviewTrack);
  const [autoplay, setAutoplay] = useState<AutoplayPreference>(() => readAutoplayPreference());
  const graphics = useGraphicsTheme();
  const [lyricsTiming, setLyricsTiming] = useState(readLyricsTimingControls);
  const [extraLyrics, setExtraLyrics] = useState(readExtraLyricsSource);

  const gapless = crossfade === 0;

  const activeCountry = useMemo(
    () => STOREFRONT_COUNTRIES.find((c) => c.code === country) ?? STOREFRONT_COUNTRIES[0],
    [country]
  );

  const onVolumeChange = (val: number) => {
    setVolume(val);
    localStorage.setItem('noir_player_volume', String(val));
    window.dispatchEvent(new CustomEvent('noir-set-volume', { detail: { volume: val } }));
  };

  const handleCrossfadeChange = (val: number) => {
    setCrossfade(val);
    localStorage.setItem('noir_crossfade_duration', String(val));
    if (val > 0) {
      localStorage.setItem(GAPLESS_STASH_KEY, String(val));
    }
  };

  const handleGaplessChange = (enabled: boolean) => {
    if (enabled) {
      if (crossfade > 0) {
        localStorage.setItem(GAPLESS_STASH_KEY, String(crossfade));
      }
      handleCrossfadeChange(0);
      return;
    }
    const stashed = localStorage.getItem(GAPLESS_STASH_KEY);
    const restore = stashed ? parseFloat(stashed) : 3;
    handleCrossfadeChange(restore > 0 ? restore : 3);
  };

  const toggleMute = () => {
    if (volume > 0) {
      localStorage.setItem('noir_pre_mute_volume', String(volume));
      onVolumeChange(0);
    } else {
      const saved = localStorage.getItem('noir_pre_mute_volume');
      const restoreVol = saved ? parseInt(saved, 10) : 70;
      onVolumeChange(restoreVol > 0 ? restoreVol : 70);
    }
  };

  const handleCountryChange = (code: string) => {
    setCountry(code);
    localStorage.setItem('noir_profile_country', code);
    window.dispatchEvent(new CustomEvent('noir-profile-updated'));
  };

  const handleClearHistory = () => {
    localStorage.setItem('noir_recently_played', '[]');
    window.dispatchEvent(new CustomEvent('noir-recently-played-cleared'));
    void clearListeningEvents().catch((error) => {
      console.warn('Failed to clear listening events:', error);
    });
    showMiniHUD(strings.settings.historyCleared);
  };

  const handleClearCache = () => {
    const count = clearCachedData();
    showMiniHUD(count > 0 ? strings.settings.cacheCleared(count) : strings.settings.cacheEmpty);
  };

  const t = strings.settings;
  return (
    <div className="noir-settle-group noir-settings pb-10">
      <SettingsCard title={t.playback} icon={Volume2}>
        <SettingsRow label={t.volume}>
          <div className="noir-settings-slider-wrap">
            <button
              type="button"
              onClick={toggleMute}
              className="text-[color:var(--noir-text-tertiary)] hover:text-white transition-colors shrink-0"
              aria-label={volume === 0 ? t.unmute : t.mute}
              data-tip={volume === 0 ? t.unmute : t.mute}
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : volume < 50 ? (
                <Volume1 className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <Slider.Root
              value={[volume]}
              max={100}
              step={1}
              onValueChange={(val) => onVolumeChange(val[0])}
              className="noir-settings-slider"
            >
              <Slider.Track className="noir-settings-slider-track">
                <Slider.Range className="noir-settings-slider-range" />
              </Slider.Track>
              <Slider.Thumb className="noir-settings-slider-thumb" />
            </Slider.Root>
            <span className="noir-settings-slider-value">{volume}</span>
          </div>
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label={t.crossfade} description={t.crossfadeDesc}>
          <div className={`noir-settings-slider-wrap ${gapless ? 'opacity-40 pointer-events-none' : ''}`}>
            <Waves className="h-4 w-4 shrink-0 text-[color:var(--noir-text-tertiary)]" strokeWidth={1.75} />
            <Slider.Root
              value={[gapless ? 3 : crossfade]}
              max={12}
              min={1}
              step={1}
              disabled={gapless}
              onValueChange={(val) => handleCrossfadeChange(val[0])}
              className="noir-settings-slider"
            >
              <Slider.Track className="noir-settings-slider-track">
                <Slider.Range className="noir-settings-slider-range" />
              </Slider.Track>
              <Slider.Thumb className="noir-settings-slider-thumb" />
            </Slider.Root>
            <span className="noir-settings-slider-value">{gapless ? t.crossfadeOff : `${crossfade}s`}</span>
          </div>
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label={t.gapless} description={t.gaplessDesc}>
          <NoirSwitch checked={gapless} onChange={handleGaplessChange} />
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label={t.autoplay} description={t.autoplayDesc}>
          <div className="noir-segmented" role="radiogroup" aria-label={t.autoplay}>
            {(
              [
                ['ask', t.autoplayAsk],
                ['on', t.autoplayOn],
                ['off', t.autoplayOff],
              ] as [AutoplayPreference, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={autoplay === value}
                data-active={autoplay === value ? 'true' : 'false'}
                className="noir-segmented-item noir-focus-ring"
                onClick={() => {
                  setAutoplay(value);
                  localStorage.setItem(AUTOPLAY_STORAGE_KEY, value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label={t.lyricsTiming} description={t.lyricsTimingDesc}>
          <NoirSwitch
            checked={lyricsTiming}
            onChange={(on) => {
              setLyricsTiming(on);
              setLyricsTimingControls(on);
            }}
          />
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label={t.extraLyrics} description={t.extraLyricsDesc}>
          <NoirSwitch
            checked={extraLyrics}
            onChange={(on) => {
              setExtraLyrics(on);
              setExtraLyricsSource(on);
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <div className="noir-settings-side">
        <SettingsCard title={t.appearance} icon={Palette}>
          <SettingsRow label={t.graphics} description={t.graphicsDesc} stacked>
            <GraphicsChoice value={graphics} track={previewTrack} />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title={t.library} icon={Globe}>
          <SettingsRow label={t.chartsRegion} description={t.chartsRegionDesc}>
            <div className="noir-settings-select-wrap noir-settings-select-wrap--inline">
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="noir-settings-select"
                aria-label={t.chartsRegion}
              >
                {STOREFRONT_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--noir-text-tertiary)]">
                ▾
              </span>
            </div>
          </SettingsRow>

          <div className="noir-settings-divider" />

          <ActionLink label={t.clearHistory} onClick={handleClearHistory} destructive />
          <div className="noir-settings-divider" />
          <ActionLink label={t.clearCache} onClick={handleClearCache} />
        </SettingsCard>

        <SettingsCard title={t.about} icon={Info}>
          <div className="noir-settings-about-brand">
            <span className="text-[12px] font-bold tracking-[0.34em] text-[color:var(--noir-text-primary)]">NOIR</span>
            <span className="text-[13px] tabular-nums text-[color:var(--noir-text-tertiary)]">v{APP_VERSION}</span>
          </div>

          <div className="noir-settings-divider" />

          <ActionLink
            label={t.shortcuts}
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
            }}
          />
        </SettingsCard>
      </div>
    </div>
  );
}
