"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/components/providers/Providers";

type CountryOpt = { value: string; label: string; flag?: string };

interface RegionSelectorProps {
  className?: string;
}

export function RegionSelector({ className }: RegionSelectorProps) {
  const { region, setRegion } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CountryOpt[]>([
    { value: "india", label: "India", flag: "🇮🇳" },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flash-reports/countries", {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (Array.isArray(json) && json.length) setOptions(json);
      } catch {
        // keep fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(() => {
    return (
      options.find((o) => o.value === region) ||
      options.find((o) => o.value === "india") || { value: "india", label: "India", flag: "🇮🇳" }
    );
  }, [options, region]);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors duration-200 focus-ring min-w-32"
        aria-label="Select country"
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {(current.flag || "🌍")} {current.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50 animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setRegion(opt.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg focus-ring hover:bg-accent",
                region === opt.value && "bg-primary/10 text-primary",
              )}
            >
              <span className="text-base">{opt.flag || "🌍"}</span>
              <span className="text-sm font-medium">{opt.label}</span>
              {region === opt.value && <div className="ml-auto w-2 h-2 bg-primary rounded-full" />}
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