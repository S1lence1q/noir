import { prefersReducedMotion } from './motionPresets';

/**
 * Cause → effect motion for actions that start somewhere and land somewhere else
 * (design/POLISH.md, Phase E). Handlers in App don't know which row was clicked, so we
 * remember the last row / pointer the listener touched and use it as the origin.
 */

const ROW_SELECTOR = '.noir-track-row, [data-fly-source]';
const ART_SELECTOR = '.noir-art, .noir-artwork, img';
const ORIGIN_TTL_MS = 10_000;

let lastArt: { el: HTMLElement; at: number } | null = null;
let lastPointer: { x: number; y: number; target: Element | null; at: number } | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as Element | null;
      lastPointer = { x: e.clientX, y: e.clientY, target, at: Date.now() };
      const row = target?.closest?.(ROW_SELECTOR);
      const art = row?.querySelector<HTMLElement>(ART_SELECTOR);
      // Menu items live in a portal: keep the row that opened the menu as the origin.
      if (art) lastArt = { el: art, at: Date.now() };
    },
    { capture: true, passive: true }
  );
}

function recentArt(): HTMLElement | null {
  if (!lastArt || Date.now() - lastArt.at > ORIGIN_TTL_MS || !lastArt.el.isConnected) return null;
  const r = lastArt.el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight ? lastArt.el : null;
}

/** Fly a ghost of `from` into `to`, arcing up, shrinking to `endSize`. Resolves when it lands. */
export function flyGhost(from: HTMLElement, to: DOMRect, endSize = 20, duration = 560): Promise<void> {
  const a = from.getBoundingClientRect();
  const ghost = from.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: '0',
    zIndex: '9998',
    pointerEvents: 'none',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
    transformOrigin: 'top left',
  });
  document.body.appendChild(ghost);
  const scale = endSize / a.width;
  const dx = to.left + to.width / 2 - endSize / 2 - a.left;
  const dy = to.top + to.height / 2 - endSize / 2 - a.top;
  const lift = Math.min(120, Math.abs(dy) * 0.35 + 30);
  return ghost
    .animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${1 + (scale - 1) * 0.55})`,
          opacity: 1,
          offset: 0.5,
        },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.35 },
      ],
      { duration, easing: 'cubic-bezier(0.33, 0, 0.2, 1)' }
    )
    .finished.then(
      () => ghost.remove(),
      () => ghost.remove()
    );
}

/** Pulse an element once (it "receives" something). */
function receive(el: Element) {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }],
    { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  );
}

/** Add to queue / Play next: the clicked row's artwork flies into the bar's Next up button. */
export function flyToQueue() {
  const target = document.querySelector<HTMLElement>('[data-fly-target="queue"]');
  if (!target) return;
  const from = recentArt();
  if (!from || prefersReducedMotion()) {
    if (!prefersReducedMotion()) receive(target);
    return;
  }
  void flyGhost(from, target.getBoundingClientRect(), 20).then(() => receive(target));
}

/** Favorite added: the heart that was pressed pops, and a small NOIR asterisk springs from it. */
export function favoriteBurst() {
  if (!lastPointer || Date.now() - lastPointer.at > 1500) return;
  const heartButton = lastPointer.target?.closest?.('button');
  const heart = heartButton?.querySelector('svg');
  if (prefersReducedMotion()) return;
  heart?.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.35 }, { transform: 'scale(1)' }],
    { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
  );
  const origin = heartButton?.getBoundingClientRect();
  const x = origin ? origin.left + origin.width / 2 : lastPointer.x;
  const y = origin ? origin.top + origin.height / 2 : lastPointer.y;
  const mark = document.createElement('span');
  mark.className = 'noir-fav-burst';
  mark.innerHTML = ASTERISK_SVG;
  Object.assign(mark.style, { left: `${x}px`, top: `${y}px` });
  document.body.appendChild(mark);
  mark
    .animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.2) rotate(-40deg)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.15) rotate(8deg)', opacity: 1, offset: 0.4 },
        { transform: 'translate(-50%,-50%) scale(1.6) rotate(24deg)', opacity: 0 },
      ],
      { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    )
    .finished.then(
      () => mark.remove(),
      () => mark.remove()
    );
}

/** The NOIR mark (same five uneven arms as NoirMark), as a string for the imperative burst. */
const MARK_ARMS = [
  { angle: -90, length: 46, width: 21 },
  { angle: -17, length: 44, width: 20 },
  { angle: 55, length: 47, width: 22 },
  { angle: 127, length: 45, width: 20 },
  { angle: 199, length: 46, width: 21 },
];
const ASTERISK_SVG =
  '<svg viewBox="0 0 100 100" width="26" height="26" aria-hidden="true"><g fill="currentColor">' +
  MARK_ARMS.map(
    ({ angle, length, width }) =>
      `<rect x="${50 - width / 2}" y="${50 - length}" width="${width}" height="${length}" rx="${width * 0.28}" transform="rotate(${angle + 90} 50 50)"/>`
  ).join('') +
  '<circle cx="50" cy="50" r="13"/></g></svg>';
