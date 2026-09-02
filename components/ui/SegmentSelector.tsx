"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutGrid } from "lucide-react";
import { useAppContext } from "@/components/providers/Providers";
import { withCountry } from "@/lib/withCountry";

/**
 * Segment switcher, shown beside the country selector on the flash-report
 * pages.
 *
 * Only segments that actually have data for the SELECTED COUNTRY AND MONTH are
 * offered, using the same /api/flash-reports/segment-availability the hub cards
 * use — so a user cannot navigate into a dead page (Australia has no
 * two-wheeler data, for example, and simply will not list it).
 *
 * Commercial Vehicles carries a nested Trucks / Buses submenu. Those two are
 * not part of the availability map (they are nested routes), so their presence
 * is resolved separately against segment-countries.
 */

type SegmentDef = {
  /** Key in the availability response. */
  key: string;
  label: string;
  href: string;
  children?: { key: string; label: string; href: string }[];
};

const SEGMENTS: SegmentDef[] = [
  {
    key: "overall-automotive-industry",
    label: "Overall Industry",
    href: "/flash-reports/overall-automotive-industry",
  },
  {
    key: "passenger-vehicles",
    label: "Passenger Vehicles",
    href: "/flash-reports/passenger-vehicles",
  },
  {
    key: "commercial-vehicles",
    label: "Commercial Vehicles",
    href: "/flash-reports/commercial-vehicles",
    children: [
      {
        key: "commercial-vehicles/trucks",
        label: "Trucks",
        href: "/flash-reports/commercial-vehicles/trucks",
      },
      {
        key: "commercial-vehicles/buses",
        label: "Buses",
        href: "/flash-reports/commercial-vehicles/buses",
      },
    ],
  },
  { key: "two-wheeler", label: "Two-Wheeler", href: "/flash-reports/two-wheeler" },
  {
    key: "three-wheeler",
    label: "Three-Wheeler",
    href: "/flash-reports/three-wheeler",
  },
  { key: "tractor", label: "Tractor", href: "/flash-reports/tractor" },
  {
    key: "construction-equipment",
    label: "Construction Equipment",
    href: "/flash-reports/construction-equipment",
  },
];

export function SegmentSelector({ className = "" }: { className?: string }) {
  const { region, month } = useAppContext();
  const pathname = usePathname() || "";
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [openChild, setOpenChild] = useState<string | null>(null);
  // null = availability not resolved yet -> show everything rather than an
  // empty menu (fail open, same rule as the country selector).
  const [available, setAvailable] = useState<Set<string> | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const currentPath = pathname.replace(/^\/flash-reports\/?/, "").replace(/\/$/, "");

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setOpenChild(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!region || !month) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          withCountry(
            `/api/flash-reports/segment-availability?month=${encodeURIComponent(month)}`,
            region,
          ),
          { cache: "no-store" },
        );
        if (!res.ok) return; // leave open
        const json = await res.json();
        if (cancelled) return;

        const segs = json?.segments || {};
        const set = new Set<string>();
        for (const [k, v] of Object.entries<any>(segs)) {
          if (v?.isAvailable) set.add(k);
        }

        // Trucks / Buses are nested routes outside the availability map.
        if (set.has("commercial-vehicles")) {
          await Promise.all(
            ["commercial-vehicles/trucks", "commercial-vehicles/buses"].map(
              async (seg) => {
                try {
                  const r = await fetch(
                    `/api/flash-reports/segment-countries?segment=${encodeURIComponent(seg)}`,
                  );
                  if (!r.ok) return;
                  const j = await r.json();
                  // countries:null is the API's fail-open signal.
                  if (!Array.isArray(j?.countries) || j.countries.includes(region)) {
                    set.add(seg);
                  }
                } catch {
                  set.add(seg); // fail open
                }
              },
            ),
          );
        }

        if (!cancelled) setAvailable(set);
      } catch {
        // leave open
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [region, month]);

  const isAvail = (key: string) => !available || available.has(key);

  const visible = useMemo(
    () =>
      SEGMENTS.filter((s) => isAvail(s.key)).map((s) => ({
        ...s,
        children: s.children?.filter((c) => isAvail(c.key)),
      })),
    [available],
  );

  const currentLabel = useMemo(() => {
    for (const s of SEGMENTS) {
      if (s.key === currentPath) return s.label;
      const kid = s.children?.find((c) => c.key === currentPath);
      if (kid) return kid.label;
    }
    return "Segments";
  }, [currentPath]);

  // Preserve the country/month the user is looking at.
  const go = (href: string) => {
    const qs = new URLSearchParams();
    if (region) qs.set("country", region);
    if (month) qs.set("month", month);
    const q = qs.toString();
    setIsOpen(false);
    setOpenChild(null);
    router.push(q ? `${href}?${q}` : href);
  };

  if (!visible.length) return null;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center space-x-2 px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors duration-200 focus-ring min-w-32"
        aria-label="Select segment"
        aria-expanded={isOpen}
      >
        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{currentLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {visible.map((s) => {
              const active = s.key === currentPath;
              const hasKids = !!s.children?.length;
              const expanded = openChild === s.key;

              return (
                <div key={s.key}>
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => go(s.href)}
                      className={`flex-1 px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "bg-accent font-semibold text-foreground"
                          : "text-foreground/85 hover:bg-accent"
                      }`}
                    >
                      {s.label}
                    </button>
                    {hasKids && (
                      <button
                        type="button"
                        aria-label={`Show ${s.label} sub-segments`}
                        aria-expanded={expanded}
                        onClick={() => setOpenChild(expanded ? null : s.key)}
                        className="px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {hasKids && expanded && (
                    <div className="border-l border-border/60 pl-2 ml-3">
                      {s.children!.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => go(c.href)}
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                            c.key === currentPath
                              ? "bg-accent font-semibold text-foreground"
                              : "text-foreground/75 hover:bg-accent"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SegmentSelector;
