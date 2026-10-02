import type { Transition } from 'motion/react';

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

const EASE_OUT_SMOOTH: Transition['ease'] = [0.25, 0.1, 0.25, 1];

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

