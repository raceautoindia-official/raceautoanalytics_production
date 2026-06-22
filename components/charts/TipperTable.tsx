"use client";

import React, { useState } from "react";
import { LineChart } from "@/components/charts/LineChart";

const PASSCODE = "TipperFlash@2025";

interface TipperTableProps {
  /** Overall-chart-data points; the historical "Tipper" series lives here. */
  overallData?: any[];
  /** Flash graph id mapped to Tipper (per country) — drives the forecast. */
  graphId?: number | null;
  allowForecast?: boolean;
  baseMonth?: string | null;
  horizon?: number | null;
  country?: string | null;
  /** Admins skip the passcode and see the chart directly. */
  isAdmin?: boolean;
}

const TipperTable = ({
  overallData = [],
  graphId = null,
  allowForecast = false,
  baseMonth = null,
  horizon = 6,
  country = null,
  isAdmin = false,
}: TipperTableProps) => {
  const [entered, setEntered] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Admins bypass the passcode entirely; everyone else must unlock.
  const unlocked = isAdmin || authed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entered === PASSCODE) {
      setAuthed(true);
      setError("");
    } else {
      setError("Incorrect passcode. Please try again.");
    }
  };

  return (
    <div
      style={{ padding: 20, color: "#fff", background: "#09090b" }}
      className="mt-4 rounded-xl border border-zinc-800 shadow-lg shadow-black/40"
    >
      <h2
        style={{
          marginBottom: 8,
          fontWeight: 600,
          fontSize: "1.6rem",
        }}
        className="tracking-tight"
      >
        Tipper Sales Performance
      </h2>

      {!unlocked ? (
        <div className="mt-2 flex justify-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-4 py-5 shadow-lg shadow-black/40 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-sm">
                🔒
              </span>
              <span>Protected sales data</span>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-zinc-400">
              Enter the passcode to unlock the tipper sales performance graph.
              <br />
              <span className="text-[11px] text-zinc-500">
                Passcode is case-sensitive. Contact admin if you don&apos;t have
                access.
              </span>
            </p>

            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Passcode
            </label>

            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                value={entered}
                onChange={(e) => {
                  setEntered(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter passcode"
                className="w-full rounded-md border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-2 my-[2px] inline-flex items-center rounded-md px-2 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 focus:outline-none"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!entered.trim()}
              className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-50 shadow-md shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <span className="mr-1.5 text-base">🔓</span>
              Unlock data
            </button>
          </form>
        </div>
      ) : (
        // Full line-chart flow, identical to the other segments: historical
        // from the "Tipper" series + AI/Race/Survey forecast lines AND the
        // Build-Your-Forecast (BYF) score-card CTA driven by the mapped Flash
        // graph + its BYF questions. showSubmitScore defaults to true (same as
        // the Truck/2W/etc. forecast charts).
        <div className="mt-4">
          <LineChart
            overallData={overallData}
            category="Tipper"
            height={320}
            allowForecast={allowForecast}
            baseMonth={baseMonth}
            horizon={horizon}
            country={country}
            graphId={graphId}
          />
        </div>
      )}
    </div>
  );
};

export default TipperTable;
