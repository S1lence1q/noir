import { COLOR_WORLDS } from '../../../utils/ditherCover';
import { NoirMark } from './NoirMark';

type NoirFavoritesCoverProps = {
  size: number;
  radius?: number;
  className?: string;
};

/** Favorites has a fixed identity (ember + the NOIR mark) so it is recognizable anywhere, unlike dithered covers. */
export function NoirFavoritesCover({ size, radius, className = '' }: NoirFavoritesCoverProps) {
  const { field, mark } = COLOR_WORLDS.ember;
  const markSize = Math.round(size * (size >= 96 ? 0.62 : 0.6));
  return (
    <span
      className={`noir-favorites-cover ${className}`}
      style={{
        width: size,
        height: size,
        background: field,
        borderRadius: radius ?? (size >= 120 ? 'var(--noir-radius-md)' : 'var(--noir-radius-sm)'),
      }}
      aria-hidden
    >
      <NoirMark size={markSize} variant={size >= 96 ? 'spray' : 'vector'} color={mark} />
    </span>
  );
}
