import { useId } from 'react';

export type NoirMarkProps = {
  size?: number;
  variant?: 'vector' | 'spray';
  color?: string;
  spin?: boolean;
  className?: string;
  title?: string;
};

/** Five uneven arms (angle offset, length, width) so the mark reads hand-made, not as a font glyph. */
const ARMS: { angle: number; length: number; width: number }[] = [
  { angle: -90, length: 46, width: 21 },
  { angle: -17, length: 44, width: 20 },
  { angle: 55, length: 47, width: 22 },
  { angle: 127, length: 45, width: 20 },
  { angle: 199, length: 46, width: 21 },
];

export function NoirMark({
  size = 16,
  variant = 'vector',
  color = 'currentColor',
  spin = false,
  className = '',
  title,
}: NoirMarkProps) {
  const filterId = useId().replace(/:/g, '');
  const spray = variant === 'spray';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`noir-mark${spin ? ' noir-mark--spin' : ''} ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {spray && (
        <defs>
          <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="soft" />
            <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="1" seed="7" result="noise" />
            <feComposite in="soft" in2="noise" operator="arithmetic" k2="1" k3="0.55" k4="-0.42" result="mixed" />
            <feComponentTransfer in="mixed" result="grain">
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            <feFlood floodColor={color} />
            <feComposite in2="grain" operator="in" />
          </filter>
        </defs>
      )}
      <g fill={color} filter={spray ? `url(#${filterId})` : undefined}>
        {ARMS.map(({ angle, length, width }) => (
          <rect
            key={angle}
            x={50 - width / 2}
            y={50 - length}
            width={width}
            height={length}
            rx={width * 0.28}
            transform={`rotate(${angle + 90} 50 50)`}
          />
        ))}
        <circle cx="50" cy="50" r="13" />
      </g>
    </svg>
  );
}
