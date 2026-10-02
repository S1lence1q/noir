import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { strings } from '../../../constants/strings';
import type { MonthStats, ReplayCard, ReplayCardKind } from '../../../services/listening/statsSummary';
import { renderHeatFigure } from '../../../utils/heatFigure';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { NoirArtwork } from './NoirArtwork';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirHalftoneClock } from './NoirHalftoneClock';
import { NoirHeatWeek } from './NoirHeatWeek';

export type NoirReplayStoryProps = {
  cards: ReplayCard[];
  month: MonthStats;
  /** Minutes per day of the month, first day first. */
  monthDays: number[];
  artistImage?: string;
  trackImage?: string;
  onClose: () => void;
};

/** Each card is its own colour world; the graphic is made from that card's number. */
const CARD_THEME: Record<ReplayCardKind, { bg: string; ink: string }> = {
  intro: { bg: '#2350DC', ink: '#F2EEE6' },
  artist: { bg: '#EDE8DE', ink: '#0B0B0B' },
  track: { bg: '#141414', ink: '#F2EEE6' },
  clock: { bg: '#0B0B0B', ink: '#F2EEE6' },
  close: { bg: '#E85002', ink: '#0B0B0B' },
};

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

/**
 * Save the card as a 1080×1350 image: the card's own graphic (canvas / images, drawn where they
 * sit on the card) plus its text. A cross-origin cover can taint the canvas; then the card is
 * saved without that image rather than not at all.
 */
function saveCard(cardEl: HTMLElement, card: ReplayCard, withGraphic = true) {
  const W = 1080;
  const H = 1350;
  const theme = CARD_THEME[card.kind];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const box = cardEl.getBoundingClientRect();
  const k = W / box.width;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  if (withGraphic) {
    cardEl.querySelectorAll<HTMLCanvasElement | HTMLImageElement>('.noir-replay-card-art canvas, .noir-replay-card-art img').forEach((el) => {
      const r = el.getBoundingClientRect();
      try {
        ctx.drawImage(el, (r.left - box.left) * k, (r.top - box.top) * k, r.width * k, r.height * k);
      } catch {
        /* not drawable yet */
      }
    });
  }

  const pad = 72;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.6;
  ctx.font = '600 30px Outfit, sans-serif';
  ctx.fillText(card.eyebrow.toUpperCase(), pad, H - 330);
  ctx.globalAlpha = 1;
  ctx.font = '600 76px Outfit, sans-serif';
  const y = wrap(ctx, card.headline, pad, H - 240, W - pad * 2, 84);
  ctx.globalAlpha = 0.72;
  ctx.font = '400 38px Outfit, sans-serif';
  wrap(ctx, card.body, pad, y + 70, W - pad * 2, 50);
  ctx.globalAlpha = 0.5;
  ctx.font = '600 26px Outfit, sans-serif';
  ctx.fillText('N O I R', W - pad - ctx.measureText('N O I R').width, 96);
  ctx.globalAlpha = 1;

  try {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noir-replay-${card.kind}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch {
    if (withGraphic) saveCard(cardEl, card, false);
  }
}

function CardArt({
  card,
  month,
  monthDays,
  artistImage,
  trackImage,
}: Omit<NoirReplayStoryProps, 'cards' | 'onClose'> & { card: ReplayCard }) {
  const creature = useMemo(
    () => (card.kind === 'close' ? renderHeatFigure(card.seed, month.playCount, 'ember', 720) : ''),
    [card.kind, card.seed, month.playCount]
  );
  switch (card.kind) {
    case 'intro':
      return <NoirHeatWeek values={monthDays} seed={card.seed} span={[0.1, 0.9]} className="noir-replay-art-fill" />;
    case 'artist':
      return <NoirDitherCover world="bone" source={artistImage} seed={card.seed} size={236} radius={0} />;
    case 'track':
      return <NoirArtwork source={trackImage} world="ink" seed={card.seed} size={216} className="noir-replay-art-cover" />;
    case 'clock':
      return (
        <NoirHalftoneClock
          hours={month.clock.hours}
          peakHour={month.clock.peakHour}
          seed={card.seed}
          className="noir-replay-art-clock"
        />
      );
    case 'close':
      return creature ? <img src={creature} alt="" className="noir-replay-art-fill" draggable={false} /> : null;
  }
}

export function NoirReplayStory({ cards, month, monthDays, artistImage, trackImage, onClose }: NoirReplayStoryProps) {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const card = cards[index];
  const isLast = index >= cards.length - 1;
  const isFirst = index <= 0;

  const goNext = useCallback(() => {
    if (isLast) onClose();
    else setIndex((i) => Math.min(cards.length - 1, i + 1));
  }, [cards.length, isLast, onClose]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!card) return null;
  const theme = CARD_THEME[card.kind];

  return (
    <motion.div
      className="noir-replay"
      role="dialog"
      aria-modal="true"
      aria-label={strings.stats.replayEyebrow}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={withReducedMotion(MOTION.panel)}
    >
      <button type="button" className="noir-replay-close noir-focus-ring" onClick={onClose} aria-label={strings.stats.closeReplay}>
        <X className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="noir-replay-progress" aria-hidden>
        {cards.map((c, i) => (
          <span key={c.id} className={`noir-replay-progress-seg${i <= index ? ' is-on' : ''}`} />
        ))}
      </div>

      <motion.article
        ref={cardRef}
        key={card.id}
        className="noir-replay-card"
        data-kind={card.kind}
        style={{ background: theme.bg, color: theme.ink }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withReducedMotion(MOTION.panel)}
      >
        <span className="noir-replay-wordmark">N O I R</span>
        <div className="noir-replay-card-art">
          <CardArt card={card} month={month} monthDays={monthDays} artistImage={artistImage} trackImage={trackImage} />
        </div>
        <div className="noir-replay-copy">
          <p className="noir-replay-eyebrow">{card.eyebrow}</p>
          <h2 className="noir-replay-headline">{card.headline}</h2>
          <p className="noir-replay-body">{card.body}</p>
        </div>
      </motion.article>

      <div className="noir-replay-actions">
        <button
          type="button"
          className="noir-button-secondary"
          onClick={goPrev}
          disabled={isFirst}
          aria-label={strings.stats.replayPrev}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          {strings.stats.replayPrev}
        </button>
        <button
          type="button"
          className="noir-button-secondary"
          onClick={() => cardRef.current && saveCard(cardRef.current, card)}
        >
          {strings.stats.saveImage}
        </button>
        <button type="button" className="noir-button-primary" onClick={goNext}>
          {isLast ? strings.stats.replayDone : strings.stats.replayNext}
          {!isLast && <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}
        </button>
      </div>
    </motion.div>
  );
}
