import { useMemo, useState } from 'react';
import { ChevronRight, Globe, Info, Keyboard, Volume1, Volume2, VolumeX, Waves, Palette } from 'lucide-react';
import { readAtmosphereMode, setAtmosphereMode, type AtmosphereMode } from '../../../utils/atmosphere';
import { readLyricsTimingControls, setLyricsTimingControls } from '../../../utils/lyricsTiming';
import { readExtraLyricsSource, setExtraLyricsSource } from '../../../utils/lyricsSources';
import * as Slider from '@radix-ui/react-slider';
import { STOREFRONT_COUNTRIES } from '../../../utils/chartFeeds';
import { showMiniHUD } from '../../../utils/hudUtils';
import { clearListeningEvents } from '../../../services/listening/eventsStore';
import { strings } from '../../../constants/strings';
import type { AutoplayPreference } from '../../../hooks/useQueueEndPrompt';

const APP_VERSION = '1.0.0';
const GAPLESS_STASH_KEY = 'elva_crossfade_before_gapless';
const AUTOPLAY_STORAGE_KEY = 'elva_autoplay';

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

function clearCachedData() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith('elva_apple_chart_') ||
      key.startsWith('elva_discography_v2_') ||
      key === 'elva_discography_index_v2' ||
      key.startsWith('elva_artist_img_')
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  return keysToRemove.length;
}

export function NoirSettingsView() {
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('elva_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });

  const [crossfade, setCrossfade] = useState<number>(() => {
    const saved = localStorage.getItem('elva_crossfade_duration');
    return saved !== null ? parseFloat(saved) : 3.0;
  });

  const [country, setCountry] = useState(
    () => localStorage.getItem('elva_profile_country') || 'dk'
  );
  const [autoplay, setAutoplay] = useState<AutoplayPreference>(() => readAutoplayPreference());
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>(readAtmosphereMode);
  const [lyricsTiming, setLyricsTiming] = useState(readLyricsTimingControls);
  const [extraLyrics, setExtraLyrics] = useState(readExtraLyricsSource);

  const gapless = crossfade === 0;

  const activeCountry = useMemo(
    () => STOREFRONT_COUNTRIES.find((c) => c.code === country) ?? STOREFRONT_COUNTRIES[0],
    [country]
  );

  const onVolumeChange = (val: number) => {
    setVolume(val);
    localStorage.setItem('elva_player_volume', String(val));
    window.dispatchEvent(new CustomEvent('elva-set-volume', { detail: { volume: val } }));
  };

  const handleCrossfadeChange = (val: number) => {
    setCrossfade(val);
    localStorage.setItem('elva_crossfade_duration', String(val));
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
      localStorage.setItem('elva_pre_mute_volume', String(volume));
      onVolumeChange(0);
    } else {
      const saved = localStorage.getItem('elva_pre_mute_volume');
      const restoreVol = saved ? parseInt(saved, 10) : 70;
      onVolumeChange(restoreVol > 0 ? restoreVol : 70);
    }
  };

  const handleCountryChange = (code: string) => {
    setCountry(code);
    localStorage.setItem('elva_profile_country', code);
    window.dispatchEvent(new CustomEvent('elva-profile-updated'));
  };

  const handleClearHistory = () => {
    localStorage.setItem('elva_recently_played', '[]');
    window.dispatchEvent(new CustomEvent('elva-recently-played-cleared'));
    void clearListeningEvents().catch((error) => {
      console.warn('Failed to clear listening events:', error);
    });
    showMiniHUD('Play history cleared');
  };

  const handleClearCache = () => {
    const count = clearCachedData();
    showMiniHUD(count > 0 ? `Cleared ${count} cached items` : 'Cache already empty');
  };

  return (
    <div className="noir-settle-group noir-settings noir-content--settings pb-10">
      <SettingsCard title="Playback" icon={Volume2}>
        <SettingsRow label="Volume">
          <div className="noir-settings-slider-wrap">
            <button
              type="button"
              onClick={toggleMute}
              className="text-[color:var(--noir-text-tertiary)] hover:text-white transition-colors shrink-0"
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              data-tip={volume === 0 ? 'Unmute' : 'Mute'}
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

        <SettingsRow label="Crossfade" description="Blend between tracks">
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
            <span className="noir-settings-slider-value">{gapless ? 'Off' : `${crossfade}s`}</span>
          </div>
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label="Gapless playback" description="Instant transitions, no crossfade">
          <NoirSwitch checked={gapless} onChange={handleGaplessChange} />
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow label={strings.settings.autoplay} description={strings.settings.autoplayDesc} stacked>
          <div className="noir-settings-select-wrap">
            <select
              value={autoplay}
              onChange={(e) => {
                const next = e.target.value as AutoplayPreference;
                setAutoplay(next);
                localStorage.setItem(AUTOPLAY_STORAGE_KEY, next);
              }}
              className="noir-settings-select"
              aria-label={strings.settings.autoplay}
            >
              <option value="ask">{strings.settings.autoplayAsk}</option>
              <option value="on">{strings.settings.autoplayOn}</option>
              <option value="off">{strings.settings.autoplayOff}</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--noir-text-tertiary)]">
              ▾
            </span>
          </div>
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow
          label="Lyrics timing controls"
          description="Show buttons to nudge lyrics earlier or later when they are slightly off"
        >
          <NoirSwitch
            checked={lyricsTiming}
            onChange={(on) => {
              setLyricsTiming(on);
              setLyricsTimingControls(on);
            }}
          />
        </SettingsRow>

        <div className="noir-settings-divider" />

        <SettingsRow
          label="Extra lyrics source"
          description="Looks for synced lyrics on Apple Music when the main source has none. Third party: may stop working"
        >
          <NoirSwitch
            checked={extraLyrics}
            onChange={(on) => {
              setExtraLyrics(on);
              setExtraLyricsSource(on);
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Appearance" icon={Palette}>
        <SettingsRow label="Now Playing background" description="From the cover: a soft glow, or its colours as grain">
          <div className="noir-segmented" role="radiogroup" aria-label="Now Playing background">
            {(['glow', 'grain'] as AtmosphereMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={atmosphere === mode}
                data-active={atmosphere === mode ? 'true' : 'false'}
                className="noir-segmented-item elva-focus-ring"
                onClick={() => {
                  setAtmosphere(mode);
                  setAtmosphereMode(mode);
                }}
              >
                {mode === 'glow' ? 'Glow' : 'Grain'}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Library" icon={Globe}>
        <SettingsRow label="Charts region" description="Local chart on Discover" stacked>
          <div className="noir-settings-select-wrap">
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="noir-settings-select"
              aria-label="Charts region"
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
          <p className="mt-2 text-[12px] text-[color:var(--noir-text-tertiary)]">
            Currently {activeCountry.flag} {activeCountry.name}
          </p>
        </SettingsRow>

        <div className="noir-settings-divider" />

        <ActionLink label="Clear play history" onClick={handleClearHistory} destructive />
        <div className="noir-settings-divider" />
        <ActionLink label="Clear cached data" onClick={handleClearCache} />
      </SettingsCard>

      <SettingsCard title="About" icon={Info}>
        <div className="noir-settings-about-brand">
          <span className="text-[12px] font-bold tracking-[0.34em] text-[color:var(--noir-text-primary)]">NOIR</span>
          <span className="text-[13px] tabular-nums text-[color:var(--noir-text-tertiary)]">v{APP_VERSION}</span>
        </div>

        <div className="noir-settings-divider" />

        <ActionLink
          label="Keyboard shortcuts"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
          }}
        />
        <div className="noir-settings-divider" />
        <ActionLink
          label="Reset onboarding"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('elva-reset-tour'));
            showMiniHUD('Onboarding reset');
          }}
        />
      </SettingsCard>
    </div>
  );
}
