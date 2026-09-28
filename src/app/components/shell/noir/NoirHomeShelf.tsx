import { useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';

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

/** Horizontal shelf that never traps vertical page scroll. */
export function NoirHomeShelf({
  children,
  className = '',
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className={`noir-home-shelf ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
