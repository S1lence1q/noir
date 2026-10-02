import sprayAsterisk from '../../../../assets/noir/brand-spray-asterisk.png';
import plateWave from '../../../../assets/noir/brand-plate-wave.jpeg';
import halftoneCloud from '../../../../assets/noir/empty-halftone-cloud.jpeg';

const noirGraphics = {
  sprayAsterisk,
  plateWave,
  halftoneCloud,
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
