import type { MutableRefObject } from 'react';

let globalAudioContext: AudioContext | null = null;
let globalAnalyser: AnalyserNode | null = null;
const activeSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

export function initAudioAnalyzer(
  audioElement: HTMLAudioElement,
  audioSourceRef: MutableRefObject<MediaElementAudioSourceNode | null>,
  analyserRef: MutableRefObject<AnalyserNode | null>,
  audioContextRef: MutableRefObject<AudioContext | null>
): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!globalAudioContext) {
      globalAudioContext = new AudioContextClass();
    }
    const ctx = globalAudioContext;

    if (!globalAnalyser) {
      globalAnalyser = ctx.createAnalyser();
      globalAnalyser.fftSize = 1024;
      globalAnalyser.connect(ctx.destination);
    }
    const analyser = globalAnalyser;

    let source = activeSources.get(audioElement);
    if (!source) {
      source = ctx.createMediaElementSource(audioElement);
      activeSources.set(audioElement, source);
      source.connect(analyser);
    }

    audioSourceRef.current = source;
    analyserRef.current = analyser;
    audioContextRef.current = ctx;
  } catch (err) {
    console.warn('Failed to initialize Web Audio API analyzer:', err);
  }
}

export function suspendGlobalAudioContext(): void {
  if (globalAudioContext && globalAudioContext.state === 'running') {
    try {
      globalAudioContext.suspend();
    } catch {
      /* ignore */
    }
  }
}
