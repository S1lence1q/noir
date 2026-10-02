import React from 'react';

type NoirEmptyStateVariant = 'panel' | 'inline';

interface NoirEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: NoirEmptyStateVariant;
}

export function NoirEmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  variant = 'panel',
}: NoirEmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className={`py-4 px-1 text-left select-none ${className}`}>
        <p className="text-xs font-medium text-white/35 leading-relaxed">{title}</p>
        {description && (
          <p className="text-xs text-white/25 mt-0.5 font-light leading-relaxed max-w-[280px]">
            {description}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-[11px] text-white/25 hover:text-white/55 transition-colors mt-1.5 cursor-pointer noir-focus-ring rounded-sm"
          >
            {action.label} →
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`noir-empty-state-panel py-10 px-6 text-center flex flex-col items-center justify-center select-none ${className}`}
    >
      {icon && <div className="mb-3 text-white/25">{icon}</div>}
      <p className="text-white/55 text-sm font-medium">{title}</p>
      {description && (
        <p className="text-white/30 text-xs mt-1.5 font-light max-w-[300px] leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer noir-focus-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
