import { useState, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { strings } from '../constants/strings';

interface OnboardingTourProps {
  tourType: 'landing' | 'player' | null;
  currentStep: number;
  isTransitioning: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  borderRadius: string;
}

export const tourSteps: TourStep[] = [
  {
    targetId: 'search-input',
    title: strings.tour.searchTitle,
    description: strings.tour.searchDesc,
    position: 'bottom',
    borderRadius: '24',
  },
  {
    targetId: 'tour-discover-section',
    title: strings.tour.discoverTitle,
    description: strings.tour.discoverDesc,
    position: 'bottom',
    borderRadius: '16',
  },
  {
    targetId: 'landing-section-nav',
    title: strings.tour.navTitle,
    description: strings.tour.navDesc,
    position: 'left',
    borderRadius: '20',
  },
];

const CARD_W = 340;
const CARD_MARGIN = 14;

function computeCardPos(
  rect: DOMRect,
  position: TourStep['position']
): { left: number; top: number } {
  const CARD_H = 210;
  let left = 0;
  let top = 0;

  switch (position) {
    case 'bottom':
      left = rect.left + rect.width / 2 - CARD_W / 2;
      top = rect.bottom + CARD_MARGIN;
      break;
    case 'top':
      left = rect.left + rect.width / 2 - CARD_W / 2;
      top = rect.top - CARD_H - CARD_MARGIN;
      break;
    case 'left':
      left = rect.left - CARD_W - CARD_MARGIN;
      top = rect.top + rect.height / 2 - CARD_H / 2;
      break;
    case 'right':
      left = rect.right + CARD_MARGIN;
      top = rect.top + rect.height / 2 - CARD_H / 2;
      break;
    default:
      left = window.innerWidth / 2 - CARD_W / 2;
      top = window.innerHeight / 2 - CARD_H / 2;
  }

  left = Math.max(16, Math.min(window.innerWidth - CARD_W - 16, left));
  top = Math.max(16, Math.min(window.innerHeight - CARD_H - 16, top));
  return { left, top };
}

export function OnboardingTour({
  tourType,
  currentStep,
  isTransitioning,
  onNext,
  onBack,
  onSkip,
}: OnboardingTourProps) {
  // pos + rect are always computed synchronously before paint via useLayoutEffect
  const [cardPos, setCardPos] = useState({ left: 0, top: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);

  const activeStep = tourSteps[currentStep];

  const measure = useCallback(() => {
    if (!activeStep) return;
    const el = document.getElementById(activeStep.targetId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
    setCardPos(computeCardPos(rect, activeStep.position));
    setReady(true);
  }, [activeStep]);

  // useLayoutEffect: runs synchronously after DOM mutations, before browser paint.
  // This means the card is always positioned correctly on its very first render frame.
  useLayoutEffect(() => {
    if (!tourType || !activeStep || isTransitioning) {
      setReady(false);
      return;
    }

    // Try immediately, then retry once in case the element isn't painted yet
    const el = document.getElementById(activeStep.targetId);
    if (el) {
      measure();
    } else {
      const id = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(id);
    }
  }, [currentStep, tourType, activeStep, isTransitioning, measure]);

  // NOTE: do NOT return null early here — AnimatePresence needs to render its children
  // to play exit animations. Instead we conditionally render inside AnimatePresence below.

  const ring = targetRect
    ? {
        left: targetRect.left - 4,
        top: targetRect.top - 4,
        width: targetRect.width + 8,
        height: targetRect.height + 8,
        borderRadius: parseInt(activeStep.borderRadius, 10) + 4,
      }
    : null;

  // Guard after the ring/pos computation so we always have valid ring data before rendering
  const isVisible = !!tourType && !!activeStep;

  return (
    <>
      {/* 1. Persistent dimmed backdrop — no blur so the highlighted element stays crisp */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="tour-dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed inset-0 z-[95] bg-black/55 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* 2. Accent ring around the highlighted element — fades between steps */}
      <AnimatePresence>
        {isVisible && ready && !isTransitioning && ring && (
          <motion.div
            key={`ring-${currentStep}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed z-[96] pointer-events-none"
            style={{
              left: ring.left,
              top: ring.top,
              width: ring.width,
              height: ring.height,
              borderRadius: ring.borderRadius,
              border: '1.5px solid var(--noir-accent-border)',
              boxShadow: '0 0 0 2000px rgba(5, 5, 5, 0.58)',
            }}
          />
        )}
      </AnimatePresence>

      {/* 3. Tooltip card */}
      <AnimatePresence mode="wait">
        {isVisible && ready && !isTransitioning && (
          <motion.div
            key={`card-${currentStep}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed z-[98] pointer-events-auto select-none"
            style={{ left: cardPos.left, top: cardPos.top, width: CARD_W }}
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d10]/90 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-noir-accent-muted text-[10px] uppercase tracking-[0.16em] font-semibold mb-1">
                    {currentStep + 1} / {tourSteps.length}
                  </p>
                  <h3 className="text-[14px] font-semibold text-white/90 leading-snug">
                    {activeStep.title}
                  </h3>
                </div>
                <button
                  onClick={onSkip}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <p className="text-[13px] text-white/45 leading-relaxed">
                {activeStep.description}
              </p>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {tourSteps.map((_, i) => (
                  <div
                    key={i}
                    className="h-[3px] rounded-full transition-all duration-300"
                    style={{
                      width: i === currentStep ? 18 : 5,
                      background:
                        i === currentStep
                          ? 'var(--noir-theme-accent)'
                          : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <button
                  onClick={onSkip}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={onBack}
                      className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer text-white/50 hover:text-white/80"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={onNext}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium text-white/85 hover:text-white bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] transition-all cursor-pointer"
                    style={{ boxShadow: '0 0 0 1px var(--noir-accent-border) inset' }}
                  >
                    {currentStep === tourSteps.length - 1 ? 'Done' : 'Next'}
                    <ChevronRight className="w-3.5 h-3.5 text-noir-accent-muted" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
