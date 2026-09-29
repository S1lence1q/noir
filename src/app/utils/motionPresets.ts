import type { Transition, Variants } from 'motion/react';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function withReducedMotion<T extends Transition>(transition: T): T {
  if (!prefersReducedMotion()) return transition;
  if ((transition as { type?: string }).type === 'spring') return { duration: 0, delay: 0 } as T;
  return { ...transition, duration: 0, delay: 0 };
}

/** Matches Landing / artist overlays — smooth deceleration, no bounce */
export const EASE_PREMIUM: Transition['ease'] = [0.16, 1, 0.3, 1];

export const EASE_OUT_SMOOTH: Transition['ease'] = [0.25, 0.1, 0.25, 1];

export const DURATION_FAST = 0.22;
export const DURATION_PANEL = 0.28;

/**
 * NOIR motion tokens (design/08-craft.md §4). New code uses only these.
 *
 * Vocabulary (2026-09-29 pass):
 * - Enter: `panel` (UI chrome), `scene` (layout moves), `settle` (objects that arrive and rest).
 * - Exit: `exit` — quicker than the enter, eases out, never a drop/slide-away. Things step back.
 * - Pages / sections: CSS `noir-settle-group` (8 px rise, 40 ms stagger, `noir-shell.css`).
 * - Text swaps (titles): `AnimatePresence mode="popLayout"` — the new one arrives at once.
 * - One expressive beat per action (creation spring, favorite burst, fly-to-queue); ambient never loops.
 */
export const MOTION = {
  tap: { duration: 0.12, ease: EASE_OUT_SMOOTH },
  exit: { duration: 0.14, ease: EASE_OUT_SMOOTH },
  panel: { duration: 0.28, ease: EASE_PREMIUM },
  scene: { duration: 0.45, ease: EASE_PREMIUM },
  /** Physical objects that arrive and rest: side rail, toast, sheets. Slight weight, no bounce. */
  settle: { type: 'spring', stiffness: 260, damping: 34, mass: 0.9 },
} satisfies Record<'tap' | 'exit' | 'panel' | 'scene' | 'settle', Transition>;

export const panelEnter = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION_PANEL, ease: EASE_PREMIUM },
};

export const panelEnterFromSide = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
  transition: { duration: DURATION_PANEL, ease: EASE_OUT_SMOOTH },
};

export const listItemEnter = (index: number) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: DURATION_FAST,
    ease: EASE_OUT_SMOOTH,
  },
});

/** Search panel phase swap (recents ↔ loading ↔ results) — transform only, no layout prop */
export const searchPhaseMotion = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_PREMIUM },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.24, ease: EASE_PREMIUM },
  },
};

export const searchStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.12,
    },
  },
};

export const searchStaggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.44, ease: EASE_PREMIUM },
  },
};

export const searchArtistCardItem: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.52, ease: EASE_PREMIUM },
  },
};

/** Full-bleed scroll layer inside queue panel — views crossfade without stacking height */
export const queuePanelLayerClass =
  'absolute inset-0 overflow-y-auto scrollbar-none p-5 pb-[120px] will-change-[opacity,transform,filter]';

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION_FAST, ease: EASE_OUT_SMOOTH },
};
