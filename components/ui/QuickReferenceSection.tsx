"use client";

import React from "react";

type Chip = {
  abbr: string;
  full: string;
  border: string;
  bg: string;
  text: string;
};

const VEHICLE_SEGMENTS: Chip[] = [
  { abbr: "2W",   full: "Two Wheeler",            border: "border-sky-500/30",      bg: "bg-sky-500/[0.12]",      text: "text-sky-300"     },
  { abbr: "3W",   full: "Three Wheeler",           border: "border-violet-500/30",   bg: "bg-violet-500/[0.12]",   text: "text-violet-300"  },
  { abbr: "PV",   full: "Passenger Vehicle",       border: "border-emerald-500/30",  bg: "bg-emerald-500/[0.12]",  text: "text-emerald-300" },
  { abbr: "CV",   full: "Commercial Vehicle",      border: "border-amber-500/30",    bg: "bg-amber-500/[0.12]",    text: "text-amber-300"   },
  { abbr: "CE",   full: "Construction Equipment",  border: "border-rose-500/30",     bg: "bg-rose-500/[0.12]",     text: "text-rose-300"    },
  { abbr: "Trac", full: "Tractor",                 border: "border-orange-500/30",   bg: "bg-orange-500/[0.12]",   text: "text-orange-300"  },
];

const FORECAST_METHODS: Chip[] = [
  { abbr: "AI",        full: "Artificial Intelligence",    border: "border-purple-500/30",  bg: "bg-purple-500/[0.12]",  text: "text-purple-300"  },
  { abbr: "ML",        full: "Machine Learning",           border: "border-indigo-500/30",  bg: "bg-indigo-500/[0.12]",  text: "text-indigo-300"  },
  { abbr: "BYF",      full: "Build Your Forecast",    border: "border-blue-500/30",    bg: "bg-blue-500/[0.12]",    text: "text-blue-300"    },
  { abbr: "Survey-ML", full: "Survey-based ML Forecast",  border: "border-cyan-500/30",    bg: "bg-cyan-500/[0.12]",    text: "text-cyan-300"    },
];

const METRICS_TERMS: Chip[] = [
  { abbr: "MoM", full: "Month-over-Month",               border: "border-teal-500/30",    bg: "bg-teal-500/[0.12]",    text: "text-teal-300"    },
  { abbr: "YoY", full: "Year-over-Year",                  border: "border-green-500/30",   bg: "bg-green-500/[0.12]",   text: "text-green-300"   },
  { abbr: "OEM", full: "Original Equipment Manufacturer", border: "border-lime-500/30",    bg: "bg-lime-500/[0.12]",    text: "text-lime-300"    },
  { abbr: "EV",  full: "Electric Vehicle",                border: "border-emerald-500/30", bg: "bg-emerald-500/[0.12]", text: "text-emerald-300" },
  { abbr: "CNG", full: "Compressed Natural Gas",          border: "border-yellow-500/30",  bg: "bg-yellow-500/[0.12]",  text: "text-yellow-300"  },
];

function ChipGroup({ label, chips }: { label: string; chips: Chip[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map(({ abbr, full, border, bg, text }) => (
          <span
            key={abbr}
            className={`inline-flex items-center gap-3 rounded-xl border ${border} ${bg} px-4 py-2.5 backdrop-blur-sm`}
          >
            <span className={`text-base font-extrabold leading-none tracking-wide ${text}`}>
              {abbr}
            </span>
            <span className="text-sm leading-none text-white/65">{full}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function QuickReferenceSection() {
  return (
    <section className="relative border-t border-white/[0.07] bg-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-64 w-96 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-64 w-96 translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.10),transparent_70%)] blur-3xl" />
      </div>

      <div className="mx-auto w-[95vw] max-w-none px-2 py-8 sm:px-3 lg:px-4 xl:w-[93vw] 2xl:w-[90vw] md:py-10">
        {/* Heading */}
        <div className="mb-5 md:mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/25">
            Platform glossary
          </p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white/90 md:text-3xl">
            Quick Reference
          </h2>
          <p className="mt-1 text-sm text-white/45">
            All abbreviations and terms used across Flash Reports and Forecast tools.
          </p>
        </div>

        {/* Three groups */}
        <div className="space-y-4 md:space-y-5">
          <ChipGroup label="Vehicle Segments" chips={VEHICLE_SEGMENTS} />
          <div className="h-px bg-white/[0.06]" />
          <ChipGroup label="Forecast Methods" chips={FORECAST_METHODS} />
          <div className="h-px bg-white/[0.06]" />
          <ChipGroup label="Metrics &amp; Terms" chips={METRICS_TERMS} />
        </div>
      </div>
    </section>
  );
}
