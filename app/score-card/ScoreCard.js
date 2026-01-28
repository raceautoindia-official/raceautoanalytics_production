"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

// ❌ remove this
// import "./score.css";

import { notification, Button, Tag, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import Image from "next/image";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useCurrentPlan } from "../hooks/useCurrentPlan";
import { useRouter, useSearchParams } from "next/navigation";
import LoginNavButton from "../flash-reports/components/Login/LoginAuthButton";

const pad2 = (n) => String(n).padStart(2, "0");

// Previous calendar month based on Asia/Kolkata (IST) — returns YYYY-MM
const getPrevMonthIST = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 330 * 60000);

  let y = ist.getFullYear();
  let m = ist.getMonth() + 1; // 1-12
  m -= 1;
  if (m === 0) {
    y -= 1;
    m = 12;
  }
  return `${y}-${pad2(m)}`;
};

export default function ScoreCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const graphId = searchParams.get("graphId");
  const { email } = useCurrentPlan();

  const [value, setValue] = useState(1);
  const [questions, setQuestions] = useState([]);
  const [years, setYears] = useState([]);
  const [dropdownOpts, setDropdownOpts] = useState([]);
  const [selectedValues, setSelectedValues] = useState([]);
  const [skipFlags, setSkipFlags] = useState([]);
  const [incompleteFlags, setIncompleteFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const [graphName, setGraphName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Flash monthly cycle support
  const [graphContext, setGraphContext] = useState("forecast");
  const [scoreSettingsKey, setScoreSettingsKey] = useState("scoreSettings");
  const [basePeriod, setBasePeriod] = useState(null);

  // Swiper ref for programmatic control
  const swiperRef = useRef(null);

  // === ML guidance state ===
  const [mlEnabled, setMlEnabled] = useState(false);
  const [mlLoaded, setMlLoaded] = useState(false);
  const [rangeMap, setRangeMap] = useState({});
  const warnedRef = useRef(new Set());
  const MIN_RANGE_WIDTH = 2;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Tailwind sm breakpoint is 640px => mobile = < 640
    const mq = window.matchMedia("(max-width: 639px)");

    const apply = () => setIsMobile(mq.matches);
    apply();

    if (mq.addEventListener) mq.addEventListener("change", apply);
    else mq.addListener(apply);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else mq.removeListener(apply);
    };
  }, []);

  // 0) load graph metadata
  useEffect(() => {
    async function fetchGraph() {
      try {
        const graphs = await (
          await fetch("/api/graphs", {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          })
        ).json();

        const g = graphs.find((g) => String(g.id) === graphId);
        if (!g) return;

        setGraphName(g.name);

        const dsId = g.dataset_ids;
        if (!dsId) return;

        const vols = await (
          await fetch("/api/volumeData", {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          })
        ).json();

        const entry = vols.find((v) => Number(v.id) === Number(dsId));
        if (!entry?.stream) return;

        const nodeId = Number(entry.stream.split(",")[2]);
        if (isNaN(nodeId)) return;

        const nodes = await (
          await fetch("/api/contentHierarchy", {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          })
        ).json();

        const node = nodes.find((n) => Number(n.id) === nodeId);
        if (node) setCategoryName(node.name);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMeta(false);
      }
    }

    if (graphId) fetchGraph();
  }, [graphId]);

  // 1) Load graph config + questions + settings (Flash monthly cycle supported)
  useEffect(() => {
    if (!graphId) return;

    async function load() {
      setLoading(true);

      // Load graph first (to decide forecast vs flash behavior)
      const gRes = await fetch(`/api/graphs?id=${graphId}`, {
        cache: "no-store",
      });
      const gJson = await gRes.json();
      const g = gJson?.graph || null;

      const context = String(g?.context || "forecast");
      const key = String(g?.score_settings_key || "scoreSettings");

      setGraphContext(context);
      setScoreSettingsKey(key);

      const bp = context === "flash" ? getPrevMonthIST() : null;
      setBasePeriod(bp);

      const scoreSettingsUrl =
        context === "flash"
          ? `/api/scoreSettings?key=${encodeURIComponent(
              key
            )}&baseMonth=${encodeURIComponent(bp)}&horizon=6`
          : `/api/scoreSettings?key=${encodeURIComponent(key)}`;

      const [qRes, sRes] = await Promise.all([
        fetch(`/api/questions?graphId=${graphId}`, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          cache: "no-store",
        }),
        fetch(scoreSettingsUrl, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          cache: "no-store",
        }),
      ]);

      const qList = await qRes.json();
      const { yearNames, scoreLabels } = await sRes.json();

      setQuestions(qList);
      setYears(yearNames);
      setDropdownOpts(scoreLabels);

      setSelectedValues(
        qList.map(() => Array(yearNames.length).fill("Select"))
      );
      setSkipFlags(qList.map(() => false));
      setIncompleteFlags(qList.map(() => false));
      setLoading(false);
    }

    load().catch((err) => {
      console.error(err);
      notification.error({ message: err.message });
      setLoading(false);
    });
  }, [graphId]);

  // 2) Split positive vs negative and chunk into slides
  const chunkSize = isMobile ? 1 : 4;
  const { slides, driversCount } = useMemo(() => {
    const indexed = questions.map((q, idx) => ({ ...q, originalIndex: idx }));
    const positive = indexed.filter((q) => q.type === "positive");
    const negative = indexed.filter((q) => q.type === "negative");

    const makeSlides = (arr) => {
      const s = [];
      for (let i = 0; i < arr.length; i += chunkSize)
        s.push(arr.slice(i, i + chunkSize));
      return s;
    };

    const posSlides = makeSlides(positive);
    const negSlides = makeSlides(negative);

    return {
      slides: [...posSlides, ...negSlides],
      driversCount: posSlides.length,
    };
  }, [questions]);

  const totalPages = Math.max(1, slides.length);

  // 3) Skip & Submit
  const handleSkip = (globalIdx) => {
    setSkipFlags((sf) => sf.map((v, i) => (i === globalIdx ? true : v)));
    setSelectedValues((sv) => {
      const copy = sv.map((arr) => [...arr]);
      copy[globalIdx] = Array(years.length).fill(null);
      return copy;
    });
  };

  const handleSubmit = async () => {
    const flags = questions.map((_, idx) => {
      return !skipFlags[idx] && selectedValues[idx].some((v) => v === "Select");
    });
    setIncompleteFlags(flags);

    const firstIncomplete = flags.findIndex((f) => f);
    if (firstIncomplete !== -1) {
      notification.warning({
        message: "Please Complete All Questions",
        description:
          "You need to either answer or skip every question before submitting.",
        placement: "topRight",
        duration: 4,
      });
      const slideNum = Math.floor(firstIncomplete / chunkSize);
      swiperRef.current?.slideTo(slideNum);
      setValue(slideNum + 1);
      return;
    }

    setIncompleteFlags(questions.map(() => false));

    const step = dropdownOpts.length > 1 ? 10 / (dropdownOpts.length - 1) : 0;
    const labelToScore = dropdownOpts.reduce(
      (m, lbl, i) => ({ ...m, [lbl]: i * step }),
      {}
    );

    const payload = questions.map((q, idx) => ({
      questionId: q.id,
      scores: skipFlags[idx]
        ? []
        : selectedValues[idx].map((lbl) =>
            labelToScore[lbl] != null ? labelToScore[lbl] : null
          ),
      skipped: skipFlags[idx],
    }));

    try {
      const res = await fetch("/api/saveScores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({
          user: email,
          graphId,
          basePeriod: basePeriod,
          results: payload,
        }),
      });

      if (res.ok) {
        notification.success({
          message: "Scores Saved",
          description: "Your input has been successfully submitted.",
          placement: "topRight",
          duration: 3,
        });

        setSelectedValues(
          questions.map(() => Array(years.length).fill("Select"))
        );
        setSkipFlags(questions.map(() => false));
        swiperRef.current?.slideTo(0);
        setValue(1);
      } else {
        const errorText = await res.text();
        notification.error({
          message: "Submit Failed",
          description: errorText,
          placement: "topRight",
          duration: 5,
        });
      }
    } catch (err) {
      notification.error({
        message: "Network Error",
        description: err.message,
        placement: "topRight",
        duration: 5,
      });
    }
  };

  // slider control
  const handleSliderChange = (e) => {
    const v = Number(e.target.value);
    setValue(v);
    swiperRef.current?.slideTo(v - 1);
  };

  const isBarrierHeader = value - 1 >= driversCount;

  const handleSuggestions = () => {
    const subject = `Score card suggestions for ${categoryName} – ${graphName}`;
    const body = [
      `Hello team,`,
      ``,
      `I have some suggestions for the score card "${categoryName} – ${graphName}".`,
      `Please see below:`,
      ``,
      `1. …`,
      `2. …`,
      ``,
      `Thanks,`,
      `${email || "—"}`,
    ].join("\n");

    window.location.href =
      `mailto:info@raceautoindia.com` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
  };

  // Label ↔ score mapping from dropdown
  const { labelToScore, scoreToNearestLabel, step } = useMemo(() => {
    if (!dropdownOpts?.length)
      return { labelToScore: {}, scoreToNearestLabel: () => "Select", step: 0 };
    const step = dropdownOpts.length > 1 ? 10 / (dropdownOpts.length - 1) : 0;

    const l2s = dropdownOpts.reduce((m, lbl, i) => {
      m[lbl] = i * step;
      return m;
    }, {});

    const nearest = (score) => {
      if (!Number.isFinite(score) || step === 0) return "Select";
      const idx = Math.min(
        dropdownOpts.length - 1,
        Math.max(0, Math.round(score / step))
      );
      return dropdownOpts[idx];
    };

    return { labelToScore: l2s, scoreToNearestLabel: nearest, step };
  }, [dropdownOpts]);

  const rangeToLabelSpan = (qid, yIdx) => {
    const r = rangeMap?.[qid]?.[yIdx];
    if (!r || !dropdownOpts?.length || step <= 0) return null;

    const idxLo = Math.max(
      0,
      Math.min(dropdownOpts.length - 1, Math.floor(r.lo / step + 1e-9))
    );
    const idxHi = Math.max(
      0,
      Math.min(dropdownOpts.length - 1, Math.ceil(r.hi / step - 1e-9))
    );

    const loLabel = dropdownOpts[Math.min(idxLo, idxHi)];
    const hiLabel = dropdownOpts[Math.max(idxLo, idxHi)];
    return loLabel === hiLabel ? loLabel : `${loLabel} – ${hiLabel}`;
  };

  const isInMlRange = (qid, yIdx, label) => {
    if (!mlEnabled) return null;
    const r = rangeMap?.[qid]?.[yIdx];
    if (!r) return null;
    const v = labelToScore[label];
    if (!Number.isFinite(v)) return null;
    return v >= r.lo - 1e-6 && v <= r.hi + 1e-6;
  };

  const suggestLabel = (qid, yIdx) => {
    const r = rangeMap?.[qid]?.[yIdx];
    if (!r) return "Select";
    return scoreToNearestLabel((r.lo + r.hi) / 2);
  };

  const mlUsable = useMemo(
    () => mlEnabled && Object.keys(rangeMap).length > 0,
    [mlEnabled, rangeMap]
  );

  // enable ML when >=2 non-skipped submissions
  useEffect(() => {
    if (!graphId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/saveScores?graphId=${encodeURIComponent(graphId)}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
            cache: "no-store",
          }
        );

        if (!res.ok) throw new Error(`saveScores GET ${res.status}`);
        const data = await res.json();
        const subs = Array.isArray(data?.submissions) ? data.submissions : [];

        const nonSkippedCount = subs.reduce((acc, sub) => {
          const hasData = (sub.scores || []).some(
            (s) =>
              s &&
              !s.skipped &&
              s.score != null &&
              Number.isFinite(Number(s.score))
          );
          return acc + (hasData ? 1 : 0);
        }, 0);

        if (cancelled) return;

        const enabled = nonSkippedCount >= 2;
        setMlEnabled(enabled);

        if (!enabled) {
          setRangeMap({});
          setMlLoaded(true);
          return;
        }

        const r = await fetch(
          `/api/ml/results?graphId=${encodeURIComponent(graphId)}`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`ml/results ${r.status}`);
        const ml = await r.json();

        if (cancelled) return;

        if (!ml.exists || !ml.output?.data) {
          setRangeMap({});
        } else {
          const map = {};
          for (const row of ml.output.data) {
            const qid = Number(row.question_id);
            const yi = Number(row.year_index);
            const lo = Number(row.lower_range);
            const hi = Number(row.upper_range);

            if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
            if (hi - lo < MIN_RANGE_WIDTH) continue;

            (map[qid] || (map[qid] = {}))[yi] = { lo, hi };
          }
          setRangeMap(map);
        }

        setMlLoaded(true);
      } catch (e) {
        console.error("ML enable/range fetch failed:", e);
        if (!cancelled) {
          setMlEnabled(false);
          setRangeMap({});
          setMlLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [graphId]);

  const getOptionVisuals = (qid, yIdx, optLabel, currentSelectedLabel) => {
    if (optLabel === "Select") {
      return { style: { color: "#666" }, title: "Choose a value" };
    }
    if (!mlEnabled) return {};
    const r = rangeMap?.[qid]?.[yIdx];
    if (!r) return {};
    if (!currentSelectedLabel || currentSelectedLabel === "Select") return {};

    const selScore = labelToScore[currentSelectedLabel];
    const selectionInRange =
      Number.isFinite(selScore) &&
      selScore >= r.lo - 1e-6 &&
      selScore <= r.hi + 1e-6;

    if (selectionInRange) return {};

    const v = labelToScore[optLabel];
    if (!Number.isFinite(v)) return {};
    const optionInRange = v >= r.lo - 1e-6 && v <= r.hi + 1e-6;

    return {
      style: { color: optionInRange ? "#18a558" : "#cc3333" },
      title: optionInRange ? "In suggested range" : "Out of suggested range",
    };
  };

  if (!graphId) {
    router.replace("/forecast");
    return null;
  }

  if (loadingMeta) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600">
        Loading questions…
      </div>
    );
  }

  if (!loading && !questions.length) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-700">
        No scoring questions have been configured for this graph yet.
      </div>
    );
  }

  // Tailwind helper

  // column sizing for year dropdowns
  const yearColMin = 96;
  const yearColMax = 110;

  // ✅ Desktop/tablet: years + Skip column
  const yearGridWithSkipStyle = {
    gridTemplateColumns: `repeat(${years.length}, minmax(${yearColMin}px, ${yearColMax}px)) minmax(${yearColMin}px, ${yearColMax}px)`,
  };

  const yearGridWithSkipClass = "grid items-start gap-x-2 gap-y-2 justify-end";

  const yearGridClass =
    "grid grid-flow-col auto-cols-[96px] sm:auto-cols-[110px] gap-x-2 justify-end overflow-x-auto";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Login logic (kept, hidden) */}
      <div className="hidden">
        <LoginNavButton />
      </div>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="p-4 sm:p-6">
            {/* Desktop: all in one line */}
            <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
              <Image
                src="/images/score_logo.webp"
                alt="Company Logo"
                width={44}
                height={44}
                className="h-15 w-11 rounded-md shadow-sm"
              />

              {/* Desktop title in middle */}
              <div className="hidden sm:block text-center">
                <h1 className="text-xl font-bold leading-tight text-[#12298C] lg:text-3xl">
                  {categoryName ? `${categoryName} – ` : ""}
                  {graphName || "Loading…"}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  Unit Sales Drivers, Ranked in Order of Impact 2025 - 2029
                </p>
              </div>

              <button
                className="inline-flex items-center gap-2 rounded-md bg-[#1D478A] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#1D478A]/40"
                onClick={async () => {
                  if (value < totalPages) swiperRef.current?.slideNext();
                  else await handleSubmit();
                }}
              >
                {value < totalPages ? "Next" : "Submit"}
                <span className="text-base">→</span>
              </button>
            </div>

            {/* Mobile title below (tight, no big empty space) */}
            <div className="mt-2 text-center sm:hidden">
              <h1 className="text-lg font-bold leading-tight text-[#12298C]">
                {categoryName ? `${categoryName} – ` : ""}
                {graphName || "Loading…"}
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-700">
                Unit Sales Drivers, Ranked in Order of Impact 2025 - 2029
              </p>
            </div>

            {/* ML status */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Tag color={mlUsable ? "green" : "default"}>
                ML range guidance: {mlUsable ? "Active" : "Inactive"}
              </Tag>

              <Tooltip
                title={
                  <div style={{ maxWidth: 320, textAlign: "center" }}>
                    <strong>What is this?</strong>
                    <div>
                      When at least two users have submitted non-skipped scores
                      for this graph, we compute typical ranges per
                      question/year. If you pick a value outside that range,
                      we’ll show a gentle warning
                      <em> after you make a selection</em>. We suppress warnings
                      if the range is too tight.
                    </div>
                  </div>
                }
              >
                <Button
                  size="small"
                  type="text"
                  icon={<InfoCircleOutlined />}
                />
              </Tooltip>
            </div>

            {/* Key Drivers / Barriers header */}
            <div className="mt-6">
              <div
                className={[
                  "flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between",
                  isBarrierHeader ? "bg-red-100/80" : "bg-emerald-100/80",
                ].join(" ")}
              >
                <h3
                  className={[
                    "text-lg font-bold sm:text-xl whitespace-nowrap ",
                    isBarrierHeader ? "text-red-900" : "text-[#12298C]",
                  ].join(" ")}
                >
                  {isBarrierHeader ? "KEY BARRIERS" : "KEY DRIVERS"}
                </h3>

                {/* ✅ Desktop/Tablet Year header aligned with dropdown columns */}
                <div className="hidden sm:block w-full overflow-x-auto">
                  <div
                    className={[yearGridWithSkipClass, "min-w-max pb-1"].join(
                      " "
                    )}
                    style={yearGridWithSkipStyle}
                  >
                    {years.map((yr, idx) => (
                      <div
                        key={idx}
                        className={[
                          "text-center text-xs font-semibold sm:text-sm",
                          isBarrierHeader ? "text-red-700" : "text-[#1D478A]",
                        ].join(" ")}
                      >
                        {yr}
                      </div>
                    ))}

                    {/* ✅ Placeholder for Skip column to keep perfect alignment */}
                    <div className="text-center text-xs font-semibold opacity-0 sm:text-sm">
                      Skip
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slides */}
            <div className="mt-4">
              <Swiper
                slidesPerView={1}
                modules={[Navigation]}
                onSwiper={(sw) => (swiperRef.current = sw)}
                onSlideChange={(sw) => setValue(sw.activeIndex + 1)}
                navigation={false}
              >
                {slides.map((slideQs, sIdx) => (
                  <SwiperSlide key={sIdx}>
                    <div className="space-y-3">
                      {slideQs.map((item) => {
                        const gIdx = item.originalIndex;
                        const isBarrier = sIdx >= driversCount;

                        const cardBg = isBarrier
                          ? "bg-[#F5A9A9]"
                          : "bg-[#5EC2A4]";
                        const skipBg = isBarrier
                          ? "bg-[#F5A9A9]"
                          : "bg-[#66C2A5]";

                        const incompleteClass = incompleteFlags[gIdx]
                          ? "border-l-[6px] border-red-500 animate-score-highlight"
                          : "border-l-[6px] border-transparent";
                        return (
                          <div
                            key={gIdx}
                            className={[
                              "w-full rounded-lg px-3 py-3",
                              "grid gap-3 sm:grid-cols-[minmax(260px,1fr),auto] sm:items-center",
                              cardBg,
                              incompleteClass,
                            ].join(" ")}
                          >
                            <div className="w-full sm:flex-1">
                              <p className="m-0 text-sm font-semibold leading-relaxed text-black sm:text-base">
                                {item.text}
                              </p>
                            </div>

                            {/* ✅ Desktop/Tablet layout: same grid as header */}
                            <div className="hidden sm:block w-full overflow-x-auto">
                              <div
                                className={[
                                  yearGridWithSkipClass,
                                  "min-w-max",
                                ].join(" ")}
                                style={yearGridWithSkipStyle}
                              >
                                {years.map((_, yIdx) => {
                                  const sel = selectedValues[gIdx]?.[yIdx];
                                  const opinion =
                                    !sel || sel === "Select" || !mlEnabled
                                      ? null
                                      : isInMlRange(item.id, yIdx, sel);

                                  const borderClass =
                                    opinion === true
                                      ? "border-emerald-600 ring-1 ring-emerald-500/40"
                                      : opinion === false
                                      ? "border-red-500 ring-1 ring-red-500/40"
                                      : "border-slate-300";

                                  return (
                                    <select
                                      key={yIdx}
                                      className={[
                                        "w-full",
                                        "rounded-md bg-white px-2 py-2 text-xs font-bold text-slate-900 shadow-sm",
                                        "border focus:outline-none focus:ring-2 focus:ring-[#1D478A]/30",
                                        "disabled:cursor-not-allowed disabled:opacity-60",
                                        borderClass,
                                      ].join(" ")}
                                      value={sel || "Select"}
                                      disabled={skipFlags[gIdx]}
                                      onChange={(e) => {
                                        const newLabel = e.target.value;

                                        setSelectedValues((sv) => {
                                          const copy = sv.map((arr) => [
                                            ...arr,
                                          ]);
                                          copy[gIdx][yIdx] = newLabel;
                                          return copy;
                                        });

                                        // your ML warning logic 그대로
                                        if (
                                          newLabel !== "Select" &&
                                          mlEnabled
                                        ) {
                                          const r = rangeMap?.[item.id]?.[yIdx];
                                          if (r) {
                                            const v = labelToScore[newLabel];
                                            const inRange =
                                              Number.isFinite(v) &&
                                              v >= r.lo - 1e-6 &&
                                              v <= r.hi + 1e-6;

                                            if (!inRange) {
                                              const key = `${item.id}:${yIdx}`;
                                              if (!warnedRef.current.has(key)) {
                                                warnedRef.current.add(key);
                                                const span =
                                                  rangeToLabelSpan(
                                                    item.id,
                                                    yIdx
                                                  ) || "typical range";
                                                notification.warning({
                                                  message:
                                                    "Out of suggested range",
                                                  description: `Your selection is outside the typical range: ${span}. You can still proceed.`,
                                                  placement: "topRight",
                                                  duration: 8,
                                                });
                                              }
                                            }
                                          }
                                        }
                                      }}
                                    >
                                      <option
                                        value="Select"
                                        style={{ color: "#666" }}
                                      >
                                        Select
                                      </option>
                                      {dropdownOpts.map((opt, oIdx) => {
                                        const visuals = getOptionVisuals(
                                          item.id,
                                          yIdx,
                                          opt,
                                          sel
                                        );
                                        return (
                                          <option
                                            key={oIdx}
                                            value={opt}
                                            style={visuals.style}
                                            title={visuals.title}
                                          >
                                            {opt}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  );
                                })}

                                {/* ✅ Skip in same grid column */}
                                <button
                                  className={[
                                    "inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
                                    "text-slate-900 shadow-sm",
                                    "disabled:cursor-not-allowed disabled:opacity-60",
                                    skipBg,
                                  ].join(" ")}
                                  onClick={() => handleSkip(gIdx)}
                                  disabled={skipFlags[gIdx]}
                                  type="button"
                                >
                                  <span>
                                    {skipFlags[gIdx] ? "Skipped" : "Skip"}
                                  </span>
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M6 4l8 8-8 8V4z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {/* ✅ Mobile layout */}
                            <div className="sm:hidden">
                              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                                {years.map((yr, yIdx) => {
                                  const sel = selectedValues[gIdx]?.[yIdx];

                                  return (
                                    <div
                                      key={yIdx}
                                      className="rounded-md bg-white/70 p-2"
                                    >
                                      <div className="mb-1 text-[11px] font-semibold text-slate-700">
                                        {yr}
                                      </div>

                                      <select
                                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D478A]/30 disabled:cursor-not-allowed disabled:opacity-60"
                                        value={sel || "Select"}
                                        disabled={skipFlags[gIdx]}
                                        onChange={(e) => {
                                          const newLabel = e.target.value;

                                          setSelectedValues((sv) => {
                                            const copy = sv.map((arr) => [
                                              ...arr,
                                            ]);
                                            copy[gIdx][yIdx] = newLabel;
                                            return copy;
                                          });

                                          // ✅ optional: keep your ML warning logic here too if you want
                                        }}
                                      >
                                        <option
                                          value="Select"
                                          style={{ color: "#666" }}
                                        >
                                          Select
                                        </option>

                                        {dropdownOpts.map((opt, oIdx) => (
                                          <option key={oIdx} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>

                              <button
                                className={[
                                  "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
                                  "text-slate-900 shadow-sm",
                                  "disabled:cursor-not-allowed disabled:opacity-60",
                                  skipBg,
                                ].join(" ")}
                                onClick={() => handleSkip(gIdx)}
                                disabled={skipFlags[gIdx]}
                                type="button"
                              >
                                {skipFlags[gIdx]
                                  ? "Skipped"
                                  : "Skip this question"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Note */}
              <div className="mt-5 text-sm leading-relaxed text-slate-800 sm:text-base">
                <span className="font-semibold text-red-600">Note:</span>{" "}
                <span>
                  These questions assess key factors shaping the{" "}
                  <strong>{categoryName || "CV"} industry</strong>, with
                  positive ones highlighting growth drivers and negative ones
                  identifying challenges. Higher impact responses indicate
                  strong market shifts, while lower ones suggest stability. This
                  approach enables better forecasting and strategic planning.
                </span>
              </div>

              {/* Navigation & Progress */}
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex w-full max-w-3xl items-center gap-3">
                  <button
                    className="rounded-md px-2 py-1 text-2xl leading-none text-slate-800 hover:bg-slate-100"
                    onClick={() => swiperRef.current?.slidePrev()}
                    type="button"
                    aria-label="Previous"
                  >
                    ❮
                  </button>

                  <div className="relative h-2 flex-1 rounded-full bg-slate-300">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-[#4683A6] transition-[width] duration-300"
                      style={{ width: `${(value / totalPages) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max={totalPages}
                      value={value}
                      onChange={handleSliderChange}
                      className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
                      aria-label="Slide progress"
                    />
                  </div>

                  <button
                    className="rounded-md px-2 py-1 text-2xl leading-none text-slate-800 hover:bg-slate-100"
                    onClick={() => swiperRef.current?.slideNext()}
                    type="button"
                    aria-label="Next"
                  >
                    ❯
                  </button>
                </div>

                <div className="flex w-full max-w-3xl items-center justify-between">
                  <div className="text-base font-semibold text-[#12298C] sm:text-lg">
                    {value}/{totalPages}
                  </div>

                  <button
                    type="button"
                    onClick={handleSuggestions}
                    className="text-sm font-semibold text-[#1D478A] hover:underline"
                  >
                    Have suggestions?
                  </button>
                </div>
              </div>

              {/* Impact Levels */}
              <div className="mt-10 grid grid-cols-1 gap-6 text-sm text-slate-800 sm:text-base md:grid-cols-3">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    VERY HIGH – Strong influence, directly shaping industry
                    trends.
                  </li>
                  <li>HIGH – Significant influence on market movement.</li>
                  <li>MEDIUM HIGH – Noticeable but not dominant impact.</li>
                </ul>

                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    MEDIUM – Moderate influence, dependent on external factors.
                  </li>
                  <li>MEDIUM LOW – Noticeable but not dominant impact.</li>
                  <li>LOW – Minimal impact on overall industry.</li>
                </ul>

                <ul className="list-disc space-y-2 pl-5">
                  <li>VERY LOW – Negligible or nearly no effect.</li>
                  <li>NO IMPACT – No expected influence on industry trends.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
