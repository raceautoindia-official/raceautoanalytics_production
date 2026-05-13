"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, ArrowRight, Info } from "lucide-react";
import { LineChart } from "@/components/charts/LineChart";
import {
  checkByfAvailability,
  type ByfAvailability,
  type ByfSegmentKey,
} from "@/lib/byfSegments";

type ConfigShape = {
  pv?: number | null;
  cv?: number | null;
  tw?: number | null;
  threew?: number | null;
  tractor?: number | null;
  truck?: number | null;
  bus?: number | null;
  ce?: number | null;
};

type SegmentOption = {
  configKey: keyof ConfigShape;
  category: string;
  label: string;
  base: number;
  amp: number;
  phase: number;
};

// `base`/`amp`/`phase` drive a deterministic sinusoidal dummy series so
// hovering the line never leaks a real production value. Values look
// segment-plausible (rough order of magnitude) without being accurate.
const SEGMENTS: SegmentOption[] = [
  { configKey: "pv", category: "PV", label: "Passenger Vehicles", base: 320000, amp: 60000, phase: 0.2 },
  { configKey: "cv", category: "CV", label: "Commercial Vehicles", base: 75000, amp: 12000, phase: 0.8 },
  { configKey: "tw", category: "2W", label: "Two-Wheeler", base: 1400000, amp: 220000, phase: 1.4 },
  { configKey: "threew", category: "3W", label: "Three-Wheeler", base: 70000, amp: 14000, phase: 2.0 },
  { configKey: "tractor", category: "TRAC", label: "AG Tractor", base: 65000, amp: 18000, phase: 2.6 },
  { configKey: "truck", category: "Truck", label: "Trucks", base: 45000, amp: 8000, phase: 3.2 },
  { configKey: "bus", category: "Bus", label: "Buses", base: 9000, amp: 2200, phase: 3.8 },
  { configKey: "ce", category: "CE", label: "Construction Equipment", base: 8500, amp: 1800, phase: 4.4 },
];

// Country list mirrors MarketHeroSection's catalogue. Kept inline to avoid
// coupling the two files; entries are static.
const COUNTRIES: Array<{ slug: string; label: string }> = [
  { slug: "india", label: "India" },
  { slug: "brazil", label: "Brazil" },
  { slug: "south-africa", label: "South Africa" },
  { slug: "japan", label: "Japan" },
  { slug: "sweden", label: "Sweden" },
  { slug: "vietnam", label: "Vietnam" },
  { slug: "chile", label: "Chile" },
  { slug: "pakistan", label: "Pakistan" },
  { slug: "colombia", label: "Colombia" },
  { slug: "australia", label: "Australia" },
  { slug: "germany", label: "Germany" },
  { slug: "peru", label: "Peru" },
  { slug: "russia", label: "Russia" },
  { slug: "belgium", label: "Belgium" },
];

const COUNTRY_SLUGS = new Set(COUNTRIES.map((c) => c.slug));

const MONTHS_COUNT = 10;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildDummyMonths(): string[] {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-based; previous month relative to current
  if (month === 0) {
    year -= 1;
    month = 12;
  }
  const out: string[] = [];
  for (let i = MONTHS_COUNT - 1; i >= 0; i--) {
    let y = year;
    let m = month - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    out.push(`${y}-${pad2(m)}`);
  }
  return out;
}

function buildDummyData() {
  const months = buildDummyMonths();
  return months.map((monthStr, idx) => {
    const data: Record<string, number> = {};
    for (const seg of SEGMENTS) {
      const t = (idx / MONTHS_COUNT) * Math.PI * 2 + seg.phase;
      const wobble = Math.sin(idx * 1.7 + seg.phase * 3) * 0.08 * seg.amp;
      data[seg.category] = Math.max(
        0,
        Math.round(seg.base + Math.sin(t) * seg.amp + wobble),
      );
    }
    return { month: monthStr, data };
  });
}

export default function BYFSubmitCards() {
  const searchParams = useSearchParams();

  // Per-(country, segment) availability cache. Key = `<country>|<segment>`.
  // Holds the result of checkByfAvailability so we don't re-fetch when the
  // user toggles back to a previously checked combo.
  const [availabilityByKey, setAvailabilityByKey] = useState<
    Record<string, ByfAvailability>
  >({});
  const [checkingKey, setCheckingKey] = useState<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<keyof ConfigShape>("cv");
  const [selectedCountry, setSelectedCountry] = useState<string>("india");
  const [showAbout, setShowAbout] = useState(false);

  // Deep-link preselect: ?byfCountry=brazil sets the dropdown on mount.
  useEffect(() => {
    const param = (searchParams?.get("byfCountry") || "").toLowerCase().trim();
    if (param && COUNTRY_SLUGS.has(param)) {
      setSelectedCountry(param);
    }
    // Run once on mount; subsequent dropdown changes are user-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate availability for the (country, segment) combo. Cached so
  // toggling back doesn't refetch. Strict — checks both that a graphId
  // exists for the chosen segment AND that questions exist for that
  // graph+country combo.
  const cacheKey = `${selectedCountry}|${String(selectedKey)}`;
  useEffect(() => {
    if (availabilityByKey[cacheKey] !== undefined) {
      if (checkingKey === cacheKey) setCheckingKey(null);
      return;
    }

    let cancelled = false;
    setCheckingKey(cacheKey);
    (async () => {
      const result = await checkByfAvailability(
        selectedCountry,
        selectedKey as ByfSegmentKey,
      );
      if (cancelled) return;
      setAvailabilityByKey((prev) => ({ ...prev, [cacheKey]: result }));
      setCheckingKey((prev) => (prev === cacheKey ? null : prev));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const selected = useMemo(
    () => SEGMENTS.find((s) => s.configKey === selectedKey) || SEGMENTS[0],
    [selectedKey],
  );

  // Dummy data — generated once, deterministic per segment.
  const dummyData = useMemo(() => buildDummyData(), []);
  const dummyBaseMonth = useMemo(() => {
    const months = dummyData.map((p) => p.month);
    return months[months.length - 1] || null;
  }, [dummyData]);

  const availability = availabilityByKey[cacheKey];
  const isChecking = checkingKey === cacheKey || availability === undefined;
  const isAvailable = availability?.status === "available";
  const selectedCountryLabel =
    COUNTRIES.find((c) => c.slug === selectedCountry)?.label || "India";

  const byfHref = useMemo(() => {
    if (!isAvailable) return null;
    const params = new URLSearchParams();
    params.set("graphId", String((availability as any).graphId));
    params.set("country", selectedCountry);
    params.set("returnTo", "/flash-reports/overview");
    return `/score-card?${params.toString()}`;
  }, [isAvailable, availability, selectedCountry]);

  const byfDisabled = !isAvailable;
  const byfButtonText = isChecking
    ? "Checking availability…"
    : isAvailable
      ? "Submit BYF Score"
      : `Coming soon for ${selected.label}`;

  return (
    <section id="byf" className="w-full bg-[#0b1218] text-white py-8 md:py-10">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .byf-teaser-chart .recharts-tooltip-wrapper { display: none !important; }
            .byf-teaser-chart .recharts-yAxis text { opacity: 0 !important; }
            .byf-teaser-chart > div > div:first-child > div:nth-child(2) { display: none !important; }
          `,
        }}
      />
      <div className="mx-auto w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none px-2 sm:px-3 lg:px-4">
        <div className="mb-4 flex flex-col items-start gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            <Sparkles className="h-3 w-3" />
            Build Your Forecast
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-50 md:text-5xl">
            Submit Your BYF Score
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Pick a country and segment, share your view — your personal forecast line appears after you subscribe.
          </p>

          <button
            type="button"
            onClick={() => setShowAbout((v) => !v)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/10"
            aria-expanded={showAbout}
          >
            <Info className="h-3 w-3" />
            {showAbout ? "Hide explanation" : "What is BYF?"}
          </button>

          {showAbout && (
            <div className="mt-1 max-w-3xl rounded-lg border border-white/10 bg-[#0F1A2B]/80 px-3 py-2.5 text-xs leading-relaxed text-slate-300">
              <strong className="text-slate-100">
                Build Your Forecast (BYF)
              </strong>{" "}
              lets you score the drivers and barriers shaping each segment for
              the chosen country. Your scores generate a personal BYF forecast
              line that compares against ML, AI, and expert forecasts on the
              segment chart — visible after you subscribe. One submission per
              segment per month per country; you can resubmit to replace a
              previous score.
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0F1A2B] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.85)]">
          <div className="flex flex-col gap-2 border-b border-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="byf-country-select"
                  className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Country
                </label>
                <div className="relative">
                  <select
                    id="byf-country-select"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="appearance-none rounded-md border border-white/10 bg-[#0B1220] py-1.5 pl-2.5 pr-7 text-xs font-semibold text-slate-100 shadow-sm focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                    ▾
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="byf-segment-select"
                  className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Segment
                </label>
                <div className="relative">
                  <select
                    id="byf-segment-select"
                    value={String(selectedKey)}
                    onChange={(e) =>
                      setSelectedKey(e.target.value as keyof ConfigShape)
                    }
                    className="appearance-none rounded-md border border-white/10 bg-[#0B1220] py-1.5 pl-2.5 pr-7 text-xs font-semibold text-slate-100 shadow-sm focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                  >
                    {SEGMENTS.map((s) => (
                      <option key={s.configKey} value={String(s.configKey)}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                    ▾
                  </span>
                </div>
              </div>
            </div>

            <span className="text-[10px] text-slate-500">
              Illustrative trend — submit your BYF score to see real forecasts.
            </span>
          </div>

          <div className="byf-teaser-chart px-3 py-2">
            <LineChart
              overallData={dummyData as any}
              category={selected.category}
              height={220}
              allowForecast={false}
              country={selectedCountry}
              baseMonth={dummyBaseMonth}
              horizon={6}
              graphId={null}
              showSubmitScore={false}
            />
          </div>

          <div className="flex flex-col items-center gap-2 border-t border-white/5 bg-[#0B1220]/60 px-3 py-2.5 sm:flex-row sm:justify-between">
            <div className="text-xs text-slate-300">
              Ready to share your view on{" "}
              <span className="font-semibold text-slate-50">
                {selected.label}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-slate-50">
                {selectedCountryLabel}
              </span>
              ?
            </div>

            {byfDisabled ? (
              <button
                type="button"
                disabled
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-slate-700/60 px-3 text-xs font-semibold text-slate-300/80 cursor-not-allowed"
                title={
                  isChecking
                    ? "Checking availability…"
                    : `BYF for ${selected.label} in ${selectedCountryLabel} is not yet available.`
                }
              >
                <Sparkles className="h-3.5 w-3.5" />
                {byfButtonText}
              </button>
            ) : (
              <Link href={byfHref!} prefetch={false}>
                <span className="group inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 text-xs font-semibold text-slate-900 shadow-[0_6px_16px_rgba(245,158,11,0.4)] ring-1 ring-amber-300 transition hover:bg-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {byfButtonText}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
