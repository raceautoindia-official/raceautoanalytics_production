"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/components/providers/Providers";
import { useFlashEntitlementContext } from "@/app/flash-reports/context/FlashEntitlementContext";
import { FLASH_REGIONS } from "@/lib/flashReportRegistry";
import { CountryFlag } from "@/components/ui/CountryFlag";

type CountryOpt = {
  value: string;
  label: string;
  flag?: string;
  // additive metadata from /api/flash-reports/countries (optional/back-compat)
  iso2?: string | null;
  region?: string | null;
  regionLabel?: string | null;
};

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
  const { pendingRegion, setRegion } = useAppContext();
  // Use pendingRegion (user's latest pick) for the displayed selection so the
  // dropdown reflects the click instantly, even while the new country's data
  // is still resolving in the provider.
  const region = pendingRegion;

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
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CountryOpt[]>([
    { value: "india", label: "India", flag: "🇮🇳", iso2: "IN" },
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

  // Reset the search box whenever the dropdown closes.
  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  // Countries that actually have data for THIS segment.
  //
  // Every country node in the CMS is created with the full set of segment
  // children, so a country appearing in /api/flash-reports/countries does not
  // mean the segment you are looking at has data for it. Switching to such a
  // country used to leave the page reading "0 units" with every metric dashed
  // out. Those countries are simply not offered here.
  //
  // null = unknown/not applicable (hub pages, or the lookup failed) -> show all.
  const [segmentCountries, setSegmentCountries] = useState<string[] | null>(
    null,
  );

  useEffect(() => {
    // Derive the segment from the route, so segment pages need no changes.
    const m =
      typeof window !== "undefined"
        ? window.location.pathname.match(/^\/flash-reports\/(.+?)\/?$/)
        : null;
    const segment = m?.[1];
    if (!segment) {
      setSegmentCountries(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/flash-reports/segment-countries?segment=${encodeURIComponent(
            segment,
          )}`,
        );
        if (!res.ok) return; // unknown segment -> leave selector open
        const json = await res.json();
        if (cancelled) return;
        // `countries: null` is the API's fail-open signal.
        if (Array.isArray(json?.countries)) setSegmentCountries(json.countries);
      } catch {
        // leave the selector fully open rather than hiding everything
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(() => {
    return (
      options.find((o) => o.value === region) ||
      options.find((o) => o.value === "india") || { value: "india", label: "India", flag: "🇮🇳", iso2: "IN" }
    );
  }, [options, region]);

  // Drop countries with no data for this segment before anything else, so they
  // never appear in the list or the search results.
  const selectable = useMemo(() => {
    if (!segmentCountries) return options;
    const allowed = new Set(segmentCountries);
    // Never strip the country currently being viewed — that would leave the
    // trigger label pointing at an option the list no longer contains.
    const kept = options.filter(
      (o) => allowed.has(o.value) || o.value === region,
    );
    return kept.length ? kept : options;
  }, [options, segmentCountries, region]);

  // Filter by search, then group by region (registry order), "Other" last.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? selectable.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            o.value.toLowerCase().includes(q),
        )
      : selectable;

    const byRegion = new Map<string, CountryOpt[]>();
    for (const o of filtered) {
      const key = o.region || "other";
      const bucket = byRegion.get(key);
      if (bucket) bucket.push(o);
      else byRegion.set(key, [o]);
    }

    const ordered: { key: string; label: string; items: CountryOpt[] }[] = [];
    for (const r of FLASH_REGIONS) {
      const items = byRegion.get(r.key);
      if (items && items.length) ordered.push({ key: r.key, label: r.label, items });
    }
    const other = byRegion.get("other");
    if (other && other.length) ordered.push({ key: "other", label: "Other", items: other });
    return ordered;
  }, [selectable, query]);

  // Only show region headers once there is more than one group to organize.
  const showHeaders = groups.length > 1;
  const showSearch = selectable.length > 8;

  const renderOption = (opt: CountryOpt) => {
    const isLocked =
      lockedToCountries != null && !lockedToCountries.includes(opt.value);
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
          "w-full flex items-center space-x-3 px-3 py-2 text-left transition-colors duration-200 focus-ring",
          isLocked
            ? "opacity-40 cursor-not-allowed"
            : "hover:bg-accent cursor-pointer",
          region === opt.value && "bg-primary/10 text-primary",
        )}
      >
        <CountryFlag iso2={opt.iso2} name={opt.label} />
        <span className="text-sm font-medium">{opt.label}</span>
        {isLocked && <span className="ml-auto text-xs opacity-60">🔒</span>}
        {!isLocked && region === opt.value && (
          <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
        )}
      </button>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors duration-200 focus-ring min-w-32"
        aria-label="Select country"
        aria-expanded={isOpen}
      >
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center gap-2 text-sm font-medium">
          <CountryFlag
            iso2={current.iso2}
            name={current.label}
            className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
          />
          {current.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 animate-fade-in overflow-hidden">
          {showSearch && (
            <div className="sticky top-0 bg-popover border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search countries…"
                  className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {groups.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No countries found
              </div>
            )}
            {groups.map((g) => (
              <div key={g.key}>
                {showHeaders && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {g.label}
                  </div>
                )}
                {g.items.map(renderOption)}
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
