import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, Plus, Settings, Volume1, Volume2, VolumeX } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { AccentColor, ACCENT_THEMES } from '../themeUtils';

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  videoId: string;
}

interface BottomBarControlsProps {
  showQueue: boolean;
  setShowQueue: (show: boolean) => void;
  focusSearchInQueue: boolean;
  setFocusSearchInQueue: (focus: boolean) => void;
  accentColor: AccentColor;
  queue: QueueItem[];
  showSettingsButton: boolean;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  isUserIdle: boolean;
  zenMode: boolean;
  showLyrics: boolean;
  isLargeScreen: boolean;
  showVolumeSlider?: boolean;
  volume?: number;
  onVolumeChange?: (v: number) => void;
  preMuteVolume?: number;
  setPreMuteVolume?: (v: number) => void;
}

export function BottomBarControls({
  showQueue,
  setShowQueue,
  focusSearchInQueue,
  setFocusSearchInQueue,
  accentColor,
  queue,
  showSettingsButton,
  showSettings,
  setShowSettings,
  isUserIdle,
  zenMode,
  showLyrics,
  isLargeScreen,
  showVolumeSlider = true,
  volume = 70,
  onVolumeChange,
  preMuteVolume = 70,
  setPreMuteVolume
}: BottomBarControlsProps) {
  const theme = ACCENT_THEMES[accentColor];

  const [isMutingAction, setIsMutingAction] = useState(false);
  const [chargeVolume, setChargeVolume] = useState<number | null>(null);
  const [projectile, setProjectile] = useState<{ x: number; y: number } | null>(null);

  const chargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flightFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const chargeDirectionRef = useRef<number>(1);

  const stopAnimation = () => {
    if (chargeIntervalRef.current !== null) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    if (flightFrameRef.current !== null) {
      cancelAnimationFrame(flightFrameRef.current);
      flightFrameRef.current = null;
    }
  };

  const launchProjectile = (targetVal: number) => {
    stopAnimation();
    
    const x0 = 24;
    const y0 = 21;
    const xt = 44 + (targetVal / 100) * 80;
    const yt = 21;
    
    const distance = xt - x0;
    const gravity = 0.35;
    
    // Launch angle: ranges from -20deg (low volume) to -40deg (high volume) to ensure a visible parabolic arc
    const angleDeg = -20 - (targetVal / 100) * 20;
    const angleRad = (angleDeg * Math.PI) / 180;
    
    const sin2Theta = Math.sin(2 * angleRad) || -0.5;
    const initialSpeed = Math.sqrt((distance * gravity) / -sin2Theta);
    
    let vx = initialSpeed * Math.cos(angleRad);
    let vy = initialSpeed * Math.sin(angleRad);
    
    let px = x0;
    let py = y0;
    
    const step = () => {
      px += vx;
      py += vy;
      vy += gravity;
      
      // Stop when it hits or goes below the track plane (Y >= 21) while falling down
      if (py >= yt && vy > 0) {
        onVolumeChange?.(targetVal);
        setProjectile(null);
        flightFrameRef.current = null;
      } else {
        setProjectile({ x: px, y: py });
        flightFrameRef.current = requestAnimationFrame(step);
      }
    };
    
    flightFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => stopAnimation();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 0 }}
      animate={{ 
        opacity: isUserIdle && zenMode ? 0 : 1,
        x: showLyrics && isLargeScreen ? -284 : 0
      }}
      transition={{ 
        opacity: { duration: 0.7 },
        x: { type: 'spring', stiffness: 180, damping: 25 }
      }}
      className={`mt-8 flex items-center justify-center gap-3 ${isUserIdle && zenMode ? 'pointer-events-none' : ''}`}
    >
      <div className="flex items-center rounded-full bg-black/35 border border-white/12 overflow-hidden backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all">
        <button
          id="add-music-button"
          onClick={(e) => {
            if (showQueue && focusSearchInQueue) {
              setShowQueue(false);
            } else {
              setFocusSearchInQueue(true);
              setShowQueue(true);
            }
            e.currentTarget.blur();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 ${
            showQueue && focusSearchInQueue
              ? `bg-white/[0.08] ${theme.textLight}`
              : 'text-white/60 hover:text-white/90 hover:bg-white/[0.03]'
          }`}
        >
          <Plus className={`w-4 h-4 transition-colors ${showQueue && focusSearchInQueue ? theme.text : 'text-white/40'}`} />
          <span className="text-sm font-medium tracking-wide">Add Music</span>
        </button>

        <div className="h-5 w-[1px] bg-white/10 shrink-0" />

        <button
          id="queue-button"
          onClick={(e) => {
            if (showQueue && !focusSearchInQueue) {
              setShowQueue(false);
            } else {
              setFocusSearchInQueue(false);
              setShowQueue(true);
            }
            e.currentTarget.blur();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 transition-all cursor-pointer relative outline-none focus:outline-none focus:ring-0 ${
            showQueue && !focusSearchInQueue
              ? `bg-white/[0.08] ${theme.textLight}`
              : 'text-white/60 hover:text-white/90 hover:bg-white/[0.03]'
          }`}
        >
          <List className={`w-4 h-4 transition-colors ${showQueue && !focusSearchInQueue ? theme.text : 'text-white/40'}`} />
          <span className="text-sm font-medium tracking-wide">Queue</span>
          {queue.length > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all leading-none ${
                showQueue && !focusSearchInQueue ? 'text-white' : 'bg-white/10 text-white/60'
              }`}
              style={
                showQueue && !focusSearchInQueue
                  ? { backgroundColor: 'var(--noir-theme-accent)' }
                  : undefined
              }
            >
              {queue.length}
            </span>
          )}
        </button>
      </div>

      {showVolumeSlider && onVolumeChange && (
        <div 
          className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/30 hover:bg-black/45 border border-white/12 hover:border-white/20 transition-all select-none group/vol h-[42px] relative overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Projectile dot in parabolic flight above the track */}
          {projectile !== null && (
            <div 
              className="absolute w-4 h-4 rounded-full bg-white border-2 border-[var(--theme-primary)] shadow-[0_0_12px_var(--theme-primary),_0_0_24px_var(--theme-primary)] pointer-events-none z-[100]"
              style={{ 
                left: `${projectile.x - 8}px`, 
                top: `${projectile.y - 8}px` 
              }}
            />
          )}

          <button
            onPointerDown={(e) => {
              startTimeRef.current = performance.now();
              e.currentTarget.setPointerCapture(e.pointerId);
              stopAnimation();
              setChargeVolume(0);
              chargeIntervalRef.current = setInterval(() => {
                const elapsed = performance.now() - startTimeRef.current;
                if (elapsed < 180) {
                  setChargeVolume(0);
                } else {
                  const cycleTime = 2400; // 1.2s to go up, 1.2s to go down
                  const phase = (elapsed - 180) % cycleTime;
                  let vol = 0;
                  if (phase < 1200) {
                    vol = (phase / 1200) * 100;
                  } else {
                    vol = 200 - (phase / 1200) * 100;
                  }
                  setChargeVolume(Math.round(vol));
                }
              }, 16); // 60fps updates for smooth rotation
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              e.currentTarget.blur();
              if (chargeIntervalRef.current) {
                clearInterval(chargeIntervalRef.current);
                chargeIntervalRef.current = null;
              }
              const holdDuration = performance.now() - startTimeRef.current;
              // If held longer than 180ms and charged beyond 2%, launch projectile
              if (holdDuration >= 180 && chargeVolume !== null && chargeVolume > 2) {
                launchProjectile(chargeVolume);
                setChargeVolume(null);
              } else {
                setChargeVolume(null);
                setIsMutingAction(true);
                setTimeout(() => setIsMutingAction(false), 350);
                if (volume > 0) {
                  if (setPreMuteVolume) setPreMuteVolume(volume);
                  onVolumeChange?.(0);
                } else {
                  onVolumeChange?.(preMuteVolume || 70);
                }
              }
            }}
            onPointerCancel={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              e.currentTarget.blur();
              if (chargeIntervalRef.current) {
                clearInterval(chargeIntervalRef.current);
                chargeIntervalRef.current = null;
              }
              setChargeVolume(null);
            }}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
              }
            }}
            className="text-white/60 hover:text-white/95 transition-colors cursor-pointer shrink-0 flex items-center justify-center p-0.5 rounded-lg hover:bg-white/10 touch-none outline-none focus:outline-none focus:ring-0"
            title="Hold to Charge & Shoot Volume / Click to Mute"
          >
            <motion.div
              animate={{ rotate: chargeVolume !== null ? - (chargeVolume / 100) * 35 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="pointer-events-none flex items-center justify-center"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </motion.div>
          </button>
          
          <Slider.Root
            value={[volume]}
            max={100}
            step={1}
            onValueChange={(val) => {
              stopAnimation();
              onVolumeChange?.(val[0]);
            }}
            className="relative flex items-center w-20 h-4 cursor-pointer group/slider"
          >
            <Slider.Track className="relative h-[3px] w-full bg-white/15 rounded-full overflow-hidden">
              <Slider.Range 
                className="absolute h-full bg-white/60" 
                style={{ 
                  transition: isMutingAction ? 'width 300ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none' 
                }}
              />
            </Slider.Track>
            <Slider.Thumb 
              className={`block w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/vol:opacity-100 focus:outline-none focus:opacity-100 animate-fade-in ${
                projectile !== null ? 'hidden pointer-events-none opacity-0' : ''
              }`} 
              style={{ 
                transition: isMutingAction ? 'left 300ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none' 
              }}
            />
          </Slider.Root>

          <span className="text-xs font-bold text-white/50 w-8 text-right select-none font-mono tracking-tight shrink-0">
            {volume}%
          </span>
        </div>
      )}

      {showSettingsButton && (
        <button
          id="settings-button"
          onClick={(e) => {
            setShowSettings(!showSettings);
            e.currentTarget.blur();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/30 hover:bg-black/45 border border-white/12 hover:border-white/25 transition-all group outline-none focus:outline-none focus:ring-0"
        >
          <Settings className="w-4 h-4 text-white/60 group-hover:text-white/85 transition-colors" />
          <span className="text-sm text-white/85 group-hover:text-white transition-colors">Settings</span>
        </button>
      )}
    </motion.div>
  );
}
