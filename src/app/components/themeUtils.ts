export type AccentColor = 'emerald' | 'sand' | 'wine' | 'navy';

export interface ThemeColors {
  name: string;
  text: string;
  textLight: string;
  textHover: string;
  textHoverLight: string;
  bg: string;
  bgFade: string;
  bgHover: string;
  bgActive: string;
  border: string;
  borderLight: string;
  borderCard: string;
  borderHover: string;
  borderActive: string;
  borderAccent: string;
  borderT: string;
  fromGradient: string;
  fromGradientHover: string;
  glowText: string;
  welcomeFrom: string;
  welcomeVia: string;
  welcomeTo: string;
  glowFrom: string;
  glowVia: string;
  glowTo: string;
  badgeText: string;
  badgeBorder: string;
  badgeBg: string;
}

const sharedGlowText = 'bg-gradient-to-br from-white via-zinc-100 to-zinc-400/90';

export const ACCENT_THEMES: Record<AccentColor, ThemeColors> = {
  emerald: {
    name: 'Nordic Solitude (Sage)',
    text: 'text-noir-accent',
    textLight: 'text-noir-accent-muted',
    textHover: 'hover:text-noir-accent',
    textHoverLight: 'group-hover:text-noir-accent',
    bg: 'bg-noir-accent-soft',
    bgFade: 'bg-noir-accent-softer',
    bgHover: 'hover:bg-noir-accent-soft',
    bgActive: 'bg-noir-accent-softer',
    border: 'border-noir-accent',
    borderLight: 'border-noir-accent',
    borderCard: 'border-noir-accent',
    borderHover: 'hover:border-noir-accent',
    borderActive: 'border-noir-accent',
    borderAccent: 'border-noir-accent',
    borderT: 'border-t-[color:var(--noir-accent-border)]',
    fromGradient: 'from-transparent',
    fromGradientHover: 'hover:from-transparent',
    glowText: sharedGlowText,
    welcomeFrom: 'from-[#6d8578]/25',
    welcomeVia: 'via-[#5a6e62]/12',
    welcomeTo: 'to-transparent',
    glowFrom: 'from-[#6d8578]/8',
    glowVia: 'via-neutral-950/12',
    glowTo: 'to-neutral-950/18',
    badgeText: 'text-noir-accent-muted',
    badgeBorder: 'border-noir-accent',
    badgeBg: 'bg-noir-accent-softer',
  },
  sand: {
    name: 'Late Night Coffee (Linen)',
    text: 'text-noir-accent',
    textLight: 'text-noir-accent-muted',
    textHover: 'hover:text-noir-accent',
    textHoverLight: 'group-hover:text-noir-accent',
    bg: 'bg-noir-accent-soft',
    bgFade: 'bg-noir-accent-softer',
    bgHover: 'hover:bg-noir-accent-soft',
    bgActive: 'bg-noir-accent-softer',
    border: 'border-noir-accent',
    borderLight: 'border-noir-accent',
    borderCard: 'border-noir-accent',
    borderHover: 'hover:border-noir-accent',
    borderActive: 'border-noir-accent',
    borderAccent: 'border-noir-accent',
    borderT: 'border-t-[color:var(--noir-accent-border)]',
    fromGradient: 'from-transparent',
    fromGradientHover: 'hover:from-transparent',
    glowText: sharedGlowText,
    welcomeFrom: 'from-[#9a8a6e]/25',
    welcomeVia: 'via-[#7d7058]/12',
    welcomeTo: 'to-transparent',
    glowFrom: 'from-[#9a8a6e]/8',
    glowVia: 'via-neutral-950/12',
    glowTo: 'to-neutral-950/18',
    badgeText: 'text-noir-accent-muted',
    badgeBorder: 'border-noir-accent',
    badgeBg: 'bg-noir-accent-softer',
  },
  wine: {
    name: 'Acoustic Warmth (Burgundy)',
    text: 'text-noir-accent',
    textLight: 'text-noir-accent-muted',
    textHover: 'hover:text-noir-accent',
    textHoverLight: 'group-hover:text-noir-accent',
    bg: 'bg-noir-accent-soft',
    bgFade: 'bg-noir-accent-softer',
    bgHover: 'hover:bg-noir-accent-soft',
    bgActive: 'bg-noir-accent-softer',
    border: 'border-noir-accent',
    borderLight: 'border-noir-accent',
    borderCard: 'border-noir-accent',
    borderHover: 'hover:border-noir-accent',
    borderActive: 'border-noir-accent',
    borderAccent: 'border-noir-accent',
    borderT: 'border-t-[color:var(--noir-accent-border)]',
    fromGradient: 'from-transparent',
    fromGradientHover: 'hover:from-transparent',
    glowText: sharedGlowText,
    welcomeFrom: 'from-[#8a6d74]/25',
    welcomeVia: 'via-[#6f565c]/12',
    welcomeTo: 'to-transparent',
    glowFrom: 'from-[#8a6d74]/8',
    glowVia: 'via-neutral-950/12',
    glowTo: 'to-neutral-950/18',
    badgeText: 'text-noir-accent-muted',
    badgeBorder: 'border-noir-accent',
    badgeBg: 'bg-noir-accent-softer',
  },
  navy: {
    name: 'Deep Focus (Slate)',
    text: 'text-noir-accent',
    textLight: 'text-noir-accent-muted',
    textHover: 'hover:text-noir-accent',
    textHoverLight: 'group-hover:text-noir-accent',
    bg: 'bg-noir-accent-soft',
    bgFade: 'bg-noir-accent-softer',
    bgHover: 'hover:bg-noir-accent-soft',
    bgActive: 'bg-noir-accent-softer',
    border: 'border-noir-accent',
    borderLight: 'border-noir-accent',
    borderCard: 'border-noir-accent',
    borderHover: 'hover:border-noir-accent',
    borderActive: 'border-noir-accent',
    borderAccent: 'border-noir-accent',
    borderT: 'border-t-[color:var(--noir-accent-border)]',
    fromGradient: 'from-transparent',
    fromGradientHover: 'hover:from-transparent',
    glowText: sharedGlowText,
    welcomeFrom: 'from-[#6d7d92]/25',
    welcomeVia: 'via-[#566678]/12',
    welcomeTo: 'to-transparent',
    glowFrom: 'from-[#6d7d92]/8',
    glowVia: 'via-neutral-950/12',
    glowTo: 'to-neutral-950/18',
    badgeText: 'text-noir-accent-muted',
    badgeBorder: 'border-noir-accent',
    badgeBg: 'bg-noir-accent-softer',
  },
};
