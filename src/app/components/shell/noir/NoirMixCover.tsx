import { useId, type ReactNode } from 'react';
import { COLOR_WORLDS, hashString, worldForTag, type ColorWorld } from '../../../utils/ditherCover';

/**
 * Mix / genre covers: one symbol that says what the mix IS (rap → a chain link, Danish → the
 * Nordic cross), drawn in the NOIR mark's own spray edge, black or bone on one palette field —
 * the Favorites recipe. Unknown genres get a sibling of the NOIR asterisk. Never clip-art:
 * one flat shape, no detail, no gradients.
 */

export type MixSymbol =
  | 'asterisk'
  | 'chain'
  | 'bolt'
  | 'cross'
  | 'moon'
  | 'cloud'
  | 'sparkle'
  | 'wave'
  | 'enso'
  | 'leaf'
  | 'thorns'
  | 'heart'
  | 'sibling';

type Resolved = { symbol: MixSymbol; world: ColorWorld };

const RULES: { test: RegExp; symbol: MixSymbol; world?: ColorWorld }[] = [
  { test: /for you|daily|made for|discover/, symbol: 'asterisk' },
  { test: /danish|dansk|denmark|danmark/, symbol: 'cross', world: 'ember' },
  { test: /swedish|svensk|sweden/, symbol: 'cross', world: 'cobalt' },
  { test: /norwegian|norsk|norway|finnish|suomi|nordic|scandi/, symbol: 'cross', world: 'moss' },
  { test: /hip-?hop|rap|trap|drill|grime/, symbol: 'chain' },
  { test: /metal|punk|hardcore|grunge|industrial/, symbol: 'thorns', world: 'ink' },
  { test: /rock|garage/, symbol: 'bolt' },
  { test: /lo[\s-]?fi|chill|sleep|night/, symbol: 'moon' },
  { test: /dream|shoegaze|ambient|ethereal/, symbol: 'cloud' },
  { test: /electro|techno|house|edm|synth|trance|dnb|drum/, symbol: 'wave' },
  { test: /jazz|blues|swing|bossa/, symbol: 'enso' },
  { test: /r&b|rnb|soul|love/, symbol: 'heart' },
  { test: /indie|folk|acoustic|singer|country/, symbol: 'leaf' },
  { test: /pop|dance|disco|k-?pop/, symbol: 'sparkle' },
];

export function resolveMixCover(tagOrName: string): Resolved {
  const tag = tagOrName.toLowerCase().replace(/\s+mix$/, '').trim();
  const rule = RULES.find((r) => r.test.test(tag));
  if (!rule) return { symbol: 'sibling', world: worldForTag(tag) };
  return { symbol: rule.symbol, world: rule.world ?? (rule.symbol === 'asterisk' ? 'ember' : worldForTag(tag)) };
}

/** Black on warm fields, bone on dark ones — never a second colour. */
export const inkOn = (world: ColorWorld) => (world === 'cobalt' || world === 'moss' || world === 'ink' ? '#EDE8DE' : '#0B0B0B');

/** An asterisk sibling for genres without a symbol: arms, widths and turn from the name. */
function sibling(seed: string) {
  const h = hashString(seed);
  const arms = 3 + (h % 5); // 3–7
  const width = 16 + ((h >> 3) % 10);
  const turn = (h >> 7) % 360;
  return (
    <>
      {Array.from({ length: arms }, (_, i) => {
        const length = 40 + ((h >> (i + 2)) % 8);
        return (
          <rect
            key={i}
            x={50 - width / 2}
            y={50 - length}
            width={width}
            height={length}
            rx={width * 0.45}
            transform={`rotate(${turn + (i * 360) / arms} 50 50)`}
          />
        );
      })}
      <circle cx="50" cy="50" r={width * 0.7} />
    </>
  );
}

function shape(symbol: MixSymbol, seed: string, ink: string, id: string): ReactNode {
  switch (symbol) {
    case 'asterisk':
      return (
        <>
          {[-90, -17, 55, 127, 199].map((angle, i) => (
            <rect key={angle} x={50 - 10.5} y={50 - (45 + (i % 2))} width={21} height={45 + (i % 2)} rx={6} transform={`rotate(${angle + 90} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="13" />
        </>
      );
    case 'chain':
      return (
        <g fill="none" stroke={ink} strokeWidth="13">
          <rect x="4" y="26" width="56" height="34" rx="17" transform="rotate(-32 32 43)" />
          <rect x="40" y="40" width="56" height="34" rx="17" transform="rotate(-32 68 57)" />
        </g>
      );
    case 'bolt':
      return <path d="M60 6 L22 56 L46 56 L36 94 L80 40 L55 40 L68 6 Z" />;
    case 'cross':
      // The Nordic cross runs to the cover's edges, bar off-centre like the flag.
      return (
        <>
          <rect x="-10" y="41" width="120" height="18" />
          <rect x="30" y="-10" width="18" height="120" />
        </>
      );
    case 'moon':
      return (
        <>
          <mask id={`${id}-moon`}>
            <rect width="100" height="100" fill="#000" />
            <circle cx="46" cy="52" r="38" fill="#fff" />
            <circle cx="66" cy="40" r="32" fill="#000" />
          </mask>
          <rect width="100" height="100" mask={`url(#${id}-moon)`} />
        </>
      );
    case 'cloud':
      return (
        <>
          <circle cx="36" cy="56" r="17" />
          <circle cx="54" cy="44" r="22" />
          <circle cx="72" cy="58" r="15" />
          <rect x="22" y="56" width="60" height="17" rx="8.5" />
        </>
      );
    case 'sparkle':
      return <path d="M50 6 C53 40 60 47 94 50 C60 53 53 60 50 94 C47 60 40 53 6 50 C40 47 47 40 50 6 Z" />;
    case 'wave':
      return (
        <path
          d="M8 62 H27 V36 H50 V64 H73 V36 H92"
          fill="none"
          stroke={ink}
          strokeWidth="11"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    case 'enso':
      return (
        <path
          d="M72 22 A34 34 0 1 0 84 52"
          fill="none"
          stroke={ink}
          strokeWidth="14"
          strokeLinecap="round"
        />
      );
    case 'heart':
      return <path d="M50 84 C20 62 10 46 14 32 C18 18 38 14 50 30 C62 14 82 18 86 32 C90 46 80 62 50 84 Z" />;
    case 'leaf':
      return (
        <>
          <path d="M18 82 C18 42 44 16 86 14 C86 56 60 82 18 82 Z" />
          <path d="M10 90 L40 60" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" />
        </>
      );
    case 'thorns':
      return <path d="M10 88 L26 20 L40 88 Z M34 88 L52 8 L68 88 Z M62 88 L78 30 L92 88 Z" />;
    case 'sibling':
      return sibling(seed);
  }
}

type NoirMixCoverProps = {
  /** The mix's tag or its name ("Rap", "Danish Mix"): picks the symbol and field. */
  tag: string;
  /** CSS px (square). */
  size: number;
  radius?: number;
  madeForYou?: boolean;
  className?: string;
};

export function NoirMixCover({ tag, size, radius, className = '' }: NoirMixCoverProps) {
  const filterId = useId().replace(/:/g, '');
  const { symbol, world } = resolveMixCover(tag);
  // The Nordic cross is always light, like the flag's.
  const ink = symbol === 'cross' ? '#EDE8DE' : inkOn(world);
  const spray = size >= 72;
  const fullBleed = symbol === 'cross';

  return (
    <span
      className={`noir-mix-cover ${className}`}
      data-symbol={symbol}
      style={{
        width: size,
        height: size,
        background: COLOR_WORLDS[world].field,
        borderRadius: radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)'),
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 100"
        width={fullBleed ? '100%' : '66%'}
        height={fullBleed ? '100%' : '66%'}
        preserveAspectRatio="xMidYMid slice"
      >
        {spray && (
          <defs>
            <filter id={filterId} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur in="SourceAlpha" stdDeviation={fullBleed ? 1.4 : 2.4} result="soft" />
              <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="1" seed="7" result="noise" />
              <feComposite in="soft" in2="noise" operator="arithmetic" k2="1" k3="0.55" k4="-0.42" result="mixed" />
              <feComponentTransfer in="mixed" result="grain">
                <feFuncA type="discrete" tableValues="0 1" />
              </feComponentTransfer>
              <feFlood floodColor={ink} />
              <feComposite in2="grain" operator="in" />
            </filter>
          </defs>
        )}
        <g fill={ink} filter={spray ? `url(#${filterId})` : undefined}>
          {shape(symbol, tag, ink, filterId)}
        </g>
      </svg>
    </span>
  );
}

/** Dev check: every symbol on its field. `?covers` on Home. */
export function NoirMixCoverGallery() {
  const samples = ['For you', 'Rap', 'Rock', 'Danish', 'Swedish', 'Lo Fi', 'Dream Pop', 'Pop', 'Electronic', 'Jazz', 'Soul', 'Indie', 'Metal', 'Reggae', 'Classical'];
  return (
    <div className="noir-mix-gallery">
      {samples.map((name) => (
        <figure key={name}>
          <NoirMixCover tag={name} size={150} />
          <figcaption>{name}</figcaption>
        </figure>
      ))}
    </div>
  );
}
