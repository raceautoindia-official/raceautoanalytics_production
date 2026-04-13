"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/components/providers/Providers";
import { useFlashEntitlementContext } from "@/app/flash-reports/context/FlashEntitlementContext";

type CountryOpt = { value: string; label: string; flag?: string };

interface RegionSelectorProps {
  className?: string;
  /**
   * When provided (Flash Reports subscribed-user mode), only countries in this
   * set are selectable. All others are shown as locked/disabled.
   * Pass `null` or `undefined` to keep the selector fully open (default behavior).
   */
  lockedToCountries?: string[] | null;
}

export function RegionSelector({ className, lockedToCountries: lockedProp }: RegionSelectorProps) {
  const { region, setRegion } = useAppContext();

  // Auto-inherit locking from FlashEntitlementContext when inside flash-reports.
  // Explicit prop takes precedence; context is used as fallback.
  // Admin override bypasses all country locking.
  const flashCtx = useFlashEntitlementContext();
  const isAdmin = flashCtx?.isAdmin ?? false;
  const lockedToCountries = isAdmin
    ? null
    : lockedProp !== undefined
    ? lockedProp
    : flashCtx?.lockedToCountries ?? null;
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
          {options.map((opt) => {
            const isLocked =
              lockedToCountries != null &&
              !lockedToCountries.includes(opt.value);
            return (
              <button
                key={opt.value}
                disabled={isLocked}
                title={
                  isLocked
                    ? "This country is not included in your current selected country slots."
                    : undefined
                }
                onClick={() => {
                  if (isLocked) return;
                  setRegion(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg focus-ring",
                  isLocked
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-accent cursor-pointer",
                  region === opt.value && "bg-primary/10 text-primary",
                )}
              >
                <span className="text-base">{opt.flag || "🌍"}</span>
                <span className="text-sm font-medium">{opt.label}</span>
                {isLocked && (
                  <span className="ml-auto text-xs opacity-60">🔒</span>
                )}
                {!isLocked && region === opt.value && (
                  <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}