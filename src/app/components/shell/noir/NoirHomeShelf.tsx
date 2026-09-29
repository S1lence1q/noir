import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { prefersReducedMotion } from '../../../utils/motionPresets';

function nearestVerticalScroller(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

type Reveal = 'static' | 'pending' | 'in';

/** Horizontal shelf that never traps vertical page scroll.
 *  A shelf that starts below the fold holds its items back and staggers them in the first time
 *  it scrolls into view; one already on screen at mount rides the page settle instead. */
export function NoirHomeShelf({
  children,
  className = '',
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState<Reveal>('static');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;
    setReveal('pending');
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setReveal('in');
        io.disconnect();
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Shift-wheel / trackpad horizontal → keep native shelf scroll.
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const scroller = nearestVerticalScroller(el);
      if (!scroller) return;

      scroller.scrollTop += e.deltaY;
      e.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={ref}
      className={`noir-home-shelf ${className}`.trim()}
      data-reveal={reveal === 'static' ? undefined : reveal}
      {...rest}
    >
      {children}
    </div>
  );
}
