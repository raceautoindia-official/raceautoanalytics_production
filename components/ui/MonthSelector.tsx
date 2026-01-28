'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/components/providers/Providers';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface MonthSelectorProps {
  className?: string;
  value?: string;
  onChange?: (month: string) => void;
  label?: string;
}

export function MonthSelector({
  className,
  value,
  onChange,
  label = 'Month',
}: MonthSelectorProps) {
  const { month: globalMonth, setMonth: setGlobalMonth } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const currentMonth = value || globalMonth;
  const setCurrentMonth = onChange || setGlobalMonth;

  const [year, monthNum] = currentMonth.split('-');
  const monthIndex = parseInt(monthNum, 10) - 1;
  const monthName = MONTHS[monthIndex] ?? '';

  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentYear = parseInt(year, 10);
    const currentMonthIndex = monthIndex;

    let newYear = currentYear;
    let newMonthIndex = currentMonthIndex;

    if (direction === 'prev') {
      newMonthIndex--;
      if (newMonthIndex < 0) {
        newMonthIndex = 11;
        newYear--;
      }
    } else {
      newMonthIndex++;
      if (newMonthIndex > 11) {
        newMonthIndex = 0;
        newYear++;
      }
    }

    const newMonth = `${newYear}-${String(newMonthIndex + 1).padStart(
      2,
      '0'
    )}`;
    setCurrentMonth(newMonth);
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[9rem] items-center space-x-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left text-xs font-medium hover:bg-accent transition-colors duration-200 focus-ring sm:min-w-40 sm:px-3 sm:py-2 sm:text-sm"
        aria-label={`Select ${label.toLowerCase()}`}
        aria-expanded={isOpen}
      >
        <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">
          {monthName} {year}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg animate-fade-in sm:w-64">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="rounded p-1 hover:bg-accent focus-ring"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {monthName} {year}
            </span>
            <button
              onClick={() => navigateMonth('next')}
              className="rounded p-1 hover:bg-accent focus-ring"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Month Selection */}
          <div className="grid grid-cols-3 gap-1 p-2">
            {MONTHS.map((month, index) => (
              <button
                key={month}
                onClick={() => {
                  const newMonth = `${year}-${String(index + 1).padStart(
                    2,
                    '0'
                  )}`;
                  setCurrentMonth(newMonth);
                  setIsOpen(false);
                }}
                className={cn(
                  'px-2 py-1 text-[11px] rounded transition-colors duration-200 hover:bg-accent focus-ring sm:text-xs',
                  index === monthIndex && 'bg-primary text-primary-foreground'
                )}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
