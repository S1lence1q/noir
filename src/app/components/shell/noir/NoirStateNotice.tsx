import { RefreshCw } from 'lucide-react';
import { strings } from '../../../constants/strings';
import { useOnline } from '../../../hooks/useOnline';

type NoirStateNoticeProps = {
  /** What failed, in the screen's own words. Replaced by the offline copy when there is no network. */
  title: string;
  description?: string;
  onRetry?: () => void;
  /** Tighter spacing for use inside a section instead of a whole page. */
  compact?: boolean;
};

/** One quiet error/offline state for every screen that fetches: a line, a reason, one Retry. */
export function NoirStateNotice({ title, description, onRetry, compact }: NoirStateNoticeProps) {
  const online = useOnline();
  return (
    <div className={compact ? 'py-8' : 'py-16'} role="status">
      <p className="text-[15px] text-[color:var(--noir-text-primary)]">{online ? title : strings.offline.title}</p>
      <p className="mt-2 max-w-md text-[14px] text-[color:var(--noir-text-secondary)]">
        {online ? description : strings.offline.description}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="noir-button-secondary mt-5 noir-focus-ring">
          <RefreshCw className="h-3.5 w-3.5" />
          {strings.discover.retry}
        </button>
      )}
    </div>
  );
}
