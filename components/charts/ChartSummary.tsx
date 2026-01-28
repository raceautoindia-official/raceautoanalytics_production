'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartSummaryProps {
  summary: string;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}

export function ChartSummary({ summary, trend, className }: ChartSummaryProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'flat':
        return <Minus className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'mt-3 flex items-start gap-2 text-sm text-muted-foreground px-1',
        className
      )}
    >
      {trend && (
        <span className="mt-0.5 flex-shrink-0">{getTrendIcon()}</span>
      )}
      <p className="leading-relaxed">{summary}</p>
    </div>
  );
}
