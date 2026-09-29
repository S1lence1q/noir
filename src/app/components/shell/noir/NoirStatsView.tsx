import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { strings } from '../../../constants/strings';
import type { SearchResult } from '../../../types';
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
  type TasteArtist,
  type TasteTrack,
} from '../../../services/listening/tasteProfile';
import { getArtistImage, getTrackImage } from '../../../services/musicGraph';
import { worldForCollection } from '../../../utils/ditherCover';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { NoirArtwork } from './NoirArtwork';
import { NoirIdentityCover } from './NoirIdentityCover';
import { NoirGraphicAccent } from './NoirGraphicAccent';
import { NoirHeatWeek, heatWeekNodeX } from './NoirHeatWeek';
import { NoirHalftoneClock } from './NoirHalftoneClock';
import { NoirReplayStory } from './NoirReplayStory';

export type NoirStatsViewProps = {
  favorites?: SearchResult[];
  recentTracks?: SearchResult[];
};

function localPool(favorites: SearchResult[], recentTracks: SearchResult[]) {
  return [...favorites, ...recentTracks];
}

function localArtistThumb(artist: string, pool: SearchResult[]) {
  const key = artist.toLocaleLowerCase();
  return pool.find((t) => t.artist.trim().toLocaleLowerCase() === key && t.thumbnail)?.thumbnail;
}

function localTrackThumb(track: TasteTrack, pool: SearchResult[]) {
  const byKey = pool.find((t) => getPlaybackSongKey(t) === track.songKey && t.thumbnail);
  if (byKey?.thumbnail) return byKey.thumbnail;
  const title = track.title.toLocaleLowerCase();
  const artist = track.artist.toLocaleLowerCase();
  return pool.find(
    (t) =>
      t.thumbnail &&
      t.title.toLocaleLowerCase() === title &&
      t.artist.toLocaleLowerCase() === artist
  )?.thumbnail;
}

/** Minutes listened on each of the last seven days, oldest first (today last). */
function lastSevenDays(events: ReadonlyArray<ListeningEvent>) {
  const today = new Date();
  const dayStart = (offset: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset).getTime();
  return Array.from({ length: 7 }, (_, i) => {
    const offset = 6 - i;
    const from = dayStart(offset);
    const to = dayStart(offset - 1);
    const ms = events.reduce(
      (sum, e) => (e.source !== 'seed' && e.startedAt >= from && e.startedAt < to ? sum + e.listenedMs : sum),
      0
    );
    return {
      minutes: ms / 60_000,
      label: new Date(from).toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });
}

const CLOCK_MARKS = [0, 6, 12, 18];

export function NoirStatsView({ favorites = [], recentTracks = [] }: NoirStatsViewProps) {
  const [events, setEvents] = useState<ListeningEvent[] | null>(null);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({});
  const [trackImages, setTrackImages] = useState<Record<string, string>>({});
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayCards, setReplayCards] = useState<ReplayCard[] | null>(null);

  const pool = useMemo(() => localPool(favorites, recentTracks), [favorites, recentTracks]);

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
    const week = lastSevenDays(events);
    return { weekMs, monthMs, artists, tracks, clock, streak, replay, week };
  }, [events]);

  useEffect(() => {
    if (!summary) return;
    let cancelled = false;

    const resolveArtists = async (artists: TasteArtist[]) => {
      const next: Record<string, string> = {};
      await Promise.all(
        artists.map(async (artist) => {
          const local = localArtistThumb(artist.artist, pool);
          if (local) {
            next[artist.artist] = local;
            return;
          }
          const remote = await getArtistImage(artist.artist);
          if (remote) next[artist.artist] = remote;
        })
      );
      return next;
    };

    const resolveTracks = async (tracks: TasteTrack[]) => {
      const next: Record<string, string> = {};
      await Promise.all(
        tracks.map(async (track) => {
          const local = localTrackThumb(track, pool);
          if (local) {
            next[track.songKey] = local;
            return;
          }
          const remote = await getTrackImage(track.title, track.artist);
          if (remote) next[track.songKey] = remote;
        })
      );
      return next;
    };

    void (async () => {
      const [artists, tracks] = await Promise.all([
        resolveArtists(summary.artists),
        resolveTracks(summary.tracks),
      ]);
      if (cancelled) return;
      setArtistImages(artists);
      setTrackImages(tracks);
    })();

    return () => {
      cancelled = true;
    };
  }, [summary, pool]);

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
        <NoirGraphicAccent graphic="sprayAsterisk" className="noir-library-empty-spray" />
        <p className="relative text-[15px] text-[color:var(--noir-text-primary)]">{strings.stats.emptyTitle}</p>
        <p className="relative mt-2 max-w-sm text-[14px] text-[color:var(--noir-text-secondary)]">
          {strings.stats.emptyBody}
        </p>
      </div>
    );
  }

  const topArtist = summary.artists[0] ?? null;
  const heroSource = topArtist ? artistImages[topArtist.artist] : undefined;

  return (
    <>
      <div className="noir-stats">
        <motion.div
          className="noir-stats-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={withReducedMotion(MOTION.panel)}
        >
        <section className="noir-stats-hero">
          <NoirHeatWeek
            values={summary.week.map((day) => day.minutes)}
            seed="your-week"
            className="noir-stats-hero-canvas"
          />
          <div className="noir-stats-hero-copy">
            <p className="noir-stats-eyebrow">{strings.stats.thisWeek}</p>
            <p className="noir-stats-hero-value">{formatListened(summary.weekMs)}</p>
            <p className="noir-stats-hero-sub">
              {strings.stats.thisMonth}: {formatListened(summary.monthMs)}
              {summary.streak > 0 ? ` · ${strings.stats.streak(summary.streak)}` : ''}
            </p>
          </div>
          <ol className="noir-stats-hero-days" aria-hidden>
            {summary.week.map((day, i) => (
              <li
                key={i}
                style={{ left: `${heatWeekNodeX(i, summary.week.length) * 100}%` }}
                data-today={i === summary.week.length - 1 || undefined}
              >
                {day.label}
              </li>
            ))}
          </ol>
        </section>

        {summary.replay && (
          <section className="noir-stats-replay-cta">
            <NoirIdentityCover
              world="moss"
              size={88}
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
            <div className="noir-stats-artists">
              {summary.artists[0] && (
                <article className="noir-stats-artists-lead">
                  <NoirArtwork
                    source={artistImages[summary.artists[0].artist]}
                    world="bone"
                    seed={`stats-artist-lead-${summary.artists[0].artist}`}
                    size={280}
                    className="noir-stats-artists-lead-art"
                  />
                  <div className="noir-stats-artists-lead-copy">
                    <p className="noir-stats-eyebrow">{strings.stats.yourNumberOne}</p>
                    <p className="noir-stats-artists-lead-name">{summary.artists[0].artist}</p>
                    <p className="noir-stats-artists-lead-meta">
                      {strings.stats.plays(summary.artists[0].plays)}
                    </p>
                  </div>
                </article>
              )}
              {summary.artists.length > 1 && (
                <ol className="noir-stats-artists-rail">
                  {summary.artists.slice(1).map((artist, index) => (
                    <li key={artist.artist} className="noir-stats-artists-rail-row">
                      <span className="noir-stats-artists-rail-n" aria-hidden>
                        {String(index + 2).padStart(2, '0')}
                      </span>
                      <NoirArtwork
                        source={artistImages[artist.artist]}
                        world={worldForCollection(artist.artist)}
                        seed={`stats-artist-${artist.artist}`}
                        size={72}
                        className="noir-stats-artists-rail-art"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="noir-stats-tile-label block truncate">{artist.artist}</span>
                        <span className="noir-stats-tile-meta">{strings.stats.plays(artist.plays)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
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
                    <NoirArtwork
                      source={trackImages[track.songKey]}
                      world={index === 0 ? 'bone' : worldForCollection(track.songKey)}
                      seed={`stats-track-${track.songKey}`}
                      size={96}
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

        <section className="noir-stats-clock">
          <div className="noir-stats-clock-dial">
            <NoirHalftoneClock
              hours={summary.clock.hours}
              peakHour={summary.clock.peakHour}
              seed="listening-clock"
              className="noir-stats-clock-canvas"
            />
            {CLOCK_MARKS.map((hour) => (
              <span key={hour} className="noir-stats-clock-mark" data-hour={hour}>
                {formatHourLabel(hour)}
              </span>
            ))}
          </div>
          <div className="noir-stats-clock-meta">
            <p className="noir-stats-eyebrow">{strings.stats.listeningClock}</p>
            <p className="noir-stats-clock-peak-lg">
              {summary.clock.peakCount > 0
                ? strings.stats.peakHour(formatHourLabel(summary.clock.peakHour))
                : strings.stats.noRankings}
            </p>
            {summary.clock.peakCount > 0 && (
              <p className="noir-stats-clock-sub">
                {strings.stats.peakShare(
                  summary.clock.peakCount,
                  summary.clock.hours.reduce((a, b) => a + b, 0)
                )}
              </p>
            )}
          </div>
        </section>
        </motion.div>
      </div>

      <AnimatePresence>
        {replayOpen && replayCards && (
          <NoirReplayStory
            cards={replayCards}
            coverSource={heroSource}
            onClose={() => setReplayOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
