"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import { notification, Button, Tag, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import Image from "next/image";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useCurrentPlan } from "../hooks/useCurrentPlan";
import { useRouter, useSearchParams } from "next/navigation";
import LoginNavButton from "../flash-reports/components/Login/LoginAuthButton";
import { useAuthModal } from "@/utils/AuthModalcontext";
import SubscribeButton from "@/components/subscription/SubscribeButton";

const PENDING_BYF_KEY = "pendingByfSubmission";
const PENDING_BYF_TTL_MS = 24 * 60 * 60 * 1000;

const pad2 = (n) => String(n).padStart(2, "0");

const isYYYYMM = (s) => !!s && /^\d{4}-\d{2}$/.test(String(s));

const prettyYYYYMM = (yyyymm) => {
  if (!isYYYYMM(yyyymm)) return String(yyyymm || "");
  const [y, m] = String(yyyymm).split("-").map(Number);
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[(m || 1) - 1]} ${y}`;
};

// Previous calendar month based on Asia/Kolkata (IST) — returns YYYY-MM
const getPrevMonthIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "01");

  const cutoffDay = 5;
  const back = d >= cutoffDay ? 1 : 2;

  let year = y;
  let month = m - back;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
};

// ✅ Country helpers (Flash only)
const normalizeCountry = (v) => {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s || null;
};

const extractCountryFromReturnTo = (returnTo) => {
  try {
    if (!returnTo) return null;
    if (typeof window === "undefined") return null;
    const u = new URL(returnTo, window.location.origin);
    return normalizeCountry(u.searchParams.get("country"));
  } catch {
    return null;
  }
};

export default function ScoreCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const graphId = searchParams.get("graphId");
  const baseMonthParam = searchParams.get("baseMonth");
  const horizonParam = searchParams.get("horizon");
  const returnToParam = searchParams.get("returnTo");

  // ✅ Flash country resolution:
  // 1) score-card?country=peru
  // 2) else from returnTo (flash page url has ?country=peru)
  // 3) else india
  const countryParamRaw = normalizeCountry(searchParams.get("country"));
  const countryFromReturnTo = extractCountryFromReturnTo(returnToParam);
  const flashCountry = countryParamRaw || countryFromReturnTo || "india";

  const { email } = useCurrentPlan();
  const { open: openAuthModal } = useAuthModal();

  // Post-login auto-submit flow (anonymous users) + duplicate detection.
  // 'idle' → form visible.
  // 'checking' → spinner while verifying existing submission.
  // 'submitting' → spinner while POSTing pending payload.
  // 'duplicate-prompt' → card asking Replace vs Keep.
  // 'success-submitted' → card after fresh submission.
  // 'success-kept' → card after user chose Keep previous.
  // 'error' → card with retry / back.
  const [autoFlowState, setAutoFlowState] = useState("idle");
  const [autoFlowError, setAutoFlowError] = useState(null);
  const [pendingPayloadInfo, setPendingPayloadInfo] = useState(null);
  const [existingSubmissionInfo, setExistingSubmissionInfo] = useState(null);

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
  const [horizon, setHorizon] = useState(6);

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
        const gRes = await fetch(
          `/api/graphs?id=${encodeURIComponent(graphId)}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
            cache: "no-store",
          },
        );
        const gJson = await gRes.json();
        const g = gJson?.graph || null;
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
          ? `/api/scoreSettings?key=${encodeURIComponent(key)}&baseMonth=${encodeURIComponent(
              bp,
            )}&horizon=6`
          : `/api/scoreSettings?key=${encodeURIComponent(key)}`;

      // ✅ Questions URL: Flash uses country, Forecast doesn't
      const qUrl =
        context === "flash"
          ? `/api/questions?graphId=${graphId}&country=${encodeURIComponent(
              flashCountry,
            )}`
          : `/api/questions?graphId=${graphId}`;

      const [qRes, sRes] = await Promise.all([
        fetch(qUrl, {
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

      const qListRaw = await qRes.json();
      const qList = Array.isArray(qListRaw) ? qListRaw : [];

      const { yearNames, scoreLabels } = await sRes.json();

      setQuestions(qList);
      setYears(yearNames);
      setDropdownOpts(scoreLabels);

      setSelectedValues(
        qList.map(() => Array(yearNames.length).fill("Select")),
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
  }, [graphId, flashCountry]);

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
  }, [questions, chunkSize]);

  const totalPages = Math.max(1, slides.length);

  const periodLabel = useMemo(() => {
    if (!years?.length) return "";
    const first = years[0];
    const last = years[years.length - 1];
    const pf = isYYYYMM(first) ? prettyYYYYMM(first) : String(first);
    const pl = isYYYYMM(last) ? prettyYYYYMM(last) : String(last);
    return `${pf} - ${pl}`;
  }, [years]);

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
      {},
    );

    const payload = questions.map((q, idx) => ({
      questionId: q.id,
      scores: skipFlags[idx]
        ? []
        : selectedValues[idx].map((lbl) =>
            labelToScore[lbl] != null ? labelToScore[lbl] : null,
          ),
      skipped: skipFlags[idx],
    }));

    // Anonymous user → stash payload + open auth modal. After login the page
    // hard-reloads (LoginForm always reloads); the post-login auto-flow effect
    // below detects the stash, optionally prompts on duplicate, then submits.
    if (!email) {
      try {
        const stash = {
          graphId: Number(graphId),
          basePeriod: basePeriod || null,
          country: graphContext === "flash" ? flashCountry : null,
          payload,
          returnTo: returnToParam || null,
          ts: Date.now(),
        };
        sessionStorage.setItem(PENDING_BYF_KEY, JSON.stringify(stash));
      } catch (e) {
        console.warn("Failed to stash BYF payload:", e);
      }
      notification.info({
        message: "Sign in to submit",
        description:
          "Please log in or sign up. Your scores will be submitted right after you sign in.",
        placement: "topRight",
        duration: 4,
      });
      try {
        openAuthModal?.();
      } catch (e) {
        console.warn("Failed to open auth modal:", e);
      }
      return;
    }

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
          ...(graphContext === "flash" ? { country: flashCountry } : {}),
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

        // Replace silent redirect with the unified success card so logged-in
        // users see the same "Subscribe to see BYF data" CTA as post-login
        // anonymous users. The Back button on the card preserves returnTo.
        try {
          sessionStorage.removeItem(PENDING_BYF_KEY);
        } catch {}
        setAutoFlowState("success-submitted");
        return;
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

  // Submit a previously-stashed (or duplicate-prompt-confirmed) payload using
  // the now-authenticated email. Shared by the auto-flow and the Replace path.
  const submitPendingPayload = async (stash) => {
    if (!stash || !email) return;
    setAutoFlowState("submitting");
    setAutoFlowError(null);
    try {
      const res = await fetch("/api/saveScores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({
          user: email,
          graphId: stash.graphId,
          basePeriod: stash.basePeriod,
          ...(stash.country ? { country: stash.country } : {}),
          results: stash.payload,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Submit failed: ${res.status}`);
      }
      try {
        sessionStorage.removeItem(PENDING_BYF_KEY);
      } catch {}
      setAutoFlowState("success-submitted");
    } catch (err) {
      console.error(err);
      setAutoFlowError(err?.message || "Failed to submit your score.");
      setAutoFlowState("error");
    }
  };

  // Post-login auto-flow: detects pending stash, checks for an existing
  // submission (under the now-authenticated email), and either auto-submits
  // or shows a Replace/Keep prompt. Runs only once per page load (gated by
  // autoFlowState !== 'idle' check + sessionStorage clear on completion).
  useEffect(() => {
    if (!email || !graphId) return;
    // Wait for load() to finish hydrating graphContext + basePeriod from
    // /api/graphs. Otherwise the initial render (graphContext defaults to
    // "forecast") would mismatch a flash-context stash and prematurely clear it.
    if (loading) return;
    if (graphContext === "flash" && !basePeriod) return;
    if (autoFlowState !== "idle") return;

    let raw;
    try {
      raw = sessionStorage.getItem(PENDING_BYF_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let stash;
    try {
      stash = JSON.parse(raw);
    } catch {
      try {
        sessionStorage.removeItem(PENDING_BYF_KEY);
      } catch {}
      return;
    }

    const matchGraph = Number(stash?.graphId) === Number(graphId);
    const matchBase = (stash?.basePeriod || null) === (basePeriod || null);
    const currentCountry = graphContext === "flash" ? flashCountry : null;
    const matchCountry = (stash?.country || null) === currentCountry;
    const fresh =
      stash?.ts && Date.now() - Number(stash.ts) < PENDING_BYF_TTL_MS;

    if (!matchGraph || !matchBase || !matchCountry || !fresh) {
      try {
        sessionStorage.removeItem(PENDING_BYF_KEY);
      } catch {}
      return;
    }

    setPendingPayloadInfo(stash);

    let cancelled = false;
    (async () => {
      setAutoFlowState("checking");
      setAutoFlowError(null);
      try {
        const url = new URL("/api/saveScores", window.location.origin);
        url.searchParams.set("graphId", String(graphId));
        url.searchParams.set("email", email);
        if (basePeriod) url.searchParams.set("basePeriod", basePeriod);
        if (currentCountry) url.searchParams.set("country", currentCountry);

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Existing-check failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const subs = Array.isArray(data?.submissions) ? data.submissions : [];
        if (subs.length > 0) {
          setExistingSubmissionInfo(subs[0]);
          setAutoFlowState("duplicate-prompt");
          return;
        }

        await submitPendingPayload(stash);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setAutoFlowError(
          err?.message || "Could not verify previous submission.",
        );
        setAutoFlowState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, graphId, basePeriod, graphContext, flashCountry, loading]);

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
        Math.max(0, Math.round(score / step)),
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
      Math.min(dropdownOpts.length - 1, Math.floor(r.lo / step + 1e-9)),
    );
    const idxHi = Math.max(
      0,
      Math.min(dropdownOpts.length - 1, Math.ceil(r.hi / step - 1e-9)),
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

  const mlUsable = useMemo(
    () => mlEnabled && Object.keys(rangeMap).length > 0,
    [mlEnabled, rangeMap],
  );

  // ✅ ML guidance: OFF for Flash, ON for Forecast (unchanged)
  useEffect(() => {
    if (!graphId) return;

    // Flash: disable ML guidance completely
    if (graphContext === "flash") {
      setMlEnabled(false);
      setRangeMap({});
      setMlLoaded(true);
      return;
    }

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
          },
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
              Number.isFinite(Number(s.score)),
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
          { cache: "no-store" },
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
  }, [graphId, graphContext]);

  const getOptionVisuals = (qid, yIdx, optLabel, currentSelectedLabel) => {
    if (optLabel === "Select") {
      return { style: { color: "#9CA3AF" }, title: "Choose a value" };
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
      style: { color: optionInRange ? "#34D399" : "#F87171" },
      title: optionInRange ? "In suggested range" : "Out of suggested range",
    };
  };

  if (!graphId) {
    router.replace(returnToParam || "/forecast");
    return null;
  }

  // Auto-flow overlay (post-login pending submit, duplicate prompt, or
  // any successful submission) short-circuits the form. The hidden
  // LoginNavButton mounts the AuthModal, kept in scope so it remains
  // available in case the user opens the login dialog from this overlay.
  if (autoFlowState !== "idle") {
    const heading =
      autoFlowState === "checking"
        ? "Verifying your previous submissions…"
        : autoFlowState === "submitting"
          ? "Submitting your BYF score…"
          : autoFlowState === "duplicate-prompt"
            ? "You already submitted a BYF score"
            : autoFlowState === "success-kept"
              ? "Your previous BYF score is kept"
              : autoFlowState === "success-submitted"
                ? "BYF score submitted"
                : "Something went wrong";

    const isBusy = autoFlowState === "checking" || autoFlowState === "submitting";
    const isSuccess =
      autoFlowState === "success-submitted" || autoFlowState === "success-kept";
    const isDuplicate = autoFlowState === "duplicate-prompt";
    const isError = autoFlowState === "error";

    const formattedExistingDate = (() => {
      const raw = existingSubmissionInfo?.createdAt;
      if (!raw) return null;
      try {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return null;
        return d.toLocaleString();
      } catch {
        return null;
      }
    })();

    return (
      <div className="min-h-screen bg-[#0B1220] text-slate-100">
        <div className="hidden">
          <LoginNavButton />
        </div>

        <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1A2B] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-[600px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

            <div className="relative px-6 py-8 sm:px-8">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-white/10",
                    isSuccess
                      ? "bg-emerald-500/15 text-emerald-300"
                      : isError
                        ? "bg-red-500/15 text-red-300"
                        : isDuplicate
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-blue-500/15 text-blue-300",
                  ].join(" ")}
                  aria-hidden
                >
                  {isBusy ? (
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeOpacity="0.25"
                        strokeWidth="3"
                      />
                      <path
                        d="M22 12a10 10 0 0 1-10 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  ) : isSuccess ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12l5 5L20 7"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : isError ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 8v5m0 3.5h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 9v4m0 3.5h.01M10.3 3.86l-7.5 13A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-3.13l-7.5-13a2 2 0 0 0-3.4 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-slate-50">
                  {heading}
                </h2>
              </div>

              <div className="mt-4 text-sm leading-relaxed text-slate-300">
                {isBusy && (
                  <p>Please wait while we finish processing your BYF score.</p>
                )}

                {isDuplicate && (
                  <>
                    <p>
                      You already have a BYF score for{" "}
                      <span className="font-semibold text-slate-100">
                        {graphName || "this segment"}
                      </span>
                      {basePeriod ? (
                        <>
                          {" "}in{" "}
                          <span className="font-semibold text-slate-100">
                            {prettyYYYYMM(basePeriod)}
                          </span>
                        </>
                      ) : null}
                      .
                    </p>
                    {formattedExistingDate ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Submitted on {formattedExistingDate}.
                      </p>
                    ) : null}
                    <p className="mt-3">
                      Submitting now will replace your previous response. You
                      can also keep what you already submitted.
                    </p>
                  </>
                )}

                {autoFlowState === "success-submitted" && (
                  <p>
                    Your BYF score has been recorded. Subscribe to see your
                    Build-Your-Forecast line on the chart alongside the other
                    forecast methods.
                  </p>
                )}

                {autoFlowState === "success-kept" && (
                  <p>
                    We kept your existing BYF score. Subscribe to see your
                    Build-Your-Forecast line on the chart alongside the other
                    forecast methods.
                  </p>
                )}

                {isError && (
                  <p className="text-red-300">
                    {autoFlowError || "An unexpected error occurred."}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {isDuplicate && (
                  <>
                    <button
                      type="button"
                      onClick={() => submitPendingPayload(pendingPayloadInfo)}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF] shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
                    >
                      Replace previous score
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.removeItem(PENDING_BYF_KEY);
                        } catch {}
                        setAutoFlowState("success-kept");
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Keep previous
                    </button>
                  </>
                )}

                {isSuccess && (
                  <>
                    <SubscribeButton
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF] shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
                    >
                      Subscribe to see BYF data
                    </SubscribeButton>
                    <button
                      type="button"
                      onClick={() => {
                        const target =
                          (pendingPayloadInfo && pendingPayloadInfo.returnTo) ||
                          returnToParam ||
                          "/flash-reports/overview";
                        router.push(target);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Back to Flash Reports
                    </button>
                  </>
                )}

                {isError && (
                  <>
                    {pendingPayloadInfo ? (
                      <button
                        type="button"
                        onClick={() => submitPendingPayload(pendingPayloadInfo)}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF]"
                      >
                        Retry submit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.removeItem(PENDING_BYF_KEY);
                        } catch {}
                        setAutoFlowState("idle");
                        setAutoFlowError(null);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      Back to form
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingMeta) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-300">
        Loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-300">
        Loading questions…
      </div>
    );
  }

  if (!loading && !questions.length) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-200">
        No scoring questions have been configured for this graph yet.
      </div>
    );
  }

  // column sizing for year dropdowns
  const yearColMin = 96;
  const yearColMax = 110;

  const yearGridWithSkipStyle = {
    gridTemplateColumns: `repeat(${years.length}, minmax(${yearColMin}px, ${yearColMax}px)) minmax(${yearColMin}px, ${yearColMax}px)`,
  };

  const yearGridWithSkipClass = "grid items-start gap-x-2 gap-y-2 justify-end";

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100">
      <div className="hidden">
        <LoginNavButton />
      </div>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1A2B] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3">
              <Image
                src="/images/Ri-Logo-Graph-White.webp"
                alt="Company Logo"
                width={44}
                height={44}
                className="h-15 w-11 rounded-md shadow-sm"
              />

              <div className="hidden sm:block text-center">
                <h1 className="text-xl font-bold leading-tight text-slate-50 lg:text-3xl">
                  {graphContext === "flash" ? (
                    graphName || "Loading…"
                  ) : (
                    <>
                      {categoryName ? `${categoryName} – ` : ""}
                      {graphName || "Loading…"}
                    </>
                  )}
                </h1>

                <p className="mt-1 text-sm font-medium text-slate-300">
                  Unit Sales Drivers, Ranked in Order of Impact{" "}
                  {periodLabel || "—"}
                </p>

                {graphContext === "flash" && basePeriod ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Scoring base month:{" "}
                    <span className="font-semibold text-slate-200">
                      {prettyYYYYMM(basePeriod)}
                    </span>
                    . Data updates on the{" "}
                    <span className="font-semibold text-slate-200">5th</span>{" "}
                    (IST).
                  </p>
                ) : null}
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

            <div className="mt-2 text-center sm:hidden">
              <h1 className="text-lg font-bold leading-tight text-slate-50">
                {graphContext === "flash" ? (
                  graphName || "Loading…"
                ) : (
                  <>
                    {categoryName ? `${categoryName} – ` : ""}
                    {graphName || "Loading…"}
                  </>
                )}
              </h1>

              <p className="mt-1 text-xs font-medium text-slate-300">
                Unit Sales Drivers, Ranked in Order of Impact{" "}
                {periodLabel || "—"}
              </p>

              {graphContext === "flash" && basePeriod ? (
                <p className="mt-1 text-[11px] text-slate-400">
                  Scoring base month:{" "}
                  <span className="font-semibold text-slate-200">
                    {prettyYYYYMM(basePeriod)}
                  </span>{" "}
                  ({basePeriod}). Data updates on the{" "}
                  <span className="font-semibold text-slate-200">5th</span>{" "}
                  (IST).
                </p>
              ) : null}
            </div>

            {/* ML status (will show Inactive for Flash) */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Tag
                color={mlUsable ? "green" : "default"}
                style={{
                  background: "rgba(17, 24, 39, 0.6)",
                  borderColor: "rgba(148, 163, 184, 0.25)",
                  color: "rgba(226, 232, 240, 0.95)",
                }}
              >
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
                      we’ll show a gentle warning{" "}
                      <em>after you make a selection</em>. We suppress warnings
                      if the range is too tight.
                    </div>
                  </div>
                }
              >
                <Button
                  size="small"
                  type="text"
                  icon={
                    <InfoCircleOutlined
                      style={{ color: "rgba(226,232,240,0.85)" }}
                    />
                  }
                />
              </Tooltip>
            </div>

            {/* Key Drivers / Barriers header */}
            <div className="mt-6">
              <div
                className={[
                  "flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between",
                  isBarrierHeader
                    ? "bg-red-500/10 ring-1 ring-red-400/20"
                    : "bg-emerald-500/10 ring-1 ring-emerald-400/20",
                ].join(" ")}
              >
                <h3
                  className={[
                    "text-lg font-bold sm:text-xl whitespace-nowrap",
                    isBarrierHeader ? "text-red-200" : "text-emerald-200",
                  ].join(" ")}
                >
                  {isBarrierHeader ? "KEY BARRIERS" : "KEY DRIVERS"}
                </h3>

                <div className="hidden sm:block w-full overflow-x-auto">
                  <div
                    className={[yearGridWithSkipClass, "min-w-max pb-1"].join(
                      " ",
                    )}
                    style={yearGridWithSkipStyle}
                  >
                    {years.map((yr, idx) => (
                      <div
                        key={idx}
                        className={[
                          "text-center text-xs font-semibold sm:text-sm",
                          isBarrierHeader
                            ? "text-red-200/80"
                            : "text-emerald-200/80",
                        ].join(" ")}
                      >
                        {yr}
                      </div>
                    ))}
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
                          ? "bg-[#121B2D] ring-1 ring-red-400/15"
                          : "bg-[#121B2D] ring-1 ring-emerald-400/15";

                        const headerStripe = isBarrier
                          ? "bg-red-500/15"
                          : "bg-emerald-500/15";

                        const skipBg = isBarrier
                          ? "bg-red-500/15 hover:bg-red-500/20"
                          : "bg-emerald-500/15 hover:bg-emerald-500/20";

                        const incompleteClass = incompleteFlags[gIdx]
                          ? "border-l-[6px] border-red-500 animate-score-highlight"
                          : "border-l-[6px] border-transparent";

                        return (
                          <div
                            key={gIdx}
                            className={[
                              "w-full rounded-xl px-3 py-3",
                              "grid gap-3 sm:grid-cols-[minmax(260px,1fr),auto] sm:items-center",
                              cardBg,
                              incompleteClass,
                            ].join(" ")}
                          >
                            <div className="w-full sm:flex-1">
                              <div
                                className={[
                                  "mb-2 h-1.5 w-16 rounded-full",
                                  headerStripe,
                                ].join(" ")}
                              />
                              <p className="m-0 text-sm font-semibold leading-relaxed text-slate-100 sm:text-base">
                                {item.text}
                              </p>
                            </div>

                            {/* Desktop/Tablet layout */}
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
                                      ? "border-emerald-400 ring-1 ring-emerald-400/30"
                                      : opinion === false
                                        ? "border-red-400 ring-1 ring-red-400/30"
                                        : "border-slate-700";

                                  return (
                                    <select
                                      key={yIdx}
                                      className={[
                                        "w-full",
                                        "rounded-md bg-[#0B1220] px-2 py-2 text-xs font-bold text-slate-100 shadow-sm",
                                        "border focus:outline-none focus:ring-2 focus:ring-[#1D478A]/40",
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
                                                    yIdx,
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
                                        style={{ color: "#9CA3AF" }}
                                      >
                                        Select
                                      </option>
                                      {dropdownOpts.map((opt, oIdx) => {
                                        const visuals = getOptionVisuals(
                                          item.id,
                                          yIdx,
                                          opt,
                                          sel,
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

                                <button
                                  className={[
                                    "inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
                                    "text-slate-100 shadow-sm ring-1 ring-white/10",
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

                            {/* Mobile layout */}
                            <div className="sm:hidden">
                              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                                {years.map((yr, yIdx) => {
                                  const sel = selectedValues[gIdx]?.[yIdx];

                                  return (
                                    <div
                                      key={yIdx}
                                      className="rounded-md bg-[#0B1220] ring-1 ring-white/10 p-2"
                                    >
                                      <div className="mb-1 text-[11px] font-semibold text-slate-300">
                                        {yr}
                                      </div>

                                      <select
                                        className="w-full rounded-md border border-slate-700 bg-[#0B1220] px-2 py-2 text-xs font-bold text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D478A]/40 disabled:cursor-not-allowed disabled:opacity-60"
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
                                        }}
                                      >
                                        <option
                                          value="Select"
                                          style={{ color: "#9CA3AF" }}
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
                                  "text-slate-100 shadow-sm ring-1 ring-white/10",
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
              <div className="mt-5 rounded-xl bg-[#0B1220] ring-1 ring-white/10 px-4 py-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                <span className="font-semibold text-red-300">Note:</span>{" "}
                {graphContext === "flash" ? (
                  <span>
                    These questions assess key factors shaping{" "}
                    <strong className="text-slate-50">
                      {graphName || "this graph"}
                    </strong>
                    , with positive ones highlighting growth drivers and
                    negative ones identifying challenges. Higher impact
                    responses indicate strong market shifts, while lower ones
                    suggest stability.
                  </span>
                ) : (
                  <span>
                    These questions assess key factors shaping the{" "}
                    <strong className="text-slate-50">
                      {categoryName || "CV"} industry
                    </strong>
                    , with positive ones highlighting growth drivers and
                    negative ones identifying challenges. Higher impact
                    responses indicate strong market shifts, while lower ones
                    suggest stability. This approach enables better forecasting
                    and strategic planning.
                  </span>
                )}
              </div>

              {/* Navigation & Progress */}
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex w-full max-w-3xl items-center gap-3">
                  <button
                    className="rounded-md px-2 py-1 text-2xl leading-none text-slate-200 hover:bg-white/5"
                    onClick={() => swiperRef.current?.slidePrev()}
                    type="button"
                    aria-label="Previous"
                  >
                    ❮
                  </button>

                  <div className="relative h-2 flex-1 rounded-full bg-white/10">
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
                    className="rounded-md px-2 py-1 text-2xl leading-none text-slate-200 hover:bg-white/5"
                    onClick={() => swiperRef.current?.slideNext()}
                    type="button"
                    aria-label="Next"
                  >
                    ❯
                  </button>
                </div>

                <div className="flex w-full max-w-3xl items-center justify-between">
                  <div className="text-base font-semibold text-slate-100 sm:text-lg">
                    {value}/{totalPages}
                  </div>

                  <button
                    type="button"
                    onClick={handleSuggestions}
                    className="text-sm font-semibold text-[#7CB0FF] hover:underline"
                  >
                    Have suggestions?
                  </button>
                </div>
              </div>

              {/* Impact Levels */}
              <div className="mt-10 grid grid-cols-1 gap-6 text-sm text-slate-200 sm:text-base md:grid-cols-3">
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

        <div className="h-6" />
      </div>
    </div>
  );
}
