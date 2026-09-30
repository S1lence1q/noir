import { useId, type ReactNode } from 'react';
import { COLOR_WORLDS, hashString, worldForTag, type ColorWorld } from '../../../utils/ditherCover';

/**
 * Mix / genre covers: one symbol that says what the mix IS (rap → a chain link, Danish → the
 * Nordic cross), drawn in the NOIR mark's own spray edge, black or bone on one palette field —
 * the Favorites recipe. Unknown genres get a sibling of the NOIR asterisk. Never clip-art:
 * one flat shape, no detail, no gradients.
 */

export type MixSymbol =
  | 'you'
  | 'podium'
  | 'globe'
  | 'chain'
  | 'bolt'
  | 'cross-dk'
  | 'cross-se'
  | 'cross-no'
  | 'cross-fi'
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

// Fixed fields per genre, spread over all seven colours (not pink everywhere). Flags only
// where the colours are right: a wrong flag is worse than no flag.
const RULES: { test: RegExp; symbol: MixSymbol; world: ColorWorld }[] = [
  { test: /for you|daily|made for|discover/, symbol: 'you', world: 'bone' },
  // Charts before countries: "Top Hits: Denmark" is a chart, not the Danish mix.
  { test: /global_hits|global|worldwide/, symbol: 'globe', world: 'cobalt' },
  { test: /dk_hits|top hits|chart/, symbol: 'podium', world: 'ember' },
  { test: /danish|dansk|denmark|danmark/, symbol: 'cross-dk', world: 'ember' },
  { test: /swedish|svensk|sweden|sverige/, symbol: 'cross-se', world: 'cobalt' },
  { test: /norwegian|norsk|norway|norge/, symbol: 'cross-no', world: 'ember' },
  { test: /finnish|suomi|finland/, symbol: 'cross-fi', world: 'bone' },
  { test: /hip-?hop|rap|trap|drill|grime/, symbol: 'chain', world: 'sun' },
  { test: /metal|punk|hardcore|grunge|industrial/, symbol: 'thorns', world: 'ink' },
  { test: /rock|garage/, symbol: 'bolt', world: 'ink' },
  { test: /lo[\s-]?fi|chill|sleep|night/, symbol: 'moon', world: 'cobalt' },
  { test: /dream|shoegaze|ambient|ethereal/, symbol: 'cloud', world: 'rose' },
  { test: /electro|techno|house|edm|synth|trance|dnb|drum/, symbol: 'wave', world: 'moss' },
  { test: /jazz|blues|swing|bossa/, symbol: 'enso', world: 'sun' },
  { test: /r&b|rnb|soul|love/, symbol: 'heart', world: 'rose' },
  { test: /indie|folk|acoustic|singer|country/, symbol: 'leaf', world: 'moss' },
  { test: /pop|dance|disco|k-?pop/, symbol: 'sparkle', world: 'ember' },
];

export function resolveMixCover(tagOrName: string): Resolved {
  const tag = tagOrName.toLowerCase().replace(/\s+mix$/, '').trim();
  const rule = RULES.find((r) => r.test.test(tag));
  if (!rule) return { symbol: 'sibling', world: worldForTag(tag) };
  return { symbol: rule.symbol, world: rule.world };
}

/** Black on warm fields, bone on dark ones — never a second colour (flags excepted). */
export const inkOn = (world: ColorWorld) => (world === 'cobalt' || world === 'moss' || world === 'ink' ? '#EDE8DE' : '#0B0B0B');

const BONE = '#EDE8DE';
const SUN = '#E9B21C';
const COBALT = '#1F3FBF';
/** Flag crosses carry their real colours. */
const CROSS_INK: Partial<Record<MixSymbol, string>> = { 'cross-dk': BONE, 'cross-se': SUN, 'cross-no': BONE, 'cross-fi': COBALT };

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
    case 'you':
      // "You are here": a ring with you in the middle. The asterisk stays Favorites'.
      return (
        <>
          <circle cx="50" cy="50" r="36" fill="none" stroke={ink} strokeWidth="13" />
          <circle cx="50" cy="50" r="12" />
        </>
      );
    case 'podium':
      // Top of the chart: 1 in the middle, 2 left, 3 right.
      return (
        <>
          <rect x="35" y="18" width="30" height="72" rx="3" />
          <rect x="3" y="44" width="30" height="46" rx="3" />
          <rect x="67" y="60" width="30" height="30" rx="3" />
        </>
      );
    case 'globe':
      return (
        <g fill="none" stroke={ink} strokeWidth="9">
          <circle cx="50" cy="50" r="41" />
          <ellipse cx="50" cy="50" rx="17" ry="41" />
          <line x1="9" y1="50" x2="91" y2="50" />
        </g>
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
    case 'cross-dk':
    case 'cross-se':
    case 'cross-fi':
      // The Nordic cross runs edge to edge (contained, it reads as a plus sign), thin, bar off-centre.
      return (
        <>
          <rect x="-10" y="44" width="120" height="11" />
          <rect x="31" y="-10" width="11" height="120" />
        </>
      );
    case 'cross-no':
      // Norway: the white cross; the blue one inside is drawn over it (its own spray, see below).
      return (
        <>
          <rect x="-10" y="40" width="120" height="19" />
          <rect x="27" y="-10" width="19" height="120" />
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
  const ink = CROSS_INK[symbol] ?? inkOn(world);
  const spray = size >= 72;
  const fullBleed = symbol.startsWith('cross');

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
              <feGaussianBlur in="SourceAlpha" stdDeviation={fullBleed ? 1.2 : 2.4} result="soft" />
              <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="1" seed="7" result="noise" />
              <feComposite in="soft" in2="noise" operator="arithmetic" k2="1" k3="0.55" k4="-0.42" result="mixed" />
              <feComponentTransfer in="mixed" result="grain">
                <feFuncA type="discrete" tableValues="0 1" />
              </feComponentTransfer>
              <feFlood floodColor={ink} />
              <feComposite in2="grain" operator="in" />
            </filter>
            {symbol === 'cross-no' && (
              <filter id={`${filterId}-inner`} x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur in="SourceAlpha" stdDeviation={1.2} result="soft" />
                <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves="1" seed="3" result="noise" />
                <feComposite in="soft" in2="noise" operator="arithmetic" k2="1" k3="0.55" k4="-0.42" result="mixed" />
                <feComponentTransfer in="mixed" result="grain">
                  <feFuncA type="discrete" tableValues="0 1" />
                </feComponentTransfer>
                <feFlood floodColor={COBALT} />
                <feComposite in2="grain" operator="in" />
              </filter>
            )}
          </defs>
        )}
        <g fill={ink} filter={spray ? `url(#${filterId})` : undefined}>
          {shape(symbol, tag, ink, filterId)}
        </g>
        {symbol === 'cross-no' && (
          <g fill={COBALT} filter={spray ? `url(#${filterId}-inner)` : undefined}>
            <rect x="-10" y="45" width="120" height="9" />
            <rect x="32" y="-10" width="9" height="120" />
          </g>
        )}
      </svg>
    </span>
  );
}

/**
 * Mosaic shape for n tiles without holes. The large tile takes 2×2 cells, so a column count c
 * fits when (n + 3) divides by c and the small tiles can fill the two rows beside it:
 * 5 → 4 cols, 6 → 3, 7 → 5, 9 → 4. Otherwise (and under 5) equal tiles in up to 4 columns.
 */
export function mosaicLayout(n: number): { 'data-layout': string; style: { ['--mosaic-cols']: number } } {
  if (n >= 5) {
    for (const c of [4, 5, 3]) {
      if ((n + 3) % c === 0 && n - 1 >= 2 * (c - 2)) return { 'data-layout': 'feature', style: { ['--mosaic-cols']: c } };
    }
  }
  const even = n % 3 === 0 && n % 4 !== 0 ? 3 : Math.min(4, Math.max(1, n));
  return { 'data-layout': 'even', style: { ['--mosaic-cols']: even } };
}

/** Dev check: every symbol on its field. `?covers` on Home. */
export function NoirMixCoverGallery() {
  const samples = ['For You', 'dk_hits', 'global_hits', 'Rap', 'Rock', 'Danish', 'Swedish', 'Norwegian', 'Finnish', 'Lo Fi', 'Dream Pop', 'Pop', 'Electronic', 'Jazz', 'Soul', 'Indie', 'Metal', 'Reggae', 'Classical'];
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
