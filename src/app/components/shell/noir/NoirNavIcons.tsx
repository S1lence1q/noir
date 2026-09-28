import { useState, type ReactElement, type SVGProps } from 'react';

type NavIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

export const NAV_ICON_SETS = ['stage', 'signal', 'glyph', 'pulse'] as const;
export type NavIconSet = (typeof NAV_ICON_SETS)[number];

export const NAV_ICON_SET_LABELS: Record<NavIconSet, string> = {
  stage: '1 · Stage / radar / shelves',
  signal: '2 · Portal / burst / spines',
  glyph: '3 · Frame / orbit / discs',
  pulse: '4 · Beam / scan / bars',
};

const STORAGE_KEY = 'noir_nav_icons_v2';

function baseProps(
  { size = 18, strokeWidth = 1.75, className = '', ...rest }: NavIconProps,
  title?: string
) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': title ? undefined : (true as const),
    role: title ? ('img' as const) : undefined,
    'aria-label': title,
    ...rest,
  };
}

/* ─── Set 1: stage ─────────────────────────────────────────────── */

function HomeStage(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3.5 19.2h17" />
      <path d="M5.2 19.2V8.4L12 3.8l6.8 4.6v10.8" />
      <path d="M10.1 19.2v-5.4c0-.7.5-1.2 1.15-1.2h1.5c.65 0 1.15.5 1.15 1.2v5.4" />
    </svg>
  );
}

function DiscoverRadar(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.1" opacity="0.55" />
      <path d="M12 12l5.6-4.2" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LibraryShelves(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5 5.2h9.2" />
      <path d="M5 9.6h12.5" />
      <path d="M5 14h7.8" />
      <path d="M5 18.4h11" />
      <path d="M5 4.6v14.4" />
    </svg>
  );
}

/* ─── Set 2: signal ────────────────────────────────────────────── */

/** Home — open portal / doorway */
function HomePortal(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7 20.2V6.4c0-.9.6-1.6 1.5-1.6h7c.9 0 1.5.7 1.5 1.6v13.8" />
      <path d="M7 20.2h10" />
      <circle cx="14.6" cy="12.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Discover — 4-point spark; equal weight, no hairline diagonals or center blob. */
function DiscoverBurst(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path
        d="M12 3.4l1.55 7.05L20.6 12l-7.05 1.55L12 20.6l-1.55-7.05L3.4 12l7.05-1.55Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Library — vertical album spines */
function LibrarySpines(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 4.5v15" />
      <path d="M10.2 5.5v13" />
      <path d="M14.4 4.8v14.4" />
      <path d="M18.2 6.2v12" />
    </svg>
  );
}

/* ─── Set 3: glyph ─────────────────────────────────────────────── */

/** Home — listening frame with center cue */
function HomeFrame(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 4.2v2.4M12 17.4v2.4M4.2 12h2.4M17.4 12h2.4" opacity="0.5" />
    </svg>
  );
}

/** Discover — orbit rings */
function DiscoverOrbit(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <ellipse cx="12" cy="12" rx="8.4" ry="3.4" transform="rotate(-28 12 12)" />
      <ellipse cx="12" cy="12" rx="8.4" ry="3.4" transform="rotate(38 12 12)" opacity="0.55" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Library — stack of discs */
function LibraryDiscs(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <ellipse cx="12" cy="7" rx="7.2" ry="2.6" />
      <path d="M4.8 7v3.2c0 1.4 3.2 2.6 7.2 2.6s7.2-1.2 7.2-2.6V7" />
      <path d="M4.8 10.2v3.2c0 1.4 3.2 2.6 7.2 2.6s7.2-1.2 7.2-2.6v-3.2" />
      <path d="M4.8 13.4v3.2c0 1.4 3.2 2.6 7.2 2.6s7.2-1.2 7.2-2.6v-3.2" />
    </svg>
  );
}

/* ─── Set 4: pulse ─────────────────────────────────────────────── */

/** Home — soft beam / spotlight on a plane */
function HomeBeam(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 19.4h16" />
      <path d="M12 4.2v9.6" />
      <path d="M12 13.8L6.4 19.4" opacity="0.7" />
      <path d="M12 13.8l5.6 5.6" opacity="0.7" />
      <circle cx="12" cy="4.8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Discover — scan arcs */
function DiscoverScan(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5.2 16.4a8.2 8.2 0 1 1 13.6 0" />
      <path d="M7.6 14.8a5.2 5.2 0 1 1 8.8 0" opacity="0.55" />
      <path d="M12 18.6v-4.2" />
      <circle cx="12" cy="12.2" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Library — uneven equalizer / catalogue bars */
function LibraryBars(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 16.5V9.2" />
      <path d="M10 18.2V5.5" />
      <path d="M14 16.8V7.8" />
      <path d="M18 18.2V10.5" />
    </svg>
  );
}

type IconComp = (props: NavIconProps) => ReactElement;

const SETS: Record<NavIconSet, { Home: IconComp; Discover: IconComp; Library: IconComp }> = {
  stage: { Home: HomeStage, Discover: DiscoverRadar, Library: LibraryShelves },
  signal: { Home: HomePortal, Discover: DiscoverBurst, Library: LibrarySpines },
  glyph: { Home: HomeFrame, Discover: DiscoverOrbit, Library: LibraryDiscs },
  pulse: { Home: HomeBeam, Discover: DiscoverScan, Library: LibraryBars },
};

export function useNavIconSet() {
  const [setId, setSetId] = useState<NavIconSet>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && (NAV_ICON_SETS as readonly string[]).includes(raw)) {
        return raw as NavIconSet;
      }
    } catch {
      /* ignore */
    }
    return 'signal';
  });

  const cycle = () => {
    setSetId((prev) => {
      const i = NAV_ICON_SETS.indexOf(prev);
      const next = NAV_ICON_SETS[(i + 1) % NAV_ICON_SETS.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const icons = SETS[setId];
  return {
    setId,
    cycle,
    label: NAV_ICON_SET_LABELS[setId],
    Home: icons.Home,
    Discover: icons.Discover,
    Library: icons.Library,
  };
}
