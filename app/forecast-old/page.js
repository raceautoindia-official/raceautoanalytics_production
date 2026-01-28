"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { FaClipboardList, FaBolt } from "react-icons/fa";

import "./forecast.css";
import GlobalStyles from "./GlobalStyles";
import Footer from "./Footer";

import {
  allRegions,
  regionGroups,
  graphs,
  bothDataMap,
  datasetMap,
} from "./forecastConfig";
import CustomTooltip from "./CustomTooltip";
import LoginNavButton from "../flash-reports/components/Login/LoginAuthButton";

export default function ForecastPage() {
  const router = useRouter();

  // ─── UI State ─────────────────────────────────────────────────────
  const [isLogoHover, setLogoHover] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDatasetHovering, setIsDatasetHovering] = useState(false);
  const [isRegionsHovering, setIsRegionsHovering] = useState(false);
  const [button1Prompt, setButton1Prompt] = useState(false);
  const [button2Prompt, setButton2Prompt] = useState(false);

  // ─── Selection State ──────────────────────────────────────────────
  const [selectedDatasetId, setSelectedDatasetId] = useState(() => {
    const ids = Object.keys(datasetMap);
    return ids.length > 0 ? ids[0] : null;
  });

  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedGraphId, setSelectedGraphId] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // ─── MOBILE DETECTION ──────────────────────────────────────────────
  // Set isMobile = true whenever window width ≤ 480px
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 550);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // When dataset changes: pick the first graph and auto‐select all regions
  useEffect(() => {
    if (selectedDatasetId) {
      const available = graphs.filter((g) =>
        g.dataset_ids.includes(selectedDatasetId)
      );
      setSelectedGraphId(available.length ? available[0].id : null);
      setSelectedRegions(allRegions.slice());
    } else {
      setSelectedGraphId(null);
      setSelectedRegions([]);
    }
  }, [selectedDatasetId]);

  const selectedGraph = graphs.find((g) => g.id === selectedGraphId);

  // ─── Region grouping logic ─────────────────────────────────────────
  const regionsByGroup = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(regionGroups).map(([grp, list]) => [
          grp,
          list.map((name) => ({ id: name, name })),
        ])
      ),
    []
  );
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(Object.keys(regionsByGroup).map((g) => [g, false]))
  );

  // ─── Chart data & flags ────────────────────────────────────────────
  const bothData = bothDataMap[selectedGraphId] || [];
  const hasLinear = selectedGraph?.forecast_types.includes("linear");
  const hasScore = selectedGraph?.forecast_types.includes("score");
  const hasAi = selectedGraph?.forecast_types.includes("ai");
  const hasRaceInsights =
    selectedGraph?.forecast_types.includes("raceInsights");

  // ─── Compute CAGR for each series (only count non-null points) ──────
  const cagrList = useMemo(() => {
    if (!bothData.length) return [];
    const results = [];

    // Helper to compute CAGR using only valid data points (ignores nulls)
    const computeCagr = (key) => {
      const filtered = bothData
        .map((row) => ({ year: row.year, val: row[key] }))
        .filter((d) => d.val !== null && d.val !== undefined);
      if (filtered.length < 2) return null;
      const first = filtered[0];
      const last = filtered[filtered.length - 1];
      // Use (filtered.length - 1) as the number of intervals
      const periods = filtered.length - 1;
      if (periods <= 0 || first.val <= 0) return null;
      const cagrValue = Math.pow(last.val / first.val, 1 / periods) - 1;
      return cagrValue;
    };

    // Historical CAGR (value)
    const histCagr = computeCagr("value");
    if (histCagr !== null) {
      results.push({
        name: "Historical",
        color: "#D64444",
        cagr: histCagr,
      });
    }
    // Forecast Linear CAGR
    if (hasLinear) {
      const linCagr = computeCagr("forecastLinear");
      if (linCagr !== null)
        results.push({
          name: "Forecast (Stats)",
          color: "#F58C1F",
          cagr: linCagr,
        });
    }
    // Forecast Score CAGR
    if (hasScore) {
      const scoreCagr = computeCagr("forecastScore");
      if (scoreCagr !== null)
        results.push({
          name: "Forecast (Survey)",
          color: "#23DD1D",
          cagr: scoreCagr,
        });
    }
    // Forecast AI CAGR
    if (hasAi) {
      const aiCagr = computeCagr("forecastAi");
      if (aiCagr !== null)
        results.push({ name: "Forecast (AI)", color: "#0080FF", cagr: aiCagr });
    }
    // Forecast Race Insights CAGR
    if (hasRaceInsights) {
      const riCagr = computeCagr("forecastRaceInsights");
      if (riCagr !== null)
        results.push({
          name: "Forecast (Race Insights)",
          color: "#8A2BE2",
          cagr: riCagr,
        });
    }

    return results;
  }, [bothData, hasLinear, hasScore, hasAi, hasRaceInsights]);

  const legendPayload = useMemo(() => {
    const items = [{ value: "Historical", type: "line", color: "#D64444" }];
    if (hasLinear)
      items.push({ value: "Forecast (Stats)", type: "line", color: "#F58C1F" });
    if (hasScore)
      items.push({
        value: "Forecast (Survey-based)",
        type: "line",
        color: "#23DD1D",
      });
    if (hasAi)
      items.push({ value: "Forecast (AI)", type: "line", color: "#0080FF" });
    if (hasRaceInsights)
      items.push({
        value: "Forecast (Race Insights)",
        type: "line",
        color: "#8A2BE2",
      });
    return items;
  }, [hasLinear, hasScore, hasAi, hasRaceInsights]);

  const abbreviate = (v) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    return v;
  };

  // ─── Subscription overlay ──────────────────────────────────────────
  function SubscriptionPrompt({ onClose }) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");

    return (
      <div className="subscribe-prompt">
        <p>Please subscribe to unlock this feature.</p>

        <button
          className="subscribe-btn"
          onClick={() => {
            onClose();
            router.push("https://raceautoindia.com/subscription");
          }}
        >
          Subscribe Now
        </button>

        {/* Unlock section */}
        <div className="unlock-wrapper">
          <p style={{ marginBottom: 6 }}>Already subscribed? Contact us at:</p>
          <p style={{ fontWeight: "bold", marginBottom: 12 }}>
            <a
              href="mailto:info@raceautoindia.com"
              style={{ color: "#F58C1F", textDecoration: "underline" }}
            >
              info@raceautoindia.com
            </a>
          </p>
          {/* <p style={{ fontWeight: "bold", marginBottom: 12, color: "#F58C1F" }}>
            director@raceautoindia.com
          </p> */}

          <input
            type="text"
            placeholder="Enter access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="unlock-input"
          />

          <button
            className="validate-btn"
            onClick={() => {
              // Always fail validation for now
              setError("Invalid code. Please try again.");
            }}
          >
            Validate
          </button>

          {error && <p className="error-msg">{error}</p>}
        </div>

        <style jsx>{`
          .subscribe-prompt {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(20, 20, 20, 0.95);
            padding: 1.5rem;
            border-radius: 0.5rem;
            color: #fff;
            text-align: center;
            z-index: 10;
            width: 90%;
            max-width: 320px;
          }

          .unlock-wrapper {
            margin: 1rem 0 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .unlock-input {
            padding: 0.4rem 0.6rem;
            border: 1px solid #666;
            border-radius: 4px;
            background: #1c1c1c;
            color: #fff;
          }

          .validate-btn {
            padding: 0.45rem 0.8rem;
            border: none;
            border-radius: 4px;
            background: var(--accent);
            color: #fff;
            font-weight: bold;
            cursor: pointer;
          }

          .error-msg {
            color: #ff6b6b;
            font-size: 0.85rem;
            margin-top: 0.25rem;
          }

          .subscribe-btn {
            margin-top: 0.5rem;
            padding: 0.5rem 1rem;
            background: var(--accent);
            border: none;
            border-radius: 0.25rem;
            cursor: pointer;
            font-weight: bold;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <motion.div
        className="container-fluid"
        style={{ background: "#2C2E31" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
      >
        <div className="container mt-1">
          {/* APP HEADER */}
          <div className="app-header d-flex justify-content-between align-items-center">
            <Link href="/forecast-sample" passHref>
              <motion.div
                className="logo-container"
                onMouseEnter={() => setLogoHover(true)}
                onMouseLeave={() => setLogoHover(false)}
                onClick={() => router.push("/")}
                animate={{
                  scale: isLogoHover ? 1.05 : 1,
                  filter: isLogoHover
                    ? "drop-shadow(0 0 12px var(--accent))"
                    : "none",
                }}
                transition={{
                  scale: { type: "spring", stiffness: 300, damping: 20 },
                  filter: { duration: 0.2 },
                }}
              >
                <Image
                  src="/images/race analytics new logo white.png"
                  alt="Race Auto India"
                  width={Math.round(160 * 1.5)}
                  height={Math.round(60 * 1.5)}
                />
              </motion.div>
            </Link>
            <div className="nav-buttons">
              {/* Button #1 */}
              <button
                className="nav-btn"
                onClick={() => {
                  if (!button1Prompt) {
                    setButton1Prompt(true);
                    setTimeout(() => setButton1Prompt(false), 3000);
                  } else {
                    router.push("https://raceautoindia.com/subscription");
                  }
                }}
              >
                {button1Prompt ? (
                  "Subscribe to unlock"
                ) : (
                  <>
                    <FaClipboardList className="btn-icon" /> Build Your Own
                    Tailored Forecast
                  </>
                )}
              </button>

              {/* Button #2 */}
              <button
                className="nav-btn"
                onClick={() => {
                  if (!button2Prompt) {
                    setButton2Prompt(true);
                    setTimeout(() => setButton2Prompt(false), 3000);
                  } else {
                    router.push("https://raceautoindia.com/subscription");
                  }
                }}
              >
                {button2Prompt ? (
                  "Subscribe to unlock"
                ) : (
                  <>
                    <FaBolt className="btn-icon" /> Flash Reports
                  </>
                )}
              </button>
              <LoginNavButton/>
            </div>
          </div>

          {/* DATASET PICKER */}
          <div className="selectors d-flex align-items-center gap-3">
            <div
              className={`dropdown-toggle ${
                isDatasetHovering ? "dropdown-open" : ""
              }`}
              onMouseEnter={() => setIsDatasetHovering(true)}
              onMouseLeave={() => setIsDatasetHovering(false)}
            >
              <span style={{ color: "white" }}>
                {selectedDatasetId
                  ? datasetMap[selectedDatasetId].label
                  : "Categories"}
              </span>
              <div
                className={`chart-dropdown ${isDatasetHovering ? "open" : ""}`}
              >
                {Object.entries(datasetMap).map(([id, ds], idx) => (
                  <div
                    key={id}
                    onClick={() => {
                      // First two categories work normally; 3rd+ show prompt
                      if (idx >= 2) {
                        setShowPrompt(true);
                      } else {
                        setShowPrompt(false);
                        setSelectedDatasetId(id);
                      }
                      setIsDatasetHovering(false);
                    }}
                    className="mt-1"
                    style={{ cursor: "pointer", color: "white" }}
                  >
                    {ds.label || id}
                  </div>
                ))}
              </div>
            </div>

            {/* REGIONS PICKER */}
            <div
              className={`dropdown-toggle ${
                isRegionsHovering ? "dropdown-open" : ""
              }`}
              onMouseEnter={() => setIsRegionsHovering(true)}
              onMouseLeave={() => setIsRegionsHovering(false)}
            >
              <span style={{ color: "white" }}>
                {selectedRegions.length === allRegions.length
                  ? "All Regions"
                  : selectedRegions.length > 0
                  ? `${selectedRegions.length} region${
                      selectedRegions.length > 1 ? "s" : ""
                    }`
                  : "Regions"}
              </span>
              <div
                className={`chart-dropdown ${isRegionsHovering ? "open" : ""}`}
              >
                {/* select/remove all */}
                <div
                  onClick={() => {
                    selectedRegions.length === allRegions.length
                      ? setSelectedRegions([])
                      : setSelectedRegions(allRegions);
                  }}
                  className="mt-1 select-all"
                  style={{
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  {selectedRegions.length === allRegions.length
                    ? "Remove all"
                    : "Select all"}
                </div>

                {/* grouped regions: all other clicks show prompt */}
                {Object.entries(regionsByGroup).map(([grp, nodes]) => (
                  <div key={grp} style={{ marginBottom: 8, color: "white" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        className="me-2"
                        checked={nodes.every((n) =>
                          selectedRegions.includes(n.name)
                        )}
                        onChange={() => setShowPrompt(true)}
                      />
                      <strong
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenGroups((o) => ({ ...o, [grp]: !o[grp] }));
                        }}
                        style={{ userSelect: "none" }}
                      >
                        {grp} {openGroups[grp] ? "▾" : "▸"}
                      </strong>
                    </label>
                    {openGroups[grp] &&
                      nodes.map((n) => (
                        <label
                          key={n.id}
                          className="d-block ps-3"
                          style={{
                            fontSize: 14,
                            marginTop: 4,
                            color: "white",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            className="me-2"
                            checked={selectedRegions.includes(n.name)}
                            onChange={() => setShowPrompt(true)}
                          />
                          {n.name}
                        </label>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHART HEADER */}
          <h5 className="chart-header">
            {!selectedDatasetId ? (
              <span className="chart-title">
                Please select a category first
              </span>
            ) : (
              <div
                className={`dropdown-toggle ${
                  isHovering ? "dropdown-open" : ""
                }`}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <span className="chart-title">{selectedGraph?.name}</span>
                <div className={`chart-dropdown ${isHovering ? "open" : ""}`}>
                  {graphs
                    .filter((g) => g.dataset_ids.includes(selectedDatasetId))
                    .map((g, idx) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          if (idx === 0) {
                            setSelectedGraphId(g.id);
                            setShowPrompt(false);
                          } else {
                            setShowPrompt(true);
                          }
                          setIsHovering(false);
                        }}
                        className="mt-1"
                        style={{ cursor: "pointer" }}
                      >
                        {g.name}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </h5>

          {/* CAGR Display */}
          {cagrList.length > 0 && (
            <div
              className={`cagr-container ${
                isMobile
                  ? "cagr-mobile d-flex flex-column mb-2"
                  : "d-flex gap-3 mb-2"
              }`}
            >
              {cagrList.map((item) => (
                <div
                  key={item.name}
                  className="cagr-item"
                  style={{
                    color: item.color,
                    ...(isMobile
                      ? {
                          background: `${item.color}20`, // low‐opacity “pill” background
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                        }
                      : {
                          fontSize: "0.9rem",
                          background: "transparent",
                          padding: 0,
                        }),
                  }}
                >
                  <strong>{item.name}:</strong> {(item.cagr * 100).toFixed(2)}%
                </div>
              ))}
            </div>
          )}

          {/* CHART */}
          <div className="mt-3">
            {selectedDatasetId &&
              selectedRegions.length > 0 &&
              selectedGraphId && (
                <div className="chart-container">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedGraphId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div
                        className="chart-card"
                        style={{
                          filter: showPrompt ? "blur(4px)" : "none",
                          pointerEvents: showPrompt ? "none" : "auto",
                        }}
                      >
                        {/* 
                          ResponsiveContainer height is dynamic:
                          - 400px on desktop
                          - 250px on mobile (isMobile === true)
                        */}
                        <ResponsiveContainer
                          width="100%"
                          height={isMobile ? 250 : 400}
                        >
                          <LineChart
                            data={bothData}
                            margin={{
                              top: 20,
                              right: 20,
                              bottom: 0,
                              left: 0,
                            }}
                          >
                            <defs>
                              <linearGradient
                                id="histGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={
                                    hasLinear && hasScore
                                      ? "#D64444"
                                      : "#1039EE"
                                  }
                                  stopOpacity={0.9}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={
                                    hasLinear && hasScore
                                      ? "#D64444"
                                      : "#1039EE"
                                  }
                                  stopOpacity={0.3}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              stroke="rgba(255,255,255,0.1)"
                              strokeDasharray="3 3"
                            />
                            <XAxis
                              dataKey="year"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "rgba(255,255,255,0.7)",
                                fontSize: isMobile ? 10 : 12,
                              }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              width={isMobile ? 20 : 40} // shrink the total axis‐label width on mobile
                              // On mobile, shift tick labels 10px inside
                              tick={{
                                // On mobile: use a translucent white instead of #FFC107
                                fill: isMobile
                                  ? "rgba(255,255,255,0.5)"
                                  : "#FFC107",
                                fontSize: isMobile ? 10 : 12,
                                dx: isMobile ? 30 : 0,
                              }}
                              domain={["auto", "auto"]}
                              tickFormatter={abbreviate}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              wrapperStyle={{ marginTop: 24 }}
                              payload={legendPayload}
                              itemStyle={{
                                fontSize: isMobile ? "0.3rem" : "0.75rem",
                                whiteSpace: "nowrap",
                              }}
                            />

                            <Line
                              dataKey="value"
                              name="Historical"
                              stroke="url(#histGrad)"
                              strokeWidth={isMobile ? 1 : 2}
                              connectNulls
                            />
                            {hasLinear && (
                              <Line
                                dataKey="forecastLinear"
                                name="Forecast (Stats)"
                                stroke="#F58C1F"
                                strokeWidth={isMobile ? 1 : 2}
                                strokeDasharray="5 5"
                                connectNulls
                              />
                            )}
                            {hasScore && (
                              <Line
                                dataKey="forecastScore"
                                name="Forecast (Survey-based)"
                                stroke="#23DD1D"
                                strokeWidth={isMobile ? 1 : 2}
                                strokeDasharray="2 2"
                                connectNulls
                              />
                            )}
                            {hasAi && (
                              <Line
                                dataKey="forecastAi"
                                name="Forecast (AI)"
                                stroke="#0080FF"
                                strokeWidth={isMobile ? 1 : 2}
                                strokeDasharray="3 3"
                                connectNulls
                              />
                            )}
                            {hasRaceInsights && (
                              <Line
                                dataKey="forecastRaceInsights"
                                name="Forecast (Race Insights)"
                                stroke="#8A2BE2"
                                strokeWidth={isMobile ? 1 : 2}
                                strokeDasharray="1 4"
                                connectNulls
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {showPrompt && (
                        <SubscriptionPrompt
                          onClose={() => setShowPrompt(false)}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <style jsx>{`
                    .chart-container {
                      position: relative;
                    }
                    .cagr-container {
                      padding: 0.5rem 1rem;
                      background: #1f2022;
                      border-radius: 0.25rem;
                      color: #fff;
                    }
                    .cagr-item {
                      font-size: 0.9rem;
                    }
                  `}</style>
                </div>
              )}
          </div>

          <div style={{ height: ".75rem" }} />
          <Footer />
        </div>
      </motion.div>
    </>
  );
}
