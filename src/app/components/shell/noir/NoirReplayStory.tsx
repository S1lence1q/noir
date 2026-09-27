import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { strings } from '../../../constants/strings';
import type { ReplayCard } from '../../../services/listening/statsSummary';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirMark } from './NoirMark';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { COLOR_WORLDS } from '../../../utils/ditherCover';

export type NoirReplayStoryProps = {
  cards: ReplayCard[];
  coverSource?: string;
  onClose: () => void;
};

function downloadBoneCard(card: ReplayCard) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bone = COLOR_WORLDS.bone;
  ctx.fillStyle = bone.field;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = bone.dark;
  ctx.font = '600 36px Outfit, sans-serif';
  ctx.fillText(card.eyebrow.toUpperCase(), 72, 120);

  ctx.font = '600 72px Outfit, sans-serif';
  const words = card.headline.split(' ');
  let line = '';
  let y = 280;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width - 144) {
      ctx.fillText(line, 72, y);
      line = word;
      y += 88;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, 72, y);

  ctx.font = '400 40px Outfit, sans-serif';
  ctx.globalAlpha = 0.72;
  const bodyWords = card.body.split(' ');
  line = '';
  y += 100;
  for (const word of bodyWords) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width - 144) {
      ctx.fillText(line, 72, y);
      line = word;
      y += 56;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, 72, y);
  ctx.globalAlpha = 1;

  ctx.font = '600 28px Outfit, sans-serif';
  ctx.fillText('NOIR', 72, height - 72);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noir-replay-${card.kind}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export function NoirReplayStory({ cards, coverSource, onClose }: NoirReplayStoryProps) {
  const [index, setIndex] = useState(0);
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
      <button type="button" className="noir-replay-close elva-focus-ring" onClick={onClose} aria-label={strings.stats.closeReplay}>
        <X className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="noir-replay-progress" aria-hidden>
        {cards.map((c, i) => (
          <span key={c.id} className={`noir-replay-progress-seg${i <= index ? ' is-on' : ''}`} />
        ))}
      </div>

      <motion.article
        key={card.id}
        className="noir-replay-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={withReducedMotion(MOTION.panel)}
      >
        <div className="noir-replay-card-art">
          <NoirDitherCover world="bone" source={coverSource} seed={card.seed} size={220} madeForYou />
          <NoirMark size={28} variant="vector" color={COLOR_WORLDS.bone.mark} className="noir-replay-card-mark" />
        </div>
        <p className="noir-replay-eyebrow">{card.eyebrow}</p>
        <h2 className="noir-replay-headline">{card.headline}</h2>
        <p className="noir-replay-body">{card.body}</p>
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
        <button type="button" className="noir-button-secondary" onClick={() => downloadBoneCard(card)}>
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
