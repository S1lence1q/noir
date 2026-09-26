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
      <header className={`shrink-0 px-6 ${titleSize === 'compact' ? 'pb-2 pt-5' : 'pb-4 pt-6'}`}>
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1
              className={
                titleSize === 'compact'
                  ? 'text-[24px] font-semibold tracking-[-0.02em] text-[color:var(--noir-text-primary)]'
                  : 'text-[30px] font-semibold tracking-[-0.02em] text-[color:var(--noir-text-primary)]'
              }
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

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none px-6 pb-10">{children}</div>
    </div>
  );
}
