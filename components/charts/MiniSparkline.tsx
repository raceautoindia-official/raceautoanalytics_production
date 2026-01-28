'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  data: Array<{ value: number }>;
  color?: string;
  height?: number;
  className?: string;
  showGradient?: boolean;
}

export function MiniSparkline({
  data,
  color = '#007AFF',
  height = 48,
  className,
  showGradient = true
}: MiniSparklineProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            fill={showGradient ? `url(#sparkline-gradient-${color})` : 'none'}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
