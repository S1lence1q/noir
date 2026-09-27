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
import { worldForCollection } from '../../../utils/ditherCover';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirListeningClock } from './NoirListeningClock';
import { NoirMark } from './NoirMark';
import { NoirReplayStory } from './NoirReplayStory';

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
    const heroSeed = `sound-week-${artists[0]?.artist ?? 'empty'}-${Math.round(weekMs / 60_000)}`;
    return { weekMs, monthMs, artists, tracks, clock, streak, replay, heroSeed };
  }, [events]);

  const openReplay = () => {
    if (!summary?.replay) return;
    setReplayCards(summary.replay.cards);
    setReplayOpen(true);
  };

  if (events === null) {
    return (
      <div className="noir-stats" aria-busy="true">
        <div className="noir-stats-skeleton noir-stats-skeleton--hero" />
        <div className="noir-stats-skeleton noir-stats-skeleton--wide" />
        <div className="noir-stats-skeleton" />
      </div>
    );
  }

  if (!summary || events.length === 0) {
    return (
      <div className="noir-stats noir-stats--empty">
        <NoirMark size={120} variant="spray" color="var(--noir-text-tertiary)" className="noir-library-empty-mark" />
        <p className="relative text-[15px] text-[color:var(--noir-text-primary)]">{strings.stats.emptyTitle}</p>
        <p className="relative mt-2 max-w-sm text-[14px] text-[color:var(--noir-text-secondary)]">
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
          <NoirDitherCover world="bone" seed={summary.heroSeed} size={168} madeForYou className="noir-stats-hero-art" />
          <div className="noir-stats-hero-copy">
            <p className="noir-stats-eyebrow">{strings.stats.thisWeek}</p>
            <p className="noir-stats-hero-value">{formatListened(summary.weekMs)}</p>
            <p className="noir-stats-hero-sub">
              {strings.stats.thisMonth}: {formatListened(summary.monthMs)}
              {summary.streak > 0 ? ` · ${strings.stats.streak(summary.streak)}` : ''}
            </p>
          </div>
        </section>

        {summary.replay && (
          <section className="noir-stats-replay-cta">
            <NoirDitherCover
              world="bone"
              seed={`replay-cta-${summary.replay.month.year}-${summary.replay.month.month}`}
              size={88}
              madeForYou
              className="noir-stats-replay-art"
            />
            <div className="min-w-0 flex-1">
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
            <ol className="noir-stats-tiles">
              {summary.artists.map((artist, index) => (
                <li key={artist.artist} className="noir-stats-tile">
                  <span className="noir-stats-tile-art">
                    <NoirDitherCover
                      world={index === 0 ? 'bone' : worldForCollection(artist.artist)}
                      seed={`stats-artist-${artist.artist}`}
                      size={96}
                      madeForYou={index === 0}
                    />
                    <span className="noir-stats-tile-rank">{index + 1}</span>
                  </span>
                  <span className="noir-stats-tile-label truncate">{artist.artist}</span>
                  <span className="noir-stats-tile-meta">{strings.stats.plays(artist.plays)}</span>
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
            <ol className="noir-stats-tiles">
              {summary.tracks.map((track, index) => (
                <li key={track.songKey} className="noir-stats-tile">
                  <span className="noir-stats-tile-art">
                    <NoirDitherCover
                      world={index === 0 ? 'bone' : worldForCollection(track.songKey)}
                      seed={`stats-track-${track.songKey}`}
                      size={96}
                      madeForYou={index === 0}
                    />
                    <span className="noir-stats-tile-rank">{index + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="noir-stats-tile-label block truncate">{track.title}</span>
                    <span className="noir-stats-tile-meta block truncate">{track.artist}</span>
                  </span>
                  <span className="noir-stats-tile-meta shrink-0">{strings.stats.plays(track.plays)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="noir-stats-block noir-stats-block--clock">
          <div className="noir-stats-clock-copy">
            <h2 className="noir-stats-section-title">{strings.stats.listeningClock}</h2>
            <p className="noir-stats-clock-peak">
              {summary.clock.peakCount > 0
                ? strings.stats.peakHour(formatHourLabel(summary.clock.peakHour))
                : strings.stats.noRankings}
            </p>
          </div>
          <NoirListeningClock hours={summary.clock.hours} peakHour={summary.clock.peakHour} size={280} />
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
