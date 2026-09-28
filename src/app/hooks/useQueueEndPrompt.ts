import { useEffect, useRef, useState } from 'react';

export type AutoplayPreference = 'ask' | 'on' | 'off';

const AUTOPLAY_STORAGE_KEY = 'elva_autoplay';

function readAutoplayPreference(): AutoplayPreference {
  const value = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
  return value === 'on' || value === 'off' ? value : 'ask';
}

type UseQueueEndPromptOptions = {
  trackKey: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  /** Tracks remaining after the current one. Prompt when ≤ 1. */
  upNextCount: number;
  canKeepPlaying: boolean;
  onKeepPlaying: () => void;
};

/**
 * Shows once per track when ≤ 1 song is left and ≤ 20s remain.
 * Respects Settings autoplay: ask | on | off.
 */
export function useQueueEndPrompt({
  trackKey,
  currentTime,
  duration,
  isPlaying,
  upNextCount,
  canKeepPlaying,
  onKeepPlaying,
}: UseQueueEndPromptOptions) {
  const [isVisible, setIsVisible] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const promptedTrackRef = useRef<string | null>(null);
  const onKeepPlayingRef = useRef(onKeepPlaying);
  onKeepPlayingRef.current = onKeepPlaying;

  // Hide when the song changes or the queue is no longer near empty.
  useEffect(() => {
    setIsVisible(false);
  }, [trackKey]);

  useEffect(() => {
    if (upNextCount > 1) setIsVisible(false);
  }, [upNextCount]);

  useEffect(() => {
    if (
      !isPlaying ||
      !canKeepPlaying ||
      duration <= 0 ||
      currentTime < duration - 20 ||
      upNextCount > 1 ||
      promptedTrackRef.current === trackKey
    ) {
      return;
    }

    promptedTrackRef.current = trackKey;
    const preference = readAutoplayPreference();
    if (preference === 'off') return;
    if (preference === 'on') {
      onKeepPlayingRef.current();
      return;
    }

    setDontAskAgain(false);
    setIsVisible(true);
  }, [canKeepPlaying, currentTime, duration, isPlaying, trackKey, upNextCount]);

  const resolve = (choice: 'keep' | 'dismiss') => {
    if (dontAskAgain) {
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, choice === 'keep' ? 'on' : 'off');
    }
    setIsVisible(false);
    if (choice === 'keep') onKeepPlayingRef.current();
  };

  return {
    isVisible,
    dontAskAgain,
    setDontAskAgain,
    resolve,
  };
}
