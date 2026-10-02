import { useState, useEffect, useRef } from 'react';

/**
 * Eases a 0..1 "page position" (search 0, discover 0.5, hub 1) and a short velocity spike on every
 * page change. The fluid background reads both. Not tied to real scrolling.
 */
export function useScrollTracking(activeTab: string) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);

  const targetProgress = useRef(0);
  const currentProgress = useRef(0);
  const targetVelocity = useRef(0);
  const lastTab = useRef(activeTab);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTab === 'search') targetProgress.current = 0;
    else if (activeTab === 'discover') targetProgress.current = 0.5;
    else if (activeTab === 'myhub') targetProgress.current = 1.0;

    // Velocity spike when changing page, for the fluid background animation
    if (activeTab !== lastTab.current) {
      targetVelocity.current = 0.8;
      lastTab.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    let active = true;

    const animate = () => {
      if (!active) return;

      const progressDiff = targetProgress.current - currentProgress.current;
      if (Math.abs(progressDiff) > 0.0001) {
        currentProgress.current += progressDiff * 0.08;
      } else {
        currentProgress.current = targetProgress.current;
      }
      setScrollProgress(currentProgress.current);

      // Decaying velocity spike
      targetVelocity.current *= 0.92;
      if (targetVelocity.current < 0.001) {
        targetVelocity.current = 0;
      }

      setScrollVelocity((prev) => {
        if (targetVelocity.current === 0 && prev === 0) {
          return 0;
        }
        const diff = targetVelocity.current - prev;
        if (Math.abs(diff) < 0.001) {
          return targetVelocity.current;
        }
        return prev + diff * 0.06;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { scrollProgress, scrollVelocity };
}
