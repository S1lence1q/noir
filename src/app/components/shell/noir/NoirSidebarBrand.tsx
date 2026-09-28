import { useState } from 'react';
import plateWave from '../../../../assets/noir/brand-plate-wave.jpeg';
import sprayAsterisk from '../../../../assets/noir/brand-spray-asterisk.png';
import waveRibbon from '../../../../assets/noir/brand-wave-ribbon.png';
import waveSparse from '../../../../assets/noir/brand-wave-sparse.png';
import waveSoft from '../../../../assets/noir/brand-wave-soft.png';

export const SIDEBAR_BRAND_VARIANTS = [
  'asterisk',
  'plate',
  'ribbon',
  'sparse',
  'soft',
] as const;

export type SidebarBrandVariant = (typeof SIDEBAR_BRAND_VARIANTS)[number];

export const SIDEBAR_BRAND_LABELS: Record<SidebarBrandVariant, string> = {
  asterisk: 'Spray asterisk',
  plate: 'Grey plate wave',
  ribbon: 'Ribbon wave',
  sparse: 'Sparse fins',
  soft: 'Soft plates',
};

const STORAGE_KEY = 'noir_sidebar_brand_v4';

const WAVE_SRC: Record<Exclude<SidebarBrandVariant, 'asterisk'>, string> = {
  plate: plateWave,
  ribbon: waveRibbon,
  sparse: waveSparse,
  soft: waveSoft,
};

function readVariant(): SidebarBrandVariant {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && (SIDEBAR_BRAND_VARIANTS as readonly string[]).includes(raw)) {
      return raw as SidebarBrandVariant;
    }
  } catch {
    /* ignore */
  }
  return 'asterisk';
}

function writeVariant(v: SidebarBrandVariant) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

type NoirSidebarBrandProps = {
  variant: SidebarBrandVariant;
};

export function NoirSidebarBrandGraphic({ variant }: NoirSidebarBrandProps) {
  return (
    <div className="noir-sidebar-brand-slot" data-variant={variant} aria-hidden>
      {variant === 'asterisk' ? (
        <img src={sprayAsterisk} alt="" className="noir-brand-asterisk-img" />
      ) : (
        <img
          src={WAVE_SRC[variant]}
          alt=""
          className={`noir-sidebar-brand-media noir-brand-variant-${variant}`}
        />
      )}
    </div>
  );
}

/** Click the wordmark to cycle sidebar brand graphics. */
export function useSidebarBrandVariant() {
  const [variant, setVariant] = useState<SidebarBrandVariant>(() => readVariant());

  const cycle = () => {
    setVariant((prev) => {
      const i = SIDEBAR_BRAND_VARIANTS.indexOf(prev);
      const next = SIDEBAR_BRAND_VARIANTS[(i + 1) % SIDEBAR_BRAND_VARIANTS.length];
      writeVariant(next);
      return next;
    });
  };

  return { variant, cycle, label: SIDEBAR_BRAND_LABELS[variant] };
}
