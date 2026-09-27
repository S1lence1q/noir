import type { ListeningEvent } from './eventsStore';
import {
  hourHistogram,
  streakDays,
  topArtists,
  topTracks,
  totalListenedMs,
  type TasteArtist,
  type TasteTrack,
} from './tasteProfile';

export type ListeningClock = {
  hours: number[];
  peakHour: number;
  peakCount: number;
};

export type MonthStats = {
  year: number;
  month: number;
  label: string;
  listenedMs: number;
  playCount: number;
  topArtist: TasteArtist | null;
  topTrack: TasteTrack | null;
  clock: ListeningClock;
  streak: number;
};

export type ReplayCardKind = 'intro' | 'artist' | 'track' | 'clock' | 'close';

export type ReplayCard = {
  id: string;
  kind: ReplayCardKind;
  eyebrow: string;
  headline: string;
  body: string;
  seed: string;
};

/** Human minutes/hours copy — "3 h 12 min", "41 min". */
export function formatListened(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin < 1) return '0 min';
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function formatHourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function previousCalendarMonth(now = new Date()): { year: number; month: number } {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function eventsInCalendarMonth(
  events: ReadonlyArray<ListeningEvent>,
  year: number,
  month: number
): ListeningEvent[] {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  return events.filter((event) => event.startedAt >= start && event.startedAt < end);
}

export function buildListeningClock(
  events: ReadonlyArray<ListeningEvent>,
  days?: number
): ListeningClock {
  const hours = hourHistogram(events, days);
  let peakHour = 0;
  let peakCount = 0;
  hours.forEach((count, hour) => {
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  });
  return { hours, peakHour, peakCount };
}

export function buildMonthStats(
  events: ReadonlyArray<ListeningEvent>,
  year: number,
  month: number
): MonthStats {
  const monthEvents = eventsInCalendarMonth(events, year, month);
  const artists = topArtists(monthEvents);
  const tracks = topTracks(monthEvents);
  return {
    year,
    month,
    label: monthLabel(year, month),
    listenedMs: totalListenedMs(monthEvents),
    playCount: monthEvents.length,
    topArtist: artists[0] ?? null,
    topTrack: tracks[0] ?? null,
    clock: buildListeningClock(monthEvents),
    streak: streakDays(monthEvents),
  };
}

/** Five story cards for last calendar month (NOIR Replay). */
export function buildMonthlyReplayCards(
  events: ReadonlyArray<ListeningEvent>,
  now = new Date()
): { month: MonthStats; cards: ReplayCard[] } | null {
  const { year, month } = previousCalendarMonth(now);
  const stats = buildMonthStats(events, year, month);
  if (stats.playCount === 0) return null;

  const seedBase = `replay-${year}-${month}`;
  const cards: ReplayCard[] = [
    {
      id: `${seedBase}-intro`,
      kind: 'intro',
      eyebrow: 'NOIR Replay',
      headline: stats.label,
      body: `You listened for ${formatListened(stats.listenedMs)} across ${stats.playCount} plays.`,
      seed: `${seedBase}-intro`,
    },
  ];

  if (stats.topArtist) {
    cards.push({
      id: `${seedBase}-artist`,
      kind: 'artist',
      eyebrow: 'Your #1 artist',
      headline: stats.topArtist.artist,
      body: `${stats.topArtist.plays} plays this month.`,
      seed: `${seedBase}-artist`,
    });
  }

  if (stats.topTrack) {
    cards.push({
      id: `${seedBase}-track`,
      kind: 'track',
      eyebrow: 'Your #1 track',
      headline: stats.topTrack.title,
      body: `${stats.topTrack.artist} · ${stats.topTrack.plays} plays.`,
      seed: `${seedBase}-track`,
    });
  }

  if (stats.clock.peakCount > 0) {
    cards.push({
      id: `${seedBase}-clock`,
      kind: 'clock',
      eyebrow: 'Listening clock',
      headline: formatHourLabel(stats.clock.peakHour),
      body: 'Your busiest hour last month.',
      seed: `${seedBase}-clock`,
    });
  }

  cards.push({
    id: `${seedBase}-close`,
    kind: 'close',
    eyebrow: 'NOIR Replay',
    headline: stats.streak > 1 ? `${stats.streak}-day streak` : 'Keep going',
    body:
      stats.streak > 1
        ? `You showed up ${stats.streak} days in a row. See you next month.`
        : 'Same place next month — your sound, on Bone.',
    seed: `${seedBase}-close`,
  });

  return { month: stats, cards: cards.slice(0, 5) };
}
