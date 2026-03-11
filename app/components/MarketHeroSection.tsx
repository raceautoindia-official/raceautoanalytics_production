"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

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
}: {
  country: CountryItem | null;
  onClose: () => void;
}) {
  const targetMonth = getPreviousMonthYyyyMm();
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (country) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [country, onClose]);

  if (!country) return null;

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
            {/* <span className="text-white/60">Release schedule:</span>{" "} */}
           <Link
  href={`/flash-reports?country=${encodeURIComponent(
    country.slug,
  )}&month=${encodeURIComponent(targetMonth)}`}
>
  <span className="text-sm font-medium text-blue-300 underline underline-offset-4 hover:text-blue-200">
    Click to view full dataset
  </span>
</Link>
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
  ],
  []
);

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
                <PillButton href="/flash-reports">
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
      />
    </>
  );
}