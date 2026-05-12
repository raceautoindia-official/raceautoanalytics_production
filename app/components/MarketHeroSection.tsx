"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import CountryAccessInfoModal from "@/app/components/CountryAccessInfoModal";
import { resolveCountryCardAction } from "@/app/components/countryCardAccess";
import {
  BYF_SEGMENTS,
  checkByfAvailability,
  type ByfAvailability,
  type ByfSegmentKey,
} from "@/lib/byfSegments";

/* small UI helpers */
const Badge = ({ children }: React.PropsWithChildren) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/70">
    {children}
  </span>
);

const PillButton = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
  >
    {children}
    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
  </a>
);

function GlassCard({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={
        "rounded-2xl bg-white/5 p-5 md:p-6 lg:p-7 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl " +
        className
      }
    >
      {children}
    </div>
  );
}

/** Flag CDN helper */
function flagUrl(code: string, size: 40 | 80 = 40) {
  return `https://flagcdn.com/w${size}/${code}.png`;
}

function FlagIcon({
  code,
  alt,
  size = "sm",
}: {
  code: string;
  alt: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "h-7 w-10" : "h-5 w-7";
  return (
    <img
      src={flagUrl(code, size === "md" ? 80 : 40)}
      srcSet={`${flagUrl(code, 40)} 1x, ${flagUrl(code, 80)} 2x`}
      alt={alt}
      loading="lazy"
      className={`${dim} rounded-md shadow-sm ring-1 ring-white/20`}
    />
  );
}

function getPreviousMonthYyyyMm() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const COUNTRY_NOT_INCLUDED_TITLE = "Country Not Included";
const COUNTRY_NOT_INCLUDED_MESSAGE =
  "This country is not included in your selected plan slots. Contact sales to add more countries.";

type CountryItem = {
  name: string;
  code: string; // ISO-2 lowercase
  slug: string;
  scheduleLabel: string; // only shown in modal
  description: string; // only shown in modal
};

function CountryModal({
  country,
  onClose,
  onOpenDataset,
  openingDataset,
}: {
  country: CountryItem | null;
  onClose: () => void;
  onOpenDataset: (country: CountryItem) => void;
  openingDataset: boolean;
}) {
  // Local segment selection — defaults to Commercial Vehicles (most likely
  // to have BYF questions). Reset whenever the modal reopens for a
  // different country so prior selection doesn't carry over.
  const [byfSegmentKey, setByfSegmentKey] = useState<ByfSegmentKey>("cv");
  useEffect(() => {
    if (country) setByfSegmentKey("cv");
  }, [country?.slug]);

  // Per-(country, segment) availability cache. Strict — checks that both a
  // graphId is configured AND that scoring questions exist for that
  // graph+country combo. Cached so toggling back doesn't refetch.
  const [availabilityByKey, setAvailabilityByKey] = useState<
    Record<string, ByfAvailability>
  >({});
  const [checkingKey, setCheckingKey] = useState<string | null>(null);
  const cacheKey = country ? `${country.slug}|${byfSegmentKey}` : "";

  useEffect(() => {
    if (!country) return;
    if (availabilityByKey[cacheKey] !== undefined) {
      if (checkingKey === cacheKey) setCheckingKey(null);
      return;
    }
    let cancelled = false;
    setCheckingKey(cacheKey);
    (async () => {
      const result = await checkByfAvailability(country.slug, byfSegmentKey);
      if (cancelled) return;
      setAvailabilityByKey((prev) => ({ ...prev, [cacheKey]: result }));
      setCheckingKey((prev) => (prev === cacheKey ? null : prev));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (country) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [country, onClose]);

  if (!country) return null;

  const availability = availabilityByKey[cacheKey];
  const isChecking = checkingKey === cacheKey || availability === undefined;
  const isAvailable = availability?.status === "available";
  const segmentLabel =
    BYF_SEGMENTS.find((s) => s.configKey === byfSegmentKey)?.label || "";

  function handleByfClick() {
    if (!isAvailable || availability?.status !== "available") return;
    const params = new URLSearchParams();
    params.set("graphId", String(availability.graphId));
    params.set("country", country.slug);
    params.set("returnTo", "/flash-reports/overview");
    window.location.href = `/score-card?${params.toString()}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/10"
        style={{ maxWidth: "min(28rem, 92vw)" }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.35),transparent_60%)] blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-12 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.32),transparent_60%)] blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <FlagIcon code={country.code} alt={country.name} size="md" />
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/90">
              {country.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Close
          </button>
        </div>

        {/* ✅ Modal only details */}
        <div className="relative mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-white/75">
            {country.description}
          </p>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            <button
              type="button"
              onClick={() => onOpenDataset(country)}
              disabled={openingDataset}
              className="text-sm font-medium text-blue-300 underline underline-offset-4 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {openingDataset ? "Opening..." : "Click to view full dataset"}
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor={`byf-segment-${country.slug}`}
                className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/80"
              >
                Segment
              </label>
              <div className="relative flex-1">
                <select
                  id={`byf-segment-${country.slug}`}
                  value={byfSegmentKey}
                  onChange={(e) =>
                    setByfSegmentKey(e.target.value as ByfSegmentKey)
                  }
                  className="w-full appearance-none rounded-md border border-white/10 bg-slate-950/70 py-1.5 pl-2.5 pr-7 text-xs font-semibold text-white shadow-sm focus:border-amber-400/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                >
                  {BYF_SEGMENTS.map((s) => (
                    <option key={s.configKey} value={s.configKey}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/50">
                  ▾
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleByfClick}
              disabled={!isAvailable}
              className={
                isAvailable
                  ? "group inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 text-xs font-semibold text-slate-900 shadow-[0_6px_16px_rgba(245,158,11,0.4)] ring-1 ring-amber-300 transition hover:bg-amber-300"
                  : "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-slate-700/60 px-3 text-xs font-semibold text-slate-300/80 cursor-not-allowed"
              }
              aria-label={
                isAvailable
                  ? `Submit BYF Score for ${country.name}`
                  : `BYF for ${segmentLabel} in ${country.name} not available yet`
              }
              title={
                isChecking
                  ? "Checking availability…"
                  : isAvailable
                    ? `Submit BYF Score for ${country.name}`
                    : `BYF for ${segmentLabel} in ${country.name} is not yet available.`
              }
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isChecking
                ? "Checking availability…"
                : isAvailable
                  ? `Submit BYF Score for ${country.name}`
                  : `Coming soon for ${segmentLabel}`}
            </button>

            <p className="text-[11px] text-white/55">
              Build Your Forecast lets you score this market’s drivers and
              barriers — your personal forecast appears on the chart after you
              subscribe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ✅ chip shows ONLY flag + name (no dates outside) */
function CountryChip({
  c,
  onClick,
}: {
  c: CountryItem;
  onClick: (c: CountryItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(c)}
      className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left shadow-sm transition hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/20"
    >
      <FlagIcon code={c.code} alt={c.name} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white/90 truncate">
          {c.name}
        </div>
      </div>
    </button>
  );
}

export default function MarketHeroSection() {
  const [activeCountry, setActiveCountry] = useState<CountryItem | null>(null);
  const [openingDataset, setOpeningDataset] = useState(false);
  const [countryAccessNoticeOpen, setCountryAccessNoticeOpen] = useState(false);

const countries = useMemo<CountryItem[]>(
  () => [
    {
      name: "India",
      code: "in",
      slug: "india",
      scheduleLabel: "Every month on 3rd",
      description:
        "India flash report includes total market sales, EV sales, and application split. This will be launched every month on the 3rd.",
    },
    {
      name: "Brazil",
      code: "br",
      slug: "brazil",
      scheduleLabel: "Every month on 5th",
      description:
        "Brazil flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "South Africa",
      code: "za",
      slug: "south-africa",
      scheduleLabel: "Every month on 6th",
      description:
        "South Africa flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Japan",
      code: "jp",
      slug: "japan",
      scheduleLabel: "Every month on 7th",
      description:
        "Japan flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Sweden",
      code: "se",
      slug: "sweden",
      scheduleLabel: "Every month on 8th",
      description:
        "Sweden flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Vietnam",
      code: "vn",
      slug: "vietnam",
      scheduleLabel: "Every month on 9th",
      description:
        "Vietnam flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Chile",
      code: "cl",
      slug: "chile",
      scheduleLabel: "Every month on 10th",
      description:
        "Chile flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Pakistan",
      code: "pk",
      slug: "pakistan",
      scheduleLabel: "Every month on 11th",
      description:
        "Pakistan flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Colombia",
      code: "co",
      slug: "colombia",
      scheduleLabel: "Every month on 12th",
      description:
        "Colombia flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Australia",
      code: "au",
      slug: "australia",
      scheduleLabel: "Every month on 13th",
      description:
        "Australia flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Germany",
      code: "de",
      slug: "germany",
      scheduleLabel: "Every month on 14th",
      description:
        "Germany flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Peru",
      code: "pe",
      slug: "peru",
      scheduleLabel: "Every month on 15th",
      description:
        "Peru flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Russia",
      code: "ru",
      slug: "russia",
      scheduleLabel: "Every month on 16th",
      description:
        "Russia flash report includes total market sales, EV sales, and application split.",
    },
    {
      name: "Belgium",
      code: "be",
      slug: "belgium",
      scheduleLabel: "Every month on 17th",
      description:
        "Belgium flash report includes total market sales, EV sales, and application split.",
    },
  ],
  []
);

  async function handleOpenDataset(country: CountryItem) {
    const targetMonth = getPreviousMonthYyyyMm();

    try {
      setOpeningDataset(true);
      const action = await resolveCountryCardAction(country.slug, targetMonth);

      if (action.type === "auth") {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("forceRouteAuthGate", "1");
        }
        window.location.href = action.href;
        return;
      }

      if (action.type === "subscribe") {
        // Previously this only popped a local FlashSubscriptionGate overlay
        // on the overview page and never navigated, leaving the user stuck on
        // overview after dismissing the gate. Now we navigate to the country's
        // flash-reports URL — the destination's FlashSubscriptionManager fires
        // the gate at step 2 (the sessionStorage flag below makes it
        // mandatory immediately), so the user actually lands on the right
        // page with the gate up.
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "flashReportsSubscriptionModalStep",
            "2",
          );
        }
        setActiveCountry(null);
        window.location.href = `/flash-reports?country=${encodeURIComponent(
          country.slug,
        )}&month=${encodeURIComponent(targetMonth)}`;
        return;
      }

      if (action.type === "notIncluded") {
        setActiveCountry(null);
        setCountryAccessNoticeOpen(true);
        return;
      }

      window.location.href = action.href;
    } catch {
      window.location.href = `/flash-reports?country=${encodeURIComponent(
        country.slug,
      )}&month=${encodeURIComponent(targetMonth)}`;
    } finally {
      setOpeningDataset(false);
    }
  }

  // BYF launch is now self-contained inside CountryModal — it pre-validates
  // (graphId + questions exist for the picked country/segment combo) and
  // navigates directly using the validated graphId. No parent handler needed.

  return (
    <>
      <main className="relative min-h-[60svh] overflow-hidden bg-slate-950 text-white mb-6">
        {/* background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950" />
          <div className="absolute left-1/3 top-1/4 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(29,78,216,0.25),transparent_60%)] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'128\\' height=\\'128\\' viewBox=\\'0 0 8 8\\'><path fill=\\'%23fff\\' fill-opacity=\\'0.6\\' d=\\'M0 0h1v1H0zM4 4h1v1H4z\\'/></svg>')",
            }}
          />
        </div>

        {/* hero */}
        <section className="relative">
          <div className="mx-auto grid w-[95vw] xl:w-[93vw] 2xl:w-[90vw] max-w-none grid-cols-1 items-start gap-10 px-2 sm:px-3 lg:px-4 py-12 md:grid-cols-2 md:py-16 lg:gap-14 lg:py-20">
            {/* left copy */}
            <div className="relative z-10">
              <Badge>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="opacity-80"
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    d="M12 2L2 7l10 5l10-5zM2 17l10 5l10-5"
                  />
                </svg>
                AI-Powered Analytics
              </Badge>

              <h2 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
                <span className="block text-white">Flash Reports for</span>
                <span className="mt-2 block bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  Automotive Markets
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
                Monthly insights on vehicle sales across six categories with
                AI-powered forecasting. Track OEM performance, market trends,
                and electric vehicle adoption across global regions.
              </p>

              {/* ✅ Only one button */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <PillButton href="/flash-reports?country=india">
                  <span>Explore full dataset</span>
                </PillButton>
              </div>

            </div>

            {/* right: countries (3 per row) */}
            <div className="relative">
              <GlassCard className="relative z-10 w-full">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white/90">
                      Countries
                    </h3>
                    <p className="mt-1 text-sm text-white/60">
                      Tap a country to view flash report scope and release schedule.
                    </p>
                  </div>
                </div>

                {/* ✅ 3 per row on md+ */}
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {countries.map((c) => (
                    <CountryChip key={c.name} c={c} onClick={setActiveCountry} />
                  ))}
                </div>
              </GlassCard>

              <div className="absolute -inset-3 -z-10 rounded-3xl bg-[radial-gradient(60%_50%_at_70%_30%,rgba(37,99,235,0.25),transparent)] blur-2xl" />
            </div>
          </div>
        </section>

      </main>

      <CountryModal
        country={activeCountry}
        onClose={() => setActiveCountry(null)}
        onOpenDataset={handleOpenDataset}
        openingDataset={openingDataset}
      />
      <CountryAccessInfoModal
        open={countryAccessNoticeOpen}
        title={COUNTRY_NOT_INCLUDED_TITLE}
        message={COUNTRY_NOT_INCLUDED_MESSAGE}
        onClose={() => setCountryAccessNoticeOpen(false)}
      />
    </>
  );
}
