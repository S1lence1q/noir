import { strings } from '../../../constants/strings';

export type HistoryStripDay = {
  /** Local date, YYYY-MM-DD: matches a day section's `data-day`. */
  key: string;
  label: string;
  plays: number;
};

const MAX_DOTS = 8;

/**
 * History's one graphic: the last 30 days as columns of halftone dots, one dot per slice of that
 * day's plays. The busiest day is Ember. Fixed height, so nothing moves when data lands.
 */
export function NoirHistoryStrip({ days, onPick }: { days: HistoryStripDay[]; onPick: (key: string) => void }) {
  const peak = Math.max(1, ...days.map((d) => d.plays));
  const peakKey = days.find((d) => d.plays === peak && peak > 1)?.key;

  return (
    <div className="noir-history-strip" role="group" aria-label={strings.library.historyStripLabel}>
      <ol className="noir-history-strip-cols">
        {days.map((day) => {
          const dots = day.plays === 0 ? 0 : Math.max(1, Math.ceil((day.plays / peak) * MAX_DOTS));
          const col = (
            <>
              {Array.from({ length: Math.max(1, dots) }).map((_, i) => (
                <span key={i} className="noir-history-strip-dot" data-empty={dots === 0 || undefined} />
              ))}
            </>
          );
          return (
            <li key={day.key} data-peak={day.key === peakKey || undefined}>
              {day.plays > 0 ? (
                <button
                  type="button"
                  className="noir-history-strip-col elva-focus-ring"
                  data-tip={strings.library.historyStripTip(day.label, day.plays)}
                  aria-label={strings.library.historyStripTip(day.label, day.plays)}
                  onClick={() => onPick(day.key)}
                >
                  {col}
                </button>
              ) : (
                <span className="noir-history-strip-col" aria-hidden>
                  {col}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="noir-history-strip-axis" aria-hidden>
        <span>{strings.library.historyStripStart}</span>
        <span>{strings.library.historyToday}</span>
      </p>
    </div>
  );
}
