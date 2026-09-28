import { useState } from 'react';
import plateWave from '../../../../assets/noir/brand-plate-wave.jpeg';
import sprayAsterisk from '../../../../assets/noir/brand-spray-asterisk.png';

export const SIDEBAR_BRAND_VARIANTS = ['asterisk', 'plate'] as const;

export type SidebarBrandVariant = (typeof SIDEBAR_BRAND_VARIANTS)[number];

export const SIDEBAR_BRAND_LABELS: Record<SidebarBrandVariant, string> = {
  asterisk: 'Spray asterisk',
  plate: 'Grey plate wave',
};

const STORAGE_KEY = 'noir_sidebar_brand_v3';

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
      {variant === 'plate' ? (
        <img
          src={plateWave}
          alt=""
          className="noir-sidebar-brand-media noir-brand-variant-plate"
        />
      ) : (
        <img src={sprayAsterisk} alt="" className="noir-brand-asterisk-img" />
      )}
    </div>
  );
}

/** Click the wordmark to toggle between the two sidebar brand graphics. */
export function useSidebarBrandVariant() {
  const [variant, setVariant] = useState<SidebarBrandVariant>(() => readVariant());

  const cycle = () => {
    setVariant((prev) => {
      const next = prev === 'asterisk' ? 'plate' : 'asterisk';
      writeVariant(next);
      return next;
    });
  };

  return { variant, cycle, label: SIDEBAR_BRAND_LABELS[variant] };
}
