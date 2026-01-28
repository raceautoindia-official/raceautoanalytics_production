'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartWrapperProps {
  children: ReactNode;
  title: string;
  summary?: string;
  className?: string;
  controls?: ReactNode;
  /**
   * Optional: max number of lines for summary text.
   * Helps prevent huge paragraphs on mobile.
   */
  summaryMaxLines?: number;
}

export function ChartWrapper({
  children,
  title,
  summary,
  className,
  controls,
  summaryMaxLines = 3,
}: ChartWrapperProps) {
  return (
    <div className={cn('chart-container animate-fade-in', className)}>
      {/* Header (title + summary + controls) */}
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Title + summary */}
        <div className="flex-1 min-w-0">
          <h3 className="mb-0.5 truncate text-base font-semibold sm:text-lg">
            {title}
          </h3>

          {summary && (
            <p
              className="text-xs leading-relaxed text-muted-foreground sm:text-sm"
              style={
                summaryMaxLines
                  ? {
                      display: '-webkit-box',
                      // WebkitLineClamp: summaryMaxLines,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }
                  : undefined
              }
            >
              {summary}
            </p>
          )}
        </div>

        {/* Controls (CompareToggle, MonthSelector, etc.) */}
        {controls && (
          <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:flex-nowrap sm:justify-end">
            {controls}
          </div>
        )}
      </div>

      {/* Chart content */}
      <div className="relative">{children}</div>
    </div>
  );
}
