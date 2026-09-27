import halftoneCloud from '../../../../assets/noir/empty-halftone-cloud.jpeg';
import plateWave from '../../../../assets/noir/brand-plate-wave.jpeg';

export const noirGraphics = {
  halftoneCloud,
  plateWave,
} as const;

export type NoirGraphicAccentProps = {
  graphic: keyof typeof noirGraphics;
  className?: string;
};

export function NoirGraphicAccent({ graphic, className = '' }: NoirGraphicAccentProps) {
  return (
    <img
      src={noirGraphics[graphic]}
      alt=""
      aria-hidden
      className={className}
    />
  );
}
