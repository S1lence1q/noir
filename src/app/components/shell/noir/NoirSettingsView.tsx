import { useState } from 'react';
import { RefreshCw, Keyboard, Volume2, Volume1, VolumeX } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { showMiniHUD } from '../../../utils/hudUtils';

export type NoirSettingsViewProps = {
  zenMode: boolean;
  onZenModeChange: (zen: boolean) => void;
  textureStyle: 'paper' | 'dots' | 'none';
  onTextureStyleChange: (style: 'paper' | 'dots' | 'none') => void;
  enable3DTilt: boolean;
  onEnable3DTiltChange: (enable: boolean) => void;
  enableCustomLyrics: boolean;
  onEnableCustomLyricsChange: (enable: boolean) => void;
};

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[color:var(--noir-text-primary)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-[13px] text-[color:var(--noir-text-tertiary)]">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NoirSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-200 ${
        checked ? 'bg-white/25' : 'bg-white/[0.08]'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-full transition-all duration-200 ${
          checked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white/50'
        }`}
      />
    </button>
  );
}

export function NoirSettingsView({
  zenMode,
  onZenModeChange,
  textureStyle,
  onTextureStyleChange,
  enable3DTilt,
  onEnable3DTiltChange,
  enableCustomLyrics,
  onEnableCustomLyricsChange,
}: NoirSettingsViewProps) {
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('elva_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });

  const onVolumeChange = (val: number) => {
    setVolume(val);
    localStorage.setItem('elva_player_volume', String(val));
    window.dispatchEvent(new CustomEvent('elva-volume-change', { detail: { volume: val } }));
  };

  const [crossfade, setCrossfade] = useState<number>(() => {
    const saved = localStorage.getItem('elva_crossfade_duration');
    return saved !== null ? parseFloat(saved) : 3.0;
  });

  const handleCrossfadeChange = (val: number) => {
    setCrossfade(val);
    localStorage.setItem('elva_crossfade_duration', String(val));
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

  const [country, setCountry] = useState(
    () => localStorage.getItem('elva_profile_country') || 'dk'
  );

  const handleCountryChange = (code: string) => {
    setCountry(code);
    localStorage.setItem('elva_profile_country', code);
    window.dispatchEvent(new CustomEvent('elva-profile-updated'));
  };

  const countries = [
    { code: 'dk', name: 'Denmark', flag: '🇩🇰' },
    { code: 'us', name: 'United States', flag: '🇺🇸' },
    { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'se', name: 'Sweden', flag: '🇸🇪' },
    { code: 'de', name: 'Germany', flag: '🇩🇪' },
    { code: 'fr', name: 'France', flag: '🇫🇷' },
  ];

  return (
    <div className="flex flex-col gap-0 pb-8">
      {/* ── Audio ────────────────────────────── */}
      <section>
        <h3 className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--noir-text-tertiary)]">
          Audio
        </h3>

        <SettingRow label="Volume">
          <div className="flex w-[200px] items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className="text-[color:var(--noir-text-tertiary)] hover:text-white transition-colors shrink-0"
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
              className="relative flex flex-1 items-center h-4 cursor-pointer group/slider select-none"
            >
              <Slider.Track className="relative h-[2px] w-full rounded-full bg-white/[0.08] overflow-hidden">
                <Slider.Range className="absolute h-full bg-white/40" />
              </Slider.Track>
              <Slider.Thumb className="block h-2.5 w-2.5 rounded-full bg-white opacity-0 group-hover/slider:opacity-100 focus:opacity-100 focus:outline-none transition-opacity duration-150" />
            </Slider.Root>
            <span className="w-8 text-right text-[12px] tabular-nums text-[color:var(--noir-text-secondary)]">
              {volume}
            </span>
          </div>
        </SettingRow>

        <div className="h-px bg-[color:var(--noir-rule-faint)]" />

        <SettingRow label="Crossfade" description="Blend between tracks">
          <div className="flex w-[200px] items-center gap-3">
            <Slider.Root
              value={[crossfade]}
              max={12}
              step={1}
              onValueChange={(val) => handleCrossfadeChange(val[0])}
              className="relative flex flex-1 items-center h-4 cursor-pointer group/slider select-none"
            >
              <Slider.Track className="relative h-[2px] w-full rounded-full bg-white/[0.08] overflow-hidden">
                <Slider.Range className="absolute h-full bg-white/40" />
              </Slider.Track>
              <Slider.Thumb className="block h-2.5 w-2.5 rounded-full bg-white opacity-0 group-hover/slider:opacity-100 focus:opacity-100 focus:outline-none transition-opacity duration-150" />
            </Slider.Root>
            <span className="w-8 text-right text-[12px] tabular-nums text-[color:var(--noir-text-secondary)]">
              {crossfade === 0 ? 'Off' : `${crossfade}s`}
            </span>
          </div>
        </SettingRow>
      </section>

      <div className="my-5 h-px bg-[color:var(--noir-rule-faint)]" />

      {/* ── Player ───────────────────────────── */}
      <section>
        <h3 className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--noir-text-tertiary)]">
          Player
        </h3>

        <SettingRow label="Zen Mode" description="Auto-hide controls after 3s of inactivity">
          <NoirSwitch checked={zenMode} onChange={onZenModeChange} />
        </SettingRow>
        <div className="h-px bg-[color:var(--noir-rule-faint)]" />

        <SettingRow label="Film Grain" description="Analog noise overlay on artwork">
          <NoirSwitch checked={textureStyle !== 'none'} onChange={(on) => onTextureStyleChange(on ? 'paper' : 'none')} />
        </SettingRow>
        <div className="h-px bg-[color:var(--noir-rule-faint)]" />

        <SettingRow label="3D Tilt" description="Parallax effect on album artwork">
          <NoirSwitch checked={enable3DTilt} onChange={onEnable3DTiltChange} />
        </SettingRow>
        <div className="h-px bg-[color:var(--noir-rule-faint)]" />

        <SettingRow label="Lyrics Editor" description="Edit or upload custom lyrics">
          <NoirSwitch checked={enableCustomLyrics} onChange={onEnableCustomLyricsChange} />
        </SettingRow>
      </section>

      <div className="my-5 h-px bg-[color:var(--noir-rule-faint)]" />

      {/* ── Charts ───────────────────────────── */}
      <section>
        <h3 className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--noir-text-tertiary)]">
          Charts region
        </h3>

        <SettingRow label="Country" description="Charts on Discover">
          <div className="flex flex-wrap gap-1.5">
            {countries.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCountryChange(c.code)}
                className={`rounded-[var(--noir-radius-sm)] px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  country === c.code
                    ? 'bg-white/[0.12] text-[color:var(--noir-text-primary)]'
                    : 'bg-[color:var(--noir-elevated)] text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.06] hover:text-[color:var(--noir-text-secondary)]'
                }`}
              >
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </SettingRow>
      </section>

      <div className="my-5 h-px bg-[color:var(--noir-rule-faint)]" />

      {/* ── Utilities ────────────────────────── */}
      <section>
        <h3 className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--noir-text-tertiary)]">
          Utilities
        </h3>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('elva-reset-tour'));
              showMiniHUD('Tour reset');
            }}
            className="noir-track-row flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-[color:var(--noir-text-secondary)] hover:text-white"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            Reset Tour
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
            }}
            className="noir-track-row flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-[color:var(--noir-text-secondary)] hover:text-white"
          >
            <Keyboard className="h-4 w-4" strokeWidth={1.75} />
            Keyboard Shortcuts
          </button>
        </div>
      </section>
    </div>
  );
}
