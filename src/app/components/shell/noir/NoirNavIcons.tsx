import type { SVGProps } from 'react';

type NavIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

function baseProps(
  { size = 18, strokeWidth = 1.75, className = '', ...rest }: NavIconProps,
  title?: string
) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': title ? undefined : true,
    role: title ? ('img' as const) : undefined,
    'aria-label': title,
    ...rest,
  };
}

/** Home — open stage / listening room, not a cartoon house. */
export function NoirNavHome(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      {/* Floor plane */}
      <path d="M3.5 19.2h17" />
      {/* Left wall + ceiling break */}
      <path d="M5.2 19.2V8.4L12 3.8l6.8 4.6v10.8" />
      {/* Soft aperture / doorway — slightly off-center */}
      <path d="M10.1 19.2v-5.4c0-.7.5-1.2 1.15-1.2h1.5c.65 0 1.15.5 1.15 1.2v5.4" />
    </svg>
  );
}

/** Discover — radar sweep: rings + a needle, more noir than a compass rose. */
export function NoirNavDiscover(props: NavIconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.1" opacity="0.55" />
      <path d="M12 12l5.6-4.2" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Library — stacked spines / catalogue shelves, uneven like the NOIR mark. */
export function NoirNavLibrary(props: NavIconProps) {
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
