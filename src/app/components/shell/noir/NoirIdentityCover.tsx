import { COLOR_WORLDS, type ColorWorld } from '../../../utils/ditherCover';
import { NoirMark } from './NoirMark';

type NoirIdentityCoverProps = {
  world: ColorWorld;
  size: number;
  radius?: number | string;
  className?: string;
};

/**
 * Fixed slot graphic (field + spray mark), like Favorites.
 * Use where a dithered artist photo would just repeat the same face.
 */
export function NoirIdentityCover({ world, size, radius, className = '' }: NoirIdentityCoverProps) {
  const { field, mark } = COLOR_WORLDS[world];
  const markSize = Math.round(size * (size >= 160 ? 0.58 : size >= 96 ? 0.62 : 0.6));
  const light = world === 'bone';

  return (
    <span
      className={`noir-identity-cover${light ? ' noir-identity-cover--light' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        background: field,
        borderRadius:
          radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)'),
      }}
      aria-hidden
    >
      <NoirMark size={markSize} variant={size >= 72 ? 'spray' : 'vector'} color={mark} />
    </span>
  );
}
