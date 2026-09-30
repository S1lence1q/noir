import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { prefersReducedMotion } from '../../../utils/motionPresets';

/**
 * T22 — one quiet tooltip for the whole shell. Any element with `data-tip="…"` gets it:
 * after 800 ms of hover, at once on keyboard focus, never on touch. Replaces native `title`
 * bubbles (grey, slow, off-system). `data-tip-rail` = only while the element's `.noir-nav-label`
 * is hidden (sidebar icon rail). Text inputs tip on hover only, so opening the palette doesn't.
 */
const HOVER_DELAY_MS = 800;
const GAP = 8;

type Tip = { text: string; x: number; y: number; placement: 'top' | 'bottom' };

function tipTarget(node: EventTarget | null): HTMLElement | null {
  const el = node instanceof Element ? node.closest<HTMLElement>('[data-tip]') : null;
  if (!el || !el.dataset.tip) return null;
  if (el.hasAttribute('data-tip-rail')) {
    const label = el.querySelector<HTMLElement>('.noir-nav-label');
    if (label && label.offsetParent !== null) return null;
  }
  return el;
}

function measure(el: HTMLElement, text: string): Tip {
  const r = el.getBoundingClientRect();
  // Rail items: to the right. Everything else: above, or below when there's no room.
  if (el.hasAttribute('data-tip-rail')) {
    return { text, x: r.right + GAP, y: r.top + r.height / 2, placement: 'bottom' };
  }
  const placement = r.top > 48 ? 'top' : 'bottom';
  return {
    text,
    x: r.left + r.width / 2,
    y: placement === 'top' ? r.top - GAP : r.bottom + GAP,
    placement,
  };
}

export function NoirTooltipHost() {
  const [tip, setTip] = useState<(Tip & { rail: boolean; key: string }) | null>(null);
  const timerRef = useRef<number | null>(null);
  const currentRef = useRef<HTMLElement | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const clear = () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      currentRef.current = null;
      setTip(null);
    };
    const show = (el: HTMLElement) => {
      const text = el.dataset.tip!;
      setTip({ ...measure(el, text), rail: el.hasAttribute('data-tip-rail'), key: text });
    };

    const onPointerOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = tipTarget(e.target);
      if (el === currentRef.current) return;
      clear();
      if (!el) return;
      currentRef.current = el;
      timerRef.current = window.setTimeout(() => show(el), HOVER_DELAY_MS);
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = tipTarget(e.target);
      if (!el || el.tagName === 'INPUT') return;
      // Keyboard focus only (mouse clicks also focus buttons).
      if (!(e.target as HTMLElement).matches(':focus-visible')) return;
      clear();
      currentRef.current = el;
      show(el);
    };
    const onFocusOut = (e: FocusEvent) => {
      if (currentRef.current && currentRef.current.contains(e.target as Node)) clear();
    };

    window.addEventListener('pointerover', onPointerOver, true);
    window.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('pointerdown', clear, true);
    window.addEventListener('keydown', clear, true);
    window.addEventListener('scroll', clear, true);
    window.addEventListener('blur', clear);
    return () => {
      clear();
      window.removeEventListener('pointerover', onPointerOver, true);
      window.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('pointerdown', clear, true);
      window.removeEventListener('keydown', clear, true);
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('blur', clear);
    };
  }, []);

  return createPortal(
    <AnimatePresence>
      {tip && (
        <motion.div
          key={tip.key}
          role="tooltip"
          className="noir-tooltip"
          data-rail={tip.rail ? 'true' : undefined}
          data-placement={tip.placement}
          style={{ left: tip.x, top: tip.y }}
          initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
        >
          {tip.text}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
