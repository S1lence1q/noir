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
  upNextCount: number;
  canKeepPlaying: boolean;
  onKeepPlaying: () => void;
};

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
      onKeepPlaying();
      return;
    }

    setDontAskAgain(false);
    setIsVisible(true);
  }, [
    canKeepPlaying,
    currentTime,
    duration,
    isPlaying,
    onKeepPlaying,
    trackKey,
    upNextCount,
  ]);

  const resolve = (choice: 'keep' | 'dismiss') => {
    if (dontAskAgain) {
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, choice === 'keep' ? 'on' : 'off');
    }
    setIsVisible(false);
    if (choice === 'keep') onKeepPlaying();
  };

  return {
    isVisible,
    dontAskAgain,
    setDontAskAgain,
    resolve,
  };
}
