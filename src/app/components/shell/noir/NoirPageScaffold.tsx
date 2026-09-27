import { ReactNode } from 'react';

type NoirPageScaffoldProps = {
  title: string;
  subtitle?: string;
  titleSize?: 'default' | 'compact';
  headerExtra?: ReactNode;
  children: ReactNode;
};

export function NoirPageScaffold({
  title,
  subtitle,
  titleSize = 'default',
  headerExtra,
  children,
}: NoirPageScaffoldProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={`shrink-0 ${titleSize === 'compact' ? 'pb-2 pt-5' : 'pb-4 pt-6'}`}>
        <div className="noir-content flex items-end justify-between gap-6">
          <div>
            <h1
                className={`noir-page-title ${titleSize === 'compact' ? 'text-[24px]' : ''}`}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-[16px] text-[color:var(--noir-text-secondary)]">{subtitle}</p>
            )}
          </div>
          {headerExtra}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none pb-10">
        <div className="noir-content">{children}</div>
      </div>
    </div>
  );
}
