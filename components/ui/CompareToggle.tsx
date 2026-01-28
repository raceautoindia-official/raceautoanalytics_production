'use client';

import { cn } from '@/lib/utils';

interface CompareToggleProps {
  value: 'mom' | 'yoy';
  onChange: (value: 'mom' | 'yoy') => void;
  className?: string;
}

export function CompareToggle({ value, onChange, className }: CompareToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-border bg-card p-0.5 sm:p-1',
        className
      )}
    >
      <button
        onClick={() => onChange('mom')}
        className={cn(
          'rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-200 focus-ring sm:px-3 sm:py-1.5 sm:text-xs',
          value === 'mom'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
        aria-pressed={value === 'mom'}
      >
        MoM
      </button>
      <button
        onClick={() => onChange('yoy')}
        className={cn(
          'rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-200 focus-ring sm:px-3 sm:py-1.5 sm:text-xs',
          value === 'yoy'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
        aria-pressed={value === 'yoy'}
      >
        YoY
      </button>
    </div>
  );
}
