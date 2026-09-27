import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import atmosphereCool from '../../../../assets/noir/atmosphere-cool.png';
import atmosphereWarm from '../../../../assets/noir/atmosphere-warm.jpeg';
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
import { COLOR_WORLDS, worldForCollection, type ColorWorld } from '../../../utils/ditherCover';
import { getPlaybackSongKey } from '../../../utils/playbackSongKey';
import { MOTION, withReducedMotion } from '../../../utils/motionPresets';
import { NoirDitherCover } from './NoirDitherCover';
import { NoirMark } from './NoirMark';
import { NoirReplayStory } from './NoirReplayStory';

export type NoirStatsViewProps = {
  favorites?: SearchResult[];
  recentTracks?: SearchResult[];
};

/** Soft stage mood — Bone/Ink map to warm so the field never reads grey. */
function auraWorld(world: ColorWorld): ColorWorld {
  return world === 'bone' || world === 'ink' ? 'ember' : world;
}

function atmosphereFor(world: ColorWorld) {
  return world === 'cobalt' || world === 'moss' ? atmosphereCool : atmosphereWarm;
}

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

function HourStrip({ hours, peakHour }: { hours: number[]; peakHour: number }) {
  const max = Math.max(1, ...hours);
  return (
    <div className="noir-stats-hour-strip" aria-hidden>
      {hours.map((count, hour) => (
        <span
          key={hour}
          className={`noir-stats-hour-dot${hour === peakHour && count > 0 ? ' is-peak' : ''}`}
          style={{ opacity: count === 0 ? 0.2 : 0.35 + (count / max) * 0.65 }}
          title={`${formatHourLabel(hour)} · ${count}`}
        />
      ))}
    </div>
  );
}

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
    return { weekMs, monthMs, artists, tracks, clock, streak, replay };
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
        <NoirMark size={120} variant="spray" color="var(--noir-text-tertiary)" className="noir-library-empty-mark" />
        <p className="relative text-[15px] text-[color:var(--noir-text-primary)]">{strings.stats.emptyTitle}</p>
        <p className="relative mt-2 max-w-sm text-[14px] text-[color:var(--noir-text-secondary)]">
          {strings.stats.emptyBody}
        </p>
      </div>
    );
  }

  const topArtist = summary.artists[0] ?? null;
  const secondArtist = summary.artists[1] ?? null;
  const heroSource = topArtist ? artistImages[topArtist.artist] : undefined;
  const clockSource = heroSource;
  const primaryAura = auraWorld(topArtist ? worldForCollection(topArtist.artist) : 'ember');
  const secondaryAura = auraWorld(secondArtist ? worldForCollection(secondArtist.artist) : 'cobalt');

  return (
    <>
      <motion.div
        className="noir-stats"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={withReducedMotion(MOTION.panel)}
      >
        {/* Real grain atmosphere (ref), not CSS wash — screen blend so blacks vanish = no kant */}
        <div className="noir-stats-stage" aria-hidden>
          <img
            className="noir-stats-atmosphere noir-stats-atmosphere--primary"
            src={atmosphereFor(primaryAura)}
            alt=""
            draggable={false}
          />
          <img
            className="noir-stats-atmosphere noir-stats-atmosphere--secondary"
            src={atmosphereFor(secondaryAura)}
            alt=""
            draggable={false}
          />
        </div>

        <section className="noir-stats-hero-band">
          <div className="noir-stats-hero-band-copy">
            <p className="noir-stats-eyebrow">{strings.stats.thisWeek}</p>
            <p className="noir-stats-hero-value">{formatListened(summary.weekMs)}</p>
            <p className="noir-stats-hero-sub">
              {strings.stats.thisMonth}: {formatListened(summary.monthMs)}
              {summary.streak > 0 ? ` · ${strings.stats.streak(summary.streak)}` : ''}
            </p>
            {topArtist && (
              <p className="noir-stats-hero-top">
                {strings.stats.yourNumberOne}: {topArtist.artist}
              </p>
            )}
          </div>
          <div className="noir-stats-hero-band-art">
            <NoirDitherCover
              source={heroSource}
              world="bone"
              seed={topArtist ? `sound-hero-${topArtist.artist}` : 'sound-hero'}
              size={200}
              madeForYou
            />
            <NoirMark
              size={160}
              variant="spray"
              color={COLOR_WORLDS.bone.mark}
              className="noir-stats-hero-band-mark"
            />
          </div>
        </section>

        {summary.replay && (
          <section className="noir-stats-replay-cta">
            <NoirDitherCover
              source={heroSource}
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
            <div className="noir-stats-artists">
              {summary.artists[0] && (
                <article className="noir-stats-artists-lead">
                  <NoirDitherCover
                    source={artistImages[summary.artists[0].artist]}
                    world="bone"
                    seed={`stats-artist-lead-${summary.artists[0].artist}`}
                    size={280}
                    madeForYou
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
                      <NoirDitherCover
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
                    <NoirDitherCover
                      source={trackImages[track.songKey]}
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
          <div className="noir-stats-clock-card">
            <NoirDitherCover
              source={clockSource}
              world="bone"
              seed={topArtist ? `sound-clock-${topArtist.artist}` : 'sound-clock'}
              size={280}
              madeForYou
              className="noir-stats-clock-art"
            />
            <div className="noir-stats-clock-meta">
              <p className="noir-stats-eyebrow">{strings.stats.listeningClock}</p>
              <p className="noir-stats-clock-peak-lg">
                {summary.clock.peakCount > 0
                  ? strings.stats.peakHour(formatHourLabel(summary.clock.peakHour))
                  : strings.stats.noRankings}
              </p>
              {topArtist && <p className="noir-stats-clock-artist">{topArtist.artist}</p>}
              <HourStrip hours={summary.clock.hours} peakHour={summary.clock.peakHour} />
            </div>
          </div>
        </section>
      </motion.div>

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
