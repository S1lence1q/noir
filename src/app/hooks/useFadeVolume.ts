import { useRef, useCallback } from 'react';

interface FadeVolumeOptions {
  volumeRef: React.MutableRefObject<number>;
  ytPlayerRef: React.MutableRefObject<any>;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  isYouTubeRef: React.MutableRefObject<boolean>;
}

export function useFadeVolume({
  volumeRef,
  ytPlayerRef,
  audioRef,
  isYouTubeRef
}: FadeVolumeOptions) {
  const faderRef = useRef(1); // multiplier 0 to 1
  const faderAnimationRef = useRef<number | null>(null);
  const fadeResolveRef = useRef<(() => void) | null>(null);
  const isFadingOutRef = useRef(false);

  const fadeVolume = useCallback((target: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      if (faderAnimationRef.current) {
        cancelAnimationFrame(faderAnimationRef.current);
        faderAnimationRef.current = null;
      }

      if (fadeResolveRef.current) {
        fadeResolveRef.current();
      }
      fadeResolveRef.current = resolve;

      const startValue = faderRef.current;
      const startTime = performance.now();

      const run = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Equal-Power Trigonometric Crossfade Curves (Constant perceived loudness)
        const isFadingIn = target > startValue;
        const ease = isFadingIn 
          ? Math.sin(progress * Math.PI / 2)       // Sine curve for smooth gain rise
          : 1 - Math.cos(progress * Math.PI / 2);  // Cosine curve for smooth gain drop
        faderRef.current = startValue + (target - startValue) * ease;

        // Apply faded volume to active player
        const activeVol = Math.round(volumeRef.current * faderRef.current);
        if (isYouTubeRef.current && ytPlayerRef.current && ytPlayerRef.current.setVolume) {
          try {
            if (activeVol <= 0) {
              ytPlayerRef.current.mute?.();
              ytPlayerRef.current.setVolume(0);
            } else {
              ytPlayerRef.current.unMute?.();
              ytPlayerRef.current.setVolume(activeVol);
            }
          } catch (e) {}
        } else if (audioRef.current) {
          audioRef.current.volume = activeVol / 100;
        }

        if (progress < 1) {
          faderAnimationRef.current = requestAnimationFrame(run);
        } else {
          faderRef.current = target;
          faderAnimationRef.current = null;
          fadeResolveRef.current = null;
          resolve();
        }
      };

      faderAnimationRef.current = requestAnimationFrame(run);
    });
  }, [volumeRef, ytPlayerRef, audioRef, isYouTubeRef]);

  return {
    fadeVolume,
    faderRef,
    faderAnimationRef,
    fadeResolveRef,
    isFadingOutRef
  };
}
