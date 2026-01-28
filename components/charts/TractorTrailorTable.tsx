"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PASSCODE = "Tractor-trailer-Flash@2025";

const TractorTrailerForecast = () => {
  const [entered, setEntered] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        Tractor Trailer Sales Performance
      </h2>

      {!authed ? (
        <div className="mt-2 flex justify-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-4 py-5 shadow-lg shadow-black/40 backdrop-blur"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-sm">
                🔒
              </span>
              <span>Protected sales data</span>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-zinc-400">
              Enter the passcode to unlock the tractor trailer sales performance
              graph.
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
                className="w-full rounded-md border border-zinc-700 bg-black/60 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40"
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
              className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-sm font-semibold text-indigo-50 shadow-md shadow-indigo-500/30 transition hover:from-indigo-400 hover:to-violet-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              <span className="mr-1.5 text-base">🔓</span>
              Unlock data
            </button>
          </form>
        </div>
      ) : (
        <TractorTrailerSalesChart />
      )}
    </div>
  );
};

const TractorTrailerSalesChart = () => {
  // Apr 2025 → Mar 2026
  const startMonthIndex = 3; // April (0-based)
  const baseDate = new Date(2025, startMonthIndex, 1);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const date = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth() + i,
          1
        );
        return `${date.toLocaleString("default", {
          month: "short",
        })} ${date.getFullYear()}`;
      }),
    []
  );

  // Apr 2025 → Mar 2026 (12 values)
  const values = [
    4185, 4256, 3988, 4362,
    4122, 4236, 4352, 4462,
    4125, 4332, 4066, 4458,
  ];

  const data = months.map((label, idx) => ({
    month: label,
    sales: values[idx],
  }));

  return (
    <div
      style={{
        width: "100%",
        height: isMobile ? 220 : 320,
        marginTop: 16,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={
            isMobile
              ? { top: 6, right: 12, left: 2, bottom: 6 }
              : { top: 10, right: 30, left: 10, bottom: 10 }
          }
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: isMobile ? 9 : 11, fill: "#ccc" }}
            angle={isMobile ? -35 : -25}
            textAnchor="end"
            height={isMobile ? 42 : 50}
            minTickGap={isMobile ? 6 : 0}
          />
          <YAxis
            tick={{ fontSize: isMobile ? 9 : 11, fill: "#ccc" }}
            tickFormatter={(val) => val.toLocaleString()}
            width={isMobile ? 40 : 60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f1f1f",
              border: "1px solid #444",
              borderRadius: 8,
              fontSize: 12,
              color: "#fff",
            }}
            formatter={(value: any) => [
              `${value.toLocaleString()} units`,
              "Sales",
            ]}
          />
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 1, stroke: "#121212" }}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TractorTrailerForecast;
