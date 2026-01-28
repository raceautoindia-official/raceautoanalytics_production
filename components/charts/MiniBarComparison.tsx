'use client';

import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface MiniBarComparisonProps {
  current: number;
  previous: number;
  color?: string;
  height?: number;
  className?: string;
}

export function MiniBarComparison({
  current,
  previous,
  color = '#007AFF',
  height = 32,
  className
}: MiniBarComparisonProps) {
  const maxValue = Math.max(current, previous);
  const data = [
    { name: 'Previous', value: previous, percentage: (previous / maxValue) * 100 },
    { name: 'Current', value: current, percentage: (current / maxValue) * 100 }
  ];

  const percentChange = ((current - previous) / previous * 100).toFixed(1);
  const isPositive = current >= previous;

  return (
    <div className={cn('w-full space-y-1', className)}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`bar-gradient-${color}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.6} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
            </defs>
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={600}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 1 ? `url(#bar-gradient-${color})` : 'hsl(var(--muted))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">vs Previous</span>
        <span className={cn('font-medium', isPositive ? 'text-success' : 'text-destructive')}>
          {isPositive ? '+' : ''}{percentChange}%
        </span>
      </div>
    </div>
  );
}
