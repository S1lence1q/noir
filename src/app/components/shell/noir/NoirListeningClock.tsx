import { useId, useMemo } from 'react';
import { formatHourLabel } from '../../../services/listening/statsSummary';
import { COLOR_WORLDS } from '../../../utils/ditherCover';
import { NoirMark } from './NoirMark';

export type NoirListeningClockProps = {
  hours: number[];
  peakHour: number;
  size?: number;
  className?: string;
};

/** 24h dial — graphic object for Your sound, not a dashboard bar chart. */
export function NoirListeningClock({
  hours,
  peakHour,
  size = 280,
  className = '',
}: NoirListeningClockProps) {
  const filterId = useId().replace(/:/g, '');
  const max = Math.max(1, ...hours);
  const cx = 140;
  const cy = 140;
  const innerR = 28;
  const maxRay = 92;

  const rays = useMemo(
    () =>
      hours.map((count, hour) => {
        const t = count / max;
        const len = innerR + 10 + t * maxRay;
        // 0 = top (midnight), clockwise
        const angle = ((hour / 24) * 360 - 90) * (Math.PI / 180);
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        return { hour, count, t, x1, y1, x2, y2, isPeak: hour === peakHour && count > 0 };
      }),
    [hours, max, peakHour]
  );

  const labels = [
    { hour: 0, text: '12' },
    { hour: 6, text: '6' },
    { hour: 12, text: '12' },
    { hour: 18, text: '6' },
  ];

  return (
    <div className={`noir-stats-dial ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 280 280" width={size} height={size} aria-hidden className="noir-stats-dial-svg">
        <defs>
          <filter id={`grain-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.05  0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 0.22 0" />
          </filter>
        </defs>
        <rect width="280" height="280" rx="18" fill={COLOR_WORLDS.bone.field} />
        <rect width="280" height="280" rx="18" filter={`url(#grain-${filterId})`} opacity="0.55" />
        <circle cx={cx} cy={cy} r="118" fill="none" stroke="rgba(11,11,11,0.12)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={innerR} fill="rgba(11,11,11,0.06)" />
        {rays.map((ray) => (
          <line
            key={ray.hour}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke={ray.isPeak ? COLOR_WORLDS.ember.field : COLOR_WORLDS.bone.dark}
            strokeWidth={ray.isPeak ? 5 : 2 + ray.t * 2.5}
            strokeLinecap="round"
            opacity={ray.count === 0 ? 0.18 : ray.isPeak ? 1 : 0.28 + ray.t * 0.55}
          >
            <title>{`${formatHourLabel(ray.hour)} · ${ray.count}`}</title>
          </line>
        ))}
        {labels.map(({ hour, text }) => {
          const angle = ((hour / 24) * 360 - 90) * (Math.PI / 180);
          const r = 128;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          return (
            <text
              key={`label-${hour}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(11,11,11,0.38)"
              fontSize="11"
              fontFamily="Outfit, sans-serif"
              fontWeight="600"
            >
              {text}
            </text>
          );
        })}
      </svg>
      <span className="noir-stats-dial-mark">
        <NoirMark size={22} variant="vector" color={COLOR_WORLDS.bone.mark} />
      </span>
    </div>
  );
}
