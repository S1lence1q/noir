import { useEffect, useRef, useState } from 'react';

export type AudioOutputIcon = 'headphones' | 'speaker';

export type AudioOutputState = {
  /** Display label — device name when known, else generic fallback key. */
  label: string;
  /** True when we got a real device label from the browser. */
  hasDeviceName: boolean;
  icon: AudioOutputIcon;
  /** Bumps on devicechange so the UI can briefly reveal the label. */
  changeToken: number;
};

const HEADPHONE_RE = /airpods|headphone|headset|earbud|beats|bluetooth|bose|sony|wh-?1000|galaxy buds/i;

function iconFromLabel(label: string): AudioOutputIcon {
  return HEADPHONE_RE.test(label) ? 'headphones' : 'speaker';
}

function pickOutput(devices: MediaDeviceInfo[]): MediaDeviceInfo | null {
  const outputs = devices.filter((d) => d.kind === 'audiooutput');
  if (outputs.length === 0) return null;
  const def = outputs.find((d) => d.deviceId === 'default');
  if (def) return def;
  const labeled = outputs.find((d) => d.label.trim().length > 0);
  return labeled ?? outputs[0];
}

function cleanLabel(raw: string): string {
  // Chrome often prefixes "Default - " / "Communications - "
  return raw
    .replace(/^(Default|Communications)\s*[-–—]\s*/i, '')
    .trim();
}

/**
 * Best-effort system audio output label. Display-only — does not route audio.
 * Labels may be blank until the browser has granted device info.
 */
export function useAudioOutputLabel(): AudioOutputState {
  const [state, setState] = useState<AudioOutputState>({
    label: '',
    hasDeviceName: false,
    icon: 'speaker',
    changeToken: 0,
  });
  const lastKeyRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    const media = navigator.mediaDevices;
    if (!media?.enumerateDevices) return;

    const refresh = async (fromChange: boolean) => {
      try {
        const devices = await media.enumerateDevices();
        if (cancelled) return;
        const picked = pickOutput(devices);
        const cleaned = picked ? cleanLabel(picked.label) : '';
        const hasDeviceName = cleaned.length > 0;
        const key = `${picked?.deviceId ?? ''}|${cleaned}`;
        const changed = fromChange && key !== lastKeyRef.current && lastKeyRef.current !== '';
        lastKeyRef.current = key;

        setState((prev) => ({
          label: cleaned,
          hasDeviceName,
          icon: iconFromLabel(cleaned),
          changeToken: changed ? prev.changeToken + 1 : prev.changeToken,
        }));
      } catch {
        /* ignore — keep previous / empty */
      }
    };

    void refresh(false);

    const onChange = () => {
      void refresh(true);
    };
    media.addEventListener?.('devicechange', onChange);
    return () => {
      cancelled = true;
      media.removeEventListener?.('devicechange', onChange);
    };
  }, []);

  return state;
}
