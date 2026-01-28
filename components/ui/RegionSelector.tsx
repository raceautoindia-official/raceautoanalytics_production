'use client';

import { useState, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/components/providers/Providers';

const REGIONS = [
  { value: 'india', label: 'India', flag: '🇮🇳', disabled: false },
  { value: 'apac', label: 'APAC', flag: '🌏', disabled: true },
  { value: 'emea', label: 'EMEA', flag: '🌍', disabled: true },
  { value: 'americas', label: 'Americas', flag: '🌎', disabled: true },
  { value: 'global', label: 'Global', flag: '🌐', disabled: true },
];

interface RegionSelectorProps {
  className?: string;
}

export function RegionSelector({ className }: RegionSelectorProps) {
  const { region, setRegion } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  // Hard-lock region to India for now
  useEffect(() => {
    if (region !== 'india') {
      setRegion('india');
    }
  }, [region, setRegion]);

  const currentRegion =
    REGIONS.find((r) => r.value === region) ||
    REGIONS.find((r) => r.value === 'india')!;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors duration-200 focus-ring min-w-32"
        aria-label="Select region"
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {currentRegion.flag} {currentRegion.label}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 animate-fade-in">
          {REGIONS.map((regionOption) => (
            <button
              key={regionOption.value}
              disabled={regionOption.disabled}
              onClick={() => {
                if (regionOption.disabled) return; // ignore clicks
                setRegion(regionOption.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg focus-ring',
                regionOption.disabled
                  ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                  : 'hover:bg-accent',
                region === regionOption.value && !regionOption.disabled && 'bg-primary/10 text-primary',
              )}
            >
              <span className="text-base">{regionOption.flag}</span>
              <span className="text-sm font-medium">{regionOption.label}</span>
              {region === regionOption.value && !regionOption.disabled && (
                <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
              )}
              {/* {regionOption.disabled && (
                <span className="ml-auto text-[10px] uppercase tracking-wide">
                  Coming soon
                </span>
              )} */}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
