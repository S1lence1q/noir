import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Moon, Layers, Maximize2, Edit3, Volume2, VolumeX, Volume1 } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { AccentColor, ACCENT_THEMES, ACCENT_SWATCH } from './themeUtils';

interface SettingsModalProps {
  onClose: () => void;
  backgroundStyle?: 'default' | 'particles' | 'liquid' | 'mesh';
  onBackgroundStyleChange?: (style: 'default' | 'particles' | 'liquid' | 'mesh') => void;
  accentColor?: AccentColor;
  onAccentColorChange?: (color: AccentColor) => void;
  showVolumeSlider?: boolean;
  onShowVolumeSliderChange?: (show: boolean) => void;
  zenMode?: boolean;
  onZenModeChange?: (zen: boolean) => void;
  enable3DTilt?: boolean;
  onEnable3DTiltChange?: (enable: boolean) => void;
  showSettingsButton?: boolean;
  onShowSettingsButtonChange?: (show: boolean) => void;
  textureStyle?: 'paper' | 'dots' | 'none';
  onTextureStyleChange?: (style: 'paper' | 'dots' | 'none') => void;
  enableCustomLyrics?: boolean;
  onEnableCustomLyricsChange?: (enable: boolean) => void;
  showVisualizer?: boolean;
  onShowVisualizerChange?: (show: boolean) => void;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  peekProgressStyle?: string;
  onPeekProgressStyleChange?: (style: string) => void;
  navMode?: 'tabs' | 'scroll';
  onNavModeChange?: (mode: 'tabs' | 'scroll') => void;
  navPosition?: 'bottom' | 'top' | 'right';
  onNavPositionChange?: (pos: 'bottom' | 'top' | 'right') => void;
}

function NoirToggle({
  checked,
  onChange,
  label,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  icon: any;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-[var(--noir-radius-md)] px-3.5 py-3 text-left transition-colors duration-150 ${
        checked
          ? 'bg-white/[0.09] text-[color:var(--noir-text-primary)]'
          : 'bg-[color:var(--noir-elevated)] text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.06] hover:text-[color:var(--noir-text-secondary)]'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}

export function SettingsModal({
  onClose,
  backgroundStyle = 'mesh',
  onBackgroundStyleChange,
  accentColor = 'emerald',
  onAccentColorChange,
  showVolumeSlider = false,
  onShowVolumeSliderChange,
  zenMode = false,
  onZenModeChange,
  enable3DTilt = true,
  onEnable3DTiltChange,
  showSettingsButton = false,
  onShowSettingsButtonChange,
  textureStyle = 'paper',
  onTextureStyleChange,
  enableCustomLyrics = false,
  onEnableCustomLyricsChange,
  showVisualizer = false,
  onShowVisualizerChange,
  volume,
  onVolumeChange,
  navMode = 'tabs',
  onNavModeChange,
  navPosition = 'bottom',
  onNavPositionChange,
}: SettingsModalProps) {
  const [localVolume, setLocalVolume] = useState(() => {
    const saved = localStorage.getItem('noir_player_volume');
    return saved !== null ? parseInt(saved, 10) : 70;
  });

  const displayVolume = volume !== undefined ? volume : localVolume;

  const handleVolumeChangeInternal = (val: number) => {
    if (onVolumeChange) {
      onVolumeChange(val);
    } else {
      setLocalVolume(val);
      localStorage.setItem('noir_player_volume', String(val));
      window.dispatchEvent(new CustomEvent('noir-set-volume', { detail: { volume: val } }));
    }
  };

  const toggleMute = () => {
    if (displayVolume > 0) {
      localStorage.setItem('noir_pre_mute_volume', String(displayVolume));
      handleVolumeChangeInternal(0);
    } else {
      const saved = localStorage.getItem('noir_pre_mute_volume');
      const restoreVol = saved ? parseInt(saved, 10) : 70;
      handleVolumeChangeInternal(restoreVol > 0 ? restoreVol : 70);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || (e.code === 'Comma' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="noir-settings-panel w-full max-w-[360px] mx-4 flex flex-col overflow-hidden rounded-[var(--noir-radius-xl)] bg-[color:var(--noir-chrome)] border border-[color:var(--noir-rule-faint)] shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[color:var(--noir-text-primary)]">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--noir-text-tertiary)] hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-4 overflow-y-auto max-h-[70vh] scrollbar-none">
          {/* Volume */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--noir-text-tertiary)]">
                Volume
              </span>
              <span className="text-[11px] font-medium tabular-nums text-[color:var(--noir-text-secondary)]">
                {displayVolume}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className="text-[color:var(--noir-text-tertiary)] hover:text-white transition-colors shrink-0"
              >
                {displayVolume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : displayVolume < 50 ? (
                  <Volume1 className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <Slider.Root
                value={[displayVolume]}
                max={100}
                step={1}
                onValueChange={(val) => handleVolumeChangeInternal(val[0])}
                className="relative flex flex-1 items-center h-4 cursor-pointer group/slider select-none"
              >
                <Slider.Track className="relative h-[2px] w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <Slider.Range className="absolute h-full bg-white/40" />
                </Slider.Track>
                <Slider.Thumb className="block h-2.5 w-2.5 rounded-full bg-white opacity-0 group-hover/slider:opacity-100 focus:opacity-100 focus:outline-none transition-opacity duration-150" />
              </Slider.Root>
            </div>
          </section>

          <div className="h-px bg-[color:var(--noir-rule-faint)]" />

          {/* Player toggles */}
          <section className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--noir-text-tertiary)]">
              Player
            </span>
            <div className="grid grid-cols-2 gap-2">
              <NoirToggle
                checked={zenMode}
                onChange={(c) => onZenModeChange?.(c)}
                label="Zen Mode"
                icon={Moon}
              />
              <NoirToggle
                checked={textureStyle !== 'none'}
                onChange={(on) => onTextureStyleChange?.(on ? 'paper' : 'none')}
                label="Film Grain"
                icon={Layers}
              />
              <NoirToggle
                checked={enable3DTilt}
                onChange={(c) => onEnable3DTiltChange?.(c)}
                label="3D Tilt"
                icon={Maximize2}
              />
              <NoirToggle
                checked={enableCustomLyrics}
                onChange={(c) => onEnableCustomLyricsChange?.(c)}
                label="Lyrics Editor"
                icon={Edit3}
              />
            </div>
          </section>

          <div className="h-px bg-[color:var(--noir-rule-faint)]" />

          {/* Accent Color */}
          <section className="flex flex-col gap-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--noir-text-tertiary)]">
              Accent Color
            </span>
            <div className="flex items-center gap-3 px-0.5">
              {(['emerald', 'sand', 'wine', 'navy'] as AccentColor[]).map((color) => {
                const isActive = accentColor === color;
                const swatch = ACCENT_SWATCH[color];
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onAccentColorChange?.(color)}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 ${
                      isActive
                        ? 'scale-110 border-white/20'
                        : 'border-transparent opacity-55 hover:opacity-100 hover:scale-105'
                    }`}
                    title={ACCENT_THEMES[color].name}
                  >
                    <div
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: swatch.core }}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
