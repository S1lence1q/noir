import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { strings } from '../../../constants/strings';
import { getListeningEvents, type ListeningEvent } from '../../../services/listening/eventsStore';
import {
  buildListeningClock,
  buildMonthlyReplayCards,
  formatHourLabel,
  formatListened,
  type ReplayCard,
} from '../../../services/listening/statsSummary';
import {
  streakDays,
  topArtists,
  topTracks,
  totalListenedMs,
} from '../../../services/listening/tasteProfile';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { NoirReplayStory } from './NoirReplayStory';

function ListeningClockBars({ hours, peakHour }: { hours: number[]; peakHour: number }) {
  const max = Math.max(1, ...hours);
  return (
    <div className="noir-stats-clock" aria-hidden>
      {hours.map((count, hour) => (
        <span
          key={hour}
          className={`noir-stats-clock-bar${hour === peakHour && count > 0 ? ' is-peak' : ''}`}
          style={{ height: `${Math.max(8, Math.round((count / max) * 100))}%` }}
          title={`${formatHourLabel(hour)} · ${count}`}
        />
      ))}
    </div>
  );
}

export function NoirStatsView() {
  const [events, setEvents] = useState<ListeningEvent[] | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayCards, setReplayCards] = useState<ReplayCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getListeningEvents()
      .then((next) => {
        if (!cancelled) setEvents(next);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (!events) return null;
    const weekMs = totalListenedMs(events, 7);
    const monthMs = totalListenedMs(events, 30);
    const artists = topArtists(events, 30).slice(0, 5);
    const tracks = topTracks(events, 30).slice(0, 5);
    const clock = buildListeningClock(events, 30);
    const streak = streakDays(events);
    const replay = buildMonthlyReplayCards(events);
    return { weekMs, monthMs, artists, tracks, clock, streak, replay };
  }, [events]);

  const openReplay = () => {
    if (!summary?.replay) return;
    setReplayCards(summary.replay.cards);
    setReplayOpen(true);
  };

  if (events === null) {
    return (
      <div className="noir-stats" aria-busy="true">
        <div className="noir-stats-skeleton" />
        <div className="noir-stats-skeleton noir-stats-skeleton--wide" />
        <div className="noir-stats-skeleton" />
      </div>
    );
  }

  if (!summary || events.length === 0) {
    return (
      <div className="noir-stats noir-stats--empty">
        <p className="text-[15px] text-[color:var(--noir-text-primary)]">{strings.stats.emptyTitle}</p>
        <p className="mt-2 max-w-sm text-[14px] text-[color:var(--noir-text-secondary)]">
          {strings.stats.emptyBody}
        </p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="noir-stats"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={withReducedMotion(MOTION.panel)}
      >
        <section className="noir-stats-hero">
          <p className="noir-stats-eyebrow">{strings.stats.thisWeek}</p>
          <p className="noir-stats-hero-value">{formatListened(summary.weekMs)}</p>
          <p className="noir-stats-hero-sub">
            {strings.stats.thisMonth}: {formatListened(summary.monthMs)}
            {summary.streak > 0 ? ` · ${strings.stats.streak(summary.streak)}` : ''}
          </p>
        </section>

        {summary.replay && (
          <section className="noir-stats-replay-cta">
            <div>
              <p className="noir-stats-eyebrow">{strings.stats.replayEyebrow}</p>
              <p className="noir-stats-section-title">{summary.replay.month.label}</p>
              <p className="noir-stats-replay-hint">{strings.stats.replayHint}</p>
            </div>
            <button type="button" className="noir-button-primary" onClick={openReplay}>
              {strings.stats.openReplay}
            </button>
          </section>
        )}

        <section className="noir-stats-block">
          <h2 className="noir-stats-section-title">{strings.stats.topArtists}</h2>
          {summary.artists.length === 0 ? (
            <p className="text-[13px] text-[color:var(--noir-text-tertiary)]">{strings.stats.noRankings}</p>
          ) : (
            <ol className="noir-stats-rank">
              {summary.artists.map((artist, index) => (
                <li key={artist.artist}>
                  <span className="noir-stats-rank-n">{index + 1}</span>
                  <span className="noir-stats-rank-label">{artist.artist}</span>
                  <span className="noir-stats-rank-meta">{strings.stats.plays(artist.plays)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="noir-stats-block">
          <h2 className="noir-stats-section-title">{strings.stats.topTracks}</h2>
          {summary.tracks.length === 0 ? (
            <p className="text-[13px] text-[color:var(--noir-text-tertiary)]">{strings.stats.noRankings}</p>
          ) : (
            <ol className="noir-stats-rank">
              {summary.tracks.map((track, index) => (
                <li key={track.songKey}>
                  <span className="noir-stats-rank-n">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="noir-stats-rank-label block truncate">{track.title}</span>
                    <span className="noir-stats-rank-meta block truncate">{track.artist}</span>
                  </span>
                  <span className="noir-stats-rank-meta shrink-0">{strings.stats.plays(track.plays)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="noir-stats-block">
          <h2 className="noir-stats-section-title">{strings.stats.listeningClock}</h2>
          <p className="mb-3 text-[13px] text-[color:var(--noir-text-secondary)]">
            {summary.clock.peakCount > 0
              ? strings.stats.peakHour(formatHourLabel(summary.clock.peakHour))
              : strings.stats.noRankings}
          </p>
          <ListeningClockBars hours={summary.clock.hours} peakHour={summary.clock.peakHour} />
        </section>
      </motion.div>

      <AnimatePresence>
        {replayOpen && replayCards && (
          <NoirReplayStory cards={replayCards} onClose={() => setReplayOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
