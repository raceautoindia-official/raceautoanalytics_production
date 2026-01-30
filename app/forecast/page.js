// File: app/forecast/page.js
"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Brush,
  Rectangle,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { FaClipboardList, FaBolt } from "react-icons/fa";
// import "./forecast.css";
import GlobalStyles from "./GlobalStyles";
import Footer from "./Footer";
// Hook for linear regression forecast
import { useLinearRegressionForecast } from "../hooks/LinearRegressionForecast";
// Hook for score based forecast
import { useForecastGrowth } from "../hooks/useForecastGrowth";
import { useAverageYearlyScores } from "../hooks/useAverageYearlyScores";
import { useCurrentPlan } from "../hooks/useCurrentPlan";
import LoginNavButton from "../flash-reports/components/Login/LoginAuthButton";

export default function ForecastPage() {
  const { planName, email, loading: planLoading } = useCurrentPlan();
  const router = useRouter();

  // ─── Mobile detection (simple + reliable) ─────────────────────────────
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640); // Tailwind sm breakpoint
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Shared chart sizing
  const chartHeight = isMobile ? 300 : 400;

  // Shared axis ticks
  const xTick = {
    fill: "rgba(255,255,255,0.7)",
    fontSize: isMobile ? 10 : 12,
  };

  const yTick = {
    fill: "#FFC107",
    fontSize: isMobile ? 10 : 12,
  };

  const chartMarginLine = isMobile
    ? { top: 10, right: 10, bottom: 44, left: 0 }
    : { top: 20, right: 20, bottom: 0, left: 10 };

  const chartMarginBar = isMobile
    ? { top: 10, right: 10, bottom: 54, left: 10 }
    : { top: 20, right: 20, bottom: 20, left: 30 };

  // ─── UI state ─────────────────────────────────────────────────────
  const [isLogoHover, setLogoHover] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [openRegion, setOpenRegion] = useState(false);
  const [openGraph, setOpenGraph] = useState(false);

  const categoryRef = React.useRef(null);
  const regionRef = React.useRef(null);
  const graphRef = React.useRef(null);

  const [loading, setLoading] = useState(false);
  const [mountLoginNav, setMountLoginNav] = useState(false);
  const [exclusiveOpen, setExclusiveOpen] = useState(false);
  const exclusiveRef = React.useRef(null);

  useEffect(() => {
    const inside = (ref, target) =>
      ref?.current && ref.current.contains(target);

    const onDoc = (e) => {
      const t = e.target;

      // If click is inside any dropdown area, do nothing
      if (
        inside(exclusiveRef, t) ||
        inside(categoryRef, t) ||
        inside(regionRef, t) ||
        inside(graphRef, t)
      ) {
        return;
      }

      // Otherwise close all
      setExclusiveOpen(false);
      setOpenCategory(false);
      setOpenRegion(false);
      setOpenGraph(false);
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);

    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  // ─── fetched data ─────────────────────────────────────────────────
  const [graphs, setGraphs] = useState([]);
  const [volumeDataMap, setVolumeDataMap] = useState({});
  const [hierarchyMap, setHierarchyMap] = useState({});
  const [contentHierarchyNodes, setContentHierarchyNodes] = useState([]);
  const [scoreSettings, setScoreSettings] = useState({ yearNames: [] });
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [userSubmissions, setUserSubmissions] = useState([]);

  // ─── user selections ─────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [selectedGraphId, setSelectedGraphId] = useState(null);

  // ─── track which regions are expanded ─────────────────────────────────
  const [openRegions, setOpenRegions] = useState({});

  //user country selection
  const [userCountry, setUserCountry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [countries, setCountries] = useState([]);
  const [chosenCountry, setChosenCountry] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  //admin access
  // ─── Add these just below your other useState calls ─────────────────
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  let pressTimer = null;

  useEffect(() => {
    if (planLoading || !email) return;
    // 1) load user‐country
    fetch(`/api/user-country?email=${encodeURIComponent(email)}`)
      .then((res) => {
        if (res.status === 404 && planName !== "silver") {
          setModalOpen(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUserCountry(data);
          setChosenCountry(data.country_id);
        }
      })
      .catch(console.error);

    // 2) load list of available countries
    fetch("/api/availableCountries")
      .then((res) => res.json())
      .then(setCountries)
      .catch(console.error);
  }, [planLoading, email]);

  useEffect(() => {
    if (!email || !userCountry) return;
    fetch("/api/user-country", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        plan_name: planName,
        country_id: userCountry.country_id,
      }),
    }).catch(console.error);
  }, [planName, email, userCountry]);

  // just after your existing useState calls
  const chosenCountryName = useMemo(() => {
    const country = countries.find((c) => c.id === chosenCountry);
    return country ? country.name : "";
  }, [countries, chosenCountry]);

  // ─── Fetch all needed data once ─────────────────────────────────────
  useEffect(() => {
    // Only Forecast graphs belong on the Forecast page.
    // (Flash graphs are maintained separately under the Flash Reports CMS tab.)
    fetch("/api/graphs?context=forecast", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
      },
    })
      .then((r) => r.json())
      .then(setGraphs)
      .catch(console.error);

    fetch("/api/volumeData", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
      },
    })
      .then((r) => r.json())
      .then((arr) => {
        const m = {};
        arr.forEach((d) => {
          const cleanData = Object.fromEntries(
            Object.entries(d.data)
              .filter(
                ([region, years]) =>
                  region != null && Object.keys(years).length,
              )
              .map(([region, years]) => [
                region,
                Object.fromEntries(
                  Object.entries(years).map(([yr, val]) => [
                    yr,
                    Number(String(val).replace(/,/g, "")) || 0,
                  ]),
                ),
              ]),
          );
          m[d.id] = { ...d, data: cleanData };
        });
        setVolumeDataMap(m);
      })
      .catch(console.error);

    // fetch contentHierarchy (nodes include id, name, parent_id)
    fetch("/api/contentHierarchy", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
      },
    })
      .then((r) => r.json())
      .then((arr) => {
        setContentHierarchyNodes(arr);
        // build id→name map
        const m = {};
        arr.forEach((node) => {
          m[node.id] = node.name;
        });
        setHierarchyMap(m);
      })
      .catch(console.error);

    fetch("/api/scoreSettings", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
      },
    })
      .then((r) => r.json())
      .then((data) => setScoreSettings(data))
      .catch(console.error);

    // pull in the submissions, questions & settings so we can compute averages
    // Promise.all([
    //   fetch("/api/saveScores", {
    //     headers: {
    //       Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
    //     },
    //   }),
    //   fetch("/api/questions", {
    //     headers: {
    //       Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
    //     },
    //   }),
    //   fetch("/api/scoreSettings", {
    //     headers: {
    //       Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
    //     },
    //   }),
    // ])
    //   .then(async ([subRes, qRes, sRes]) => {
    //     if (!subRes.ok || !qRes.ok || !sRes.ok) throw new Error();
    //     const { submissions: rawSubs } = await subRes.json();
    //     const questions = await qRes.json();
    //     const { yearNames } = await sRes.json();

    //     // build posAttrs, negAttrs & weights
    //     const posAttrs = [],
    //       negAttrs = [],
    //       weights = {};
    //     questions.forEach((q) => {
    //       const key = String(q.id);
    //       weights[key] = Number(q.weight) || 0;
    //       const attr = { key, label: q.text };
    //       q.type === "positive" ? posAttrs.push(attr) : negAttrs.push(attr);
    //     });

    //     // enrich submissions with posScores/negScores
    //     const enriched = rawSubs.map((sub) => {
    //       const posScores = {},
    //         negScores = {};
    //       posAttrs.forEach(
    //         (a) => (posScores[a.key] = Array(yearNames.length).fill(0))
    //       );
    //       negAttrs.forEach(
    //         (a) => (negScores[a.key] = Array(yearNames.length).fill(0))
    //       );
    //       sub.scores.forEach(({ questionId, yearIndex, score, skipped }) => {
    //         if (skipped) return;
    //         const k = String(questionId);
    //         if (posScores[k]) posScores[k][yearIndex] = score;
    //         if (negScores[k]) negScores[k][yearIndex] = score;
    //       });
    //       return {
    //         id: sub.id,
    //         createdAt: sub.createdAt,
    //         posAttributes: posAttrs,
    //         negAttributes: negAttrs,
    //         posScores,
    //         negScores,
    //         weights,
    //         yearNames,
    //       };
    //     });

    //     setSubmissions(enriched);
    //     setLoading(false);
    //   })
    //   .catch(console.error);
  }, []);

  // ─── Fetch questions, submissions & scoreSettings for the selected graph ─────────────────
  // ─── Fetch both “all users” and “this user” submissions ─────────────────
  useEffect(() => {
    if (!selectedGraphId || !email) return;
    setLoading(true);

    const authHeader = {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
    };

    Promise.all([
      fetch(`/api/questions?graphId=${selectedGraphId}`, {
        headers: authHeader,
      }),
      fetch(`/api/saveScores?graphId=${selectedGraphId}`, {
        headers: authHeader,
      }),
      fetch(
        `/api/saveScores?graphId=${selectedGraphId}&email=${encodeURIComponent(
          email,
        )}`,
        { headers: authHeader },
      ),
      fetch("/api/scoreSettings", { headers: authHeader }),
    ])
      .then(async ([qRes, allRes, userRes, sRes]) => {
        if (!qRes.ok || !allRes.ok || !userRes.ok || !sRes.ok)
          throw new Error();

        // 1) questions
        const qs = await qRes.json();
        setQuestions(qs);

        // 2) raw submissions
        const { submissions: rawAll } = await allRes.json();
        const { submissions: rawUser } = await userRes.json();

        // 3) scoreSettings
        const { yearNames } = await sRes.json();

        // ─── build posAttrs/negAttrs + weights ─────────────────
        const posAttrs = [],
          negAttrs = [],
          weights = {};
        qs.forEach((q) => {
          const key = String(q.id);
          weights[key] = Number(q.weight) || 0;
          (q.type === "positive" ? posAttrs : negAttrs).push({
            key,
            label: q.text,
          });
        });

        // ─── helper to enrich raw subs ──────────────────────────
        const enrich = (rawSubs) =>
          rawSubs.map((sub) => {
            const posScores = {},
              negScores = {};
            posAttrs.forEach(
              (a) => (posScores[a.key] = Array(yearNames.length).fill(0)),
            );
            negAttrs.forEach(
              (a) => (negScores[a.key] = Array(yearNames.length).fill(0)),
            );
            sub.scores.forEach(({ questionId, yearIndex, score, skipped }) => {
              if (!skipped) {
                const k = String(questionId);
                if (posScores[k] !== undefined) posScores[k][yearIndex] = score;
                if (negScores[k] !== undefined) negScores[k][yearIndex] = score;
              }
            });
            return {
              ...sub,
              posAttributes: posAttrs,
              negAttributes: negAttrs,
              posScores,
              negScores,
              weights,
              yearNames,
            };
          });

        setSubmissions(enrich(rawAll)); // for survey-based AVG
        setUserSubmissions(enrich(rawUser)); // for BYF

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedGraphId, email]);

  // ─── Compute “categories → regions → countries” from contentHierarchyNodes ─
  // Replace <YOUR_PARENT_ID> with actual parent node ID from backend
  const ROOT_PARENT_ID = "76";

  // 1) Categories = nodes whose parent_id === ROOT_PARENT_ID
  const categories = useMemo(() => {
    return contentHierarchyNodes.filter(
      (node) => node.parent_id == ROOT_PARENT_ID,
    );
  }, [contentHierarchyNodes]);

  // 2) Regions = children of selectedCategoryId
  const regions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return contentHierarchyNodes.filter(
      (node) => node.parent_id === selectedCategoryId,
    );
  }, [contentHierarchyNodes, selectedCategoryId]);

  // 3) All Regions–level node (name “All Regions”)
  const allRegionsNode = useMemo(() => {
    if (!selectedCategoryId) return null;
    return (
      contentHierarchyNodes.find(
        (node) =>
          node.parent_id === selectedCategoryId && node.name === "All Regions",
      ) || null
    );
  }, [contentHierarchyNodes, selectedCategoryId]);

  // 4) Actual “displayable” regions = filter out the “All Regions” node
  const displayRegions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return regions.filter((r) => r.id !== (allRegionsNode?.id ?? -1));
  }, [regions, allRegionsNode]);

  // 5) Countries grouped by region ID
  const countriesByRegion = useMemo(() => {
    const lookup = {};
    displayRegions.forEach((region) => {
      lookup[region.id] = contentHierarchyNodes.filter(
        (node) => node.parent_id === region.id,
      );
    });
    return lookup;
  }, [contentHierarchyNodes, displayRegions]);

  // ─── 5.1) Flatten out all the “country” leaf nodes ─────────────────
  const allCountryNodes = useMemo(() => {
    // displayRegions are your region-level nodes:
    return displayRegions.flatMap((region) =>
      contentHierarchyNodes.filter((node) => node.parent_id === region.id),
    );
  }, [displayRegions, contentHierarchyNodes]);

  // if Silver, drop any selectedCategoryId ≥ index 2
  useEffect(() => {
    const isGoldOrPlat = planName === "gold" || planName === "platinum";
    if (!isGoldOrPlat) return;
    if (!chosenCountryName || !allCountryNodes.length) return;

    // ✅ Do NOT override if user already selected something (like All Regions)
    if (selectedRegionId != null) return;

    const match = allCountryNodes.find(
      (node) => node.name === chosenCountryName,
    );
    if (match) setSelectedRegionId(match.id);
  }, [planName, chosenCountryName, allCountryNodes, selectedRegionId]);

  // 6) All country IDs under all regions
  const allCountryIds = useMemo(() => {
    return displayRegions.flatMap((region) =>
      contentHierarchyNodes
        .filter((node) => node.parent_id === region.id)
        .map((node) => node.id),
    );
  }, [contentHierarchyNodes, displayRegions]);

  // ─── 7) IDs of direct children under the “All Regions” node ─────────────
  const allRegionsChildrenIds = useMemo(() => {
    if (!allRegionsNode) return [];
    return contentHierarchyNodes
      .filter((node) => node.parent_id === allRegionsNode.id)
      .map((node) => node.id);
  }, [contentHierarchyNodes, allRegionsNode]);

  //Auto-select that country for Gold & Platinum
  useEffect(() => {
    // Only for gold/platinum, once we know the modal‐chosen name + allCountryNodes
    if (
      (planName === "gold" || planName === "platinum") &&
      chosenCountryName &&
      allCountryNodes.length
    ) {
      const match = allCountryNodes.find(
        (node) => node.name === chosenCountryName,
      );
      if (match) {
        // match.id is the contentHierarchy ID of the country leaf node
        setSelectedRegionId(match.id);
      }
    }
  }, [planName, chosenCountryName, allCountryNodes]);

  // ─── Derive selectedCountriesList based on selectedRegionId ───────────────
  const selectedCountriesList = useMemo(() => {
    if (!selectedRegionId) return [];
    if (allRegionsNode && selectedRegionId === allRegionsNode.id) {
      // “All Regions” selected → only its direct children
      return allRegionsChildrenIds;
    }
    // Otherwise, a single country ID
    return [selectedRegionId];
  }, [selectedRegionId, allRegionsNode, allCountryIds]);

  // ─── Available graphs filtered by selectedCountriesList ──────────────────
  const availableGraphs = useMemo(() => {
    if (!selectedCountriesList.length) return [];
    return graphs.filter((g) => {
      // Normalize dataset_ids into an array:
      const dsIds = Array.isArray(g.dataset_ids)
        ? g.dataset_ids
        : [g.dataset_ids];
      return dsIds.some((dsId) => {
        const ds = volumeDataMap[dsId];
        if (!ds?.stream) return false;
        const parts = ds.stream.split(",").map((n) => parseInt(n, 10));
        return parts.some((part) => selectedCountriesList.includes(part));
      });
    });
  }, [graphs, volumeDataMap, selectedCountriesList, selectedRegionId]);

  // use effect for default selection
  useEffect(() => {
    if (selectedRegionId) {
      setSelectedGraphId(availableGraphs[0]?.id);
    }
    if (selectedCategoryId != null) return;
    if (!contentHierarchyNodes.length || !graphs.length) return;

    // 1) find your commercial category
    const commCat = contentHierarchyNodes.find(
      (n) => n.name === "Commercial Vehicles",
    );
    console.log("comCat", commCat);
    if (!commCat) return;

    // 2) find its “All Regions” child
    const allReg = contentHierarchyNodes.find(
      (n) => n.parent_id === commCat.id && n.name === "All Regions",
    );
    console.log("allReg", allReg);
    if (!allReg) return;

    // 4) set category and region
    setSelectedCategoryId(commCat.id);
    setSelectedRegionId(allReg.id);

    console.log("available graphs", availableGraphs);
    // 3) find your default graph
    const defaultGraph = availableGraphs.find(
      (g) => g.name === "Overall Commercial Vehicle Sales Trend Analysis",
    );
    console.log("defaultGraph", defaultGraph);
    if (!defaultGraph) return;

    console.log("we have reached the end");

    //set graph
    setSelectedGraphId(defaultGraph.id);
  }, [contentHierarchyNodes, availableGraphs, graphs, selectedCategoryId]);

  const selectedDataset = useMemo(() => {
    if (!selectedGraphId) return null;

    // 1) find the graph object the user selected
    const graph = graphs.find((g) => g.id === selectedGraphId);
    if (!graph) return null;

    // 2) Normalize `graph.dataset_ids` into an array
    const dsIds = Array.isArray(graph.dataset_ids)
      ? graph.dataset_ids
      : [graph.dataset_ids];

    // 3) Always take the first one
    const firstDsId = dsIds[0];
    return volumeDataMap[firstDsId] || null;
  }, [selectedGraphId, graphs, volumeDataMap]);

  // ─── Build chartData from selectedDataset ────────────────
  const chartData = useMemo(() => {
    if (!selectedDataset?.data) return [];
    const data = selectedDataset.data;
    console.log("data", data);

    // Take the very first key in data (no filtering by selectedCountriesList)
    const firstKey = Object.keys(data)[0];
    if (!firstKey) return [];

    // That firstKey’s value is an object like { "2019": 119018, "2020": 102203, … }
    const series = data[firstKey];

    // Sort the years and build one row per year
    const years = Object.keys(series).sort();
    return years.map((year) => ({
      year,
      [firstKey]: series[year] ?? 0,
    }));
  }, [selectedDataset]);

  // ─── Build barChartData for stacked bars ─────────────────────────────
  const barChartData = useMemo(() => {
    if (!selectedDataset?.data) return [];
    const segments = Object.keys(selectedDataset.data); // e.g. ["2WD …", "4WD …", …]
    // assume every segment has the same years
    const years = Object.keys(selectedDataset.data[segments[0]]).sort();
    return years.map((year) => {
      const row = { year };
      segments.forEach((seg) => {
        row[seg] = selectedDataset.data[seg][year] ?? 0;
      });
      return row;
    });
  }, [selectedDataset]);

  // ─── Build pieData ────────────────────────────────────
  const pieData = useMemo(() => {
    if (!selectedDataset?.data?.data) return [];
    const yearData = selectedDataset.data.data;

    return Object.entries(yearData).map(([year, value]) => ({
      name: year,
      value: value,
    }));
  }, [selectedDataset]);

  // ─── Aggregate historical volumes (sum across selected countries per year) ─
  const historicalVolumes = useMemo(() => {
    return chartData.map((row) => row.data || 0);
  }, [chartData]);

  // ─── Only run survey-based hooks when we actually have questions & submissions
  const hasData = questions.length > 0 && submissions.length > 0;

  // ─── Compute average scores per year from submissions ──────────────────────
  const { yearNames: scoreYearNamesAll, averages: avgScoresAll } =
    useAverageYearlyScores(submissions);
  const avgScoreValuesAll = avgScoresAll.map((a) => Number(a.avg));

  // ─── down near your other forecasts ───────────────────────────────────────
  const { averages: avgByf } = useAverageYearlyScores(userSubmissions);
  const byfValues = avgByf.map((a) => Number(a.avg));
  const forecastDataByf = useForecastGrowth(historicalVolumes, byfValues);
  const hasByf = forecastDataByf.length > 0;

  // ─── Forecast data (linear regression) ────────────────────────────────────
  const forecastDataLR = useLinearRegressionForecast(
    historicalVolumes,
    scoreSettings.yearNames || [],
  );

  // ─── Forecast data (survey‐based) ─────────────────────────────────────────
  const forecastDataScoreAll = useForecastGrowth(
    historicalVolumes,
    avgScoreValuesAll,
  );

  // 3) then gate their outputs behind hasData
  const scoreYearNames = hasData ? scoreYearNamesAll : [];
  // const avgScores      = hasData ? avgScoresAll      : [];
  // const avgScoreValues = hasData
  //   ? avgScoreValuesAll
  //   : [];
  const forecastDataScore = hasData ? forecastDataScoreAll : [];

  // ─── Combine historical + linear forecast ─────────────────────────────────
  const combinedData = useMemo(() => {
    // console.log("chartdata ", chartData);
    if (!chartData.length) return [];
    const hist = historicalVolumes.map((v, i) => ({
      year: Number(chartData[i].year),
      value: v,
      forecastVolume: null,
    }));
    if (hist.length) {
      hist[hist.length - 1].forecastVolume = hist[hist.length - 1].value;
    }
    const fc = (forecastDataLR || []).map((pt, i) => ({
      year: Number(scoreSettings.yearNames[i]),
      value: null,
      forecastVolume: pt.forecastVolume,
    }));
    return [...hist, ...fc];
  }, [historicalVolumes, forecastDataLR, chartData, scoreSettings.yearNames]);

  // ─── Combine historical + score‐based forecast ────────────────────────────
  const combinedDataScore = useMemo(() => {
    if (!chartData.length) return [];
    const hist = historicalVolumes.map((v, i) => ({
      year: Number(chartData[i].year),
      value: v,
      forecastVolume: null,
    }));
    if (hist.length) {
      hist[hist.length - 1].forecastVolume = hist[hist.length - 1].value;
    }
    const fc = forecastDataScore.map((pt, i) => ({
      year: Number(scoreYearNames[i]),
      value: null,
      forecastVolume: pt?.forecastVolume,
    }));
    return [...hist, ...fc];
  }, [chartData, historicalVolumes, forecastDataScore, scoreYearNames]);

  //Selected Graph initialization
  const selectedGraph = graphs.find((g) => g.id === selectedGraphId);
  const { ai_forecast: aiForecast = {}, race_forecast: raceForecast = {} } =
    selectedGraph || {};

  // ─── Determine which forecast types we actually have ─────────────────────
  const hasLinear = selectedGraph?.forecast_types?.includes("linear");
  const hasScore = selectedGraph?.forecast_types?.includes("score") && hasData;
  const hasAI =
    selectedGraph && Object.keys(selectedGraph.ai_forecast || {}).length > 0;
  const hasRace =
    selectedGraph && Object.keys(selectedGraph.race_forecast || {}).length > 0;

  // If there’s more than one of them, we need the “unified” bothData array.
  const forecastCount = [hasLinear, hasScore, hasAI, hasRace].filter(
    Boolean,
  ).length;

  // right after you destructure aiForecast & raceForecast
  const bothData = useMemo(() => {
    if (!chartData.length) return [];

    // 1) build the historical rows
    const hist = chartData.map((row, i) => ({
      year: Number(row.year),
      value: historicalVolumes[i],
      forecastLinear: null,
      forecastScore: null,
      forecastAI: null,
      forecastRace: null,
      forecastByf: null, // ← new
    }));

    // 2) carry last actual value into the “0th” forecast point
    if (hist.length) {
      const last = hist[hist.length - 1];
      last.forecastLinear = last.value;
      last.forecastScore = last.value;
      last.forecastAI = last.value;
      last.forecastRace = last.value;
      last.forecastByf = last.value; // ← carry into the 0th BYF point
    }

    // 3) single unified slice for all forecasts
    const fc = (scoreSettings.yearNames || []).map((yr, i) => ({
      year: Number(yr),
      value: null,
      forecastLinear: forecastDataLR[i]?.forecastVolume ?? null,
      forecastScore: forecastDataScore[i]?.forecastVolume ?? null,
      forecastAI: aiForecast[yr] ?? null,
      forecastRace: raceForecast[yr] ?? null,
      forecastByf: forecastDataByf[i]?.forecastVolume ?? null, // ← new
    }));

    return [...hist, ...fc];
  }, [
    chartData,
    historicalVolumes,
    forecastDataLR,
    forecastDataScore,
    scoreSettings.yearNames,
    aiForecast,
    raceForecast,
    forecastDataByf,
  ]);

  // ─── Build the final array we feed into the chart ────────────────────────
  let dataToPlot;
  if (forecastCount > 1) {
    dataToPlot = bothData;
  } else if (hasLinear) {
    dataToPlot = combinedData;
  } else if (hasScore) {
    dataToPlot = combinedDataScore;
  } else {
    dataToPlot = chartData;
  }

  // ─── Compute CAGR‐style growth for each series ──────────────────────────
  const growthRates = useMemo(() => {
    const histCount = chartData.length;
    if (!bothData.length || histCount < 2) return {};

    // 1) Compute historical CAGR
    const firstHist = historicalVolumes[0];
    const lastHist = historicalVolumes[histCount - 1];
    const periodsHist = histCount - 1;

    const calcCAGR = (start, end, periods) =>
      start != null && end != null && periods > 0
        ? (Math.pow(end / start, 1 / periods) - 1) * 100
        : null;

    const historical = calcCAGR(firstHist, lastHist, periodsHist);

    // 2) Now slice off the unified forecast block
    const fc = bothData.slice(histCount);
    if (fc.length < 2) {
      return { historical };
    }

    const firstFc = fc[0];
    const lastFc = fc[fc.length - 1];
    const periodsFc = fc.length - 1;

    return {
      historical,
      linear: calcCAGR(
        firstFc.forecastLinear,
        lastFc.forecastLinear,
        periodsFc,
      ),
      score: calcCAGR(firstFc.forecastScore, lastFc.forecastScore, periodsFc),
      ai: calcCAGR(firstFc.forecastAI, lastFc.forecastAI, periodsFc),
      race: calcCAGR(firstFc.forecastRace, lastFc.forecastRace, periodsFc),
    };
  }, [bothData, chartData.length, historicalVolumes]);

  // ─── Color palette ─────────────────────────────────────────────────────────
  const PALETTE = [
    { light: "#15AFE4", dark: "#0D7AAB" },
    { light: "#FFC107", dark: "#B38600" },
    { light: "#23DD1D", dark: "#149A11" },
    { light: "#38CCD4", dark: "#1F7F84" },
    { light: "#A17CFF", dark: "#5E3DBD" },
    { light: "#FF8A65", dark: "#C75B39" },
    { light: "#85FF8C", dark: "#50AA5B" },
    { light: "#FF92E3", dark: "#C25AA8" },
  ];
  const getColor = (i) => PALETTE[i % PALETTE.length].light;
  const getDark = (i) => PALETTE[i % PALETTE.length].dark;

  // ─── Legend payload for line charts ───────────────────────────────────────

  const legendPayload = useMemo(() => {
    const items = [{ value: "Historical", type: "line", color: "#D64444" }];
    if (hasLinear) {
      items.push({
        value: "Forecast (Stats)",
        type: "line",
        color: "#F58C1F",
      });
    }
    if (hasScore) {
      items.push({
        value: "Forecast (Survey-based)",
        type: "line",
        color: "#23DD1D",
      });
    }
    if (Object.keys(aiForecast).length) {
      items.push({ value: "Forecast (AI)", type: "line", color: "#A17CFF" });
    }
    if (Object.keys(raceForecast).length) {
      items.push({ value: "Forecast (Race)", type: "line", color: "#ffc107" });
    }

    if (hasByf)
      items.push({ value: "Forecast (BYF)", type: "line", color: "#38CCD4" }); // ← new

    return items;
  }, [selectedGraph, hasScore, hasByf]);

  // compute once, outside the component or at top of component
  const lastHistYear = chartData.length
    ? Number(chartData[chartData.length - 1].year)
    : null;

  // ─── Custom tooltip component ─────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label, chartType }) => {
    if (!active || !payload?.length) return null;

    const fmt = (v) =>
      typeof v === "number"
        ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : v;

    // for line charts you keep your existing logic…
    if (chartType !== "bar") {
      const year = Number(label);
      const isHistorical = lastHistYear !== null && year <= lastHistYear;
      payload = payload.filter((p) =>
        isHistorical ? p.dataKey === "value" : p.dataKey !== "value",
      );
      console.log("payload", payload);
      if (!payload.length) return null;
    }

    return (
      <div className="tooltip-card">
        <p>{label}</p>
        {payload.map((p) => (
          <div key={p.dataKey}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}: {fmt(p.value)}
          </div>
        ))}
        <style jsx>{`
          .tooltip-card {
            background: rgba(20, 20, 20, 0.9);
            padding: var(--space-sm);
            border-radius: var(--radius);
            box-shadow: var(--shadow-deep);
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.875rem;
          }
          .tooltip-card .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
            display: inline-block;
          }
          @media (max-width: 640px) {
            .tooltip-card {
              font-size: 0.75rem;
              padding: 8px;
              max-width: 220px;
            }
          }
        `}</style>
      </div>
    );
  };

  // ─── Y-axis formatter ───────────────────────────────────────────────────────
  const abbreviate = (v) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, "")}K`;
    return v.toString();
  };

  // ─── When `displayRegions` changes, reset `openRegions` ───────────────────
  useEffect(() => {
    const init = {};
    displayRegions.forEach((r) => {
      init[r.id] = false;
    });
    setOpenRegions(init);
  }, [displayRegions]);

  // console.log("selectedCountriesList" , selectedCountriesList);
  // console.log("availableGraphs " , availableGraphs);
  // console.log("selectedgraphid ", selectedGraphId);
  // console.log("graphs ", graphs);
  // console.log("volumedatamap ", volumeDataMap);
  // console.log("forecastDataLR ", forecastDataLR);
  // console.log("selected Dataset ", selectedDataset);
  console.log("dataToPlot", dataToPlot);
  // console.log("combineddata" , combinedData);
  // console.log("bothdata ", bothData);
  // console.log("pie data ", pieData);
  // console.log("selected graph ", selectedGraph);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#2C2E31]">
      {/* Admin modal */}
      {adminModalOpen && (
        <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <motion.div className="w-full max-w-sm rounded-xl border border-yellow-400/30 bg-[#2C2E31] p-6 text-white shadow-2xl">
            <h2 className="text-xl font-semibold text-[#15AFE4]">
              Admin Passkey
            </h2>

            <input
              type="password"
              value={adminKeyInput}
              onChange={(e) => setAdminKeyInput(e.target.value)}
              placeholder="Enter secret key"
              className="mt-4 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#15AFE4]/60"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-md border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                onClick={() => {
                  setAdminModalOpen(false);
                  setAdminKeyInput("");
                }}
              >
                Cancel
              </button>

              <button
                className="rounded-md bg-[#15AFE4] px-3 py-2 text-sm font-semibold text-[#1F2023] disabled:opacity-50"
                disabled={!adminKeyInput}
                onClick={() => {
                  if (adminKeyInput === "imThe8055") {
                    setIsAdmin(true);
                    setAdminModalOpen(false);
                  } else {
                    alert("Wrong passkey");
                  }
                  setAdminKeyInput("");
                }}
              >
                Unlock
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Country modal */}
      {modalOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#2C2E31] p-6 text-center text-white shadow-2xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {!confirmationOpen ? (
              <>
                <h2 className="text-xl font-semibold">Select Your Country</h2>

                <select
                  value={chosenCountry || ""}
                  onChange={(e) => setChosenCountry(Number(e.target.value))}
                  className="mt-4 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white outline-none"
                >
                  <option value="" disabled>
                    — pick one —
                  </option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  disabled={!chosenCountry}
                  onClick={() => setConfirmationOpen(true)}
                  className="mt-4 w-full rounded-md bg-[#15AFE4] px-4 py-2 font-semibold text-[#1F2023] disabled:opacity-50"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-[#FFCC00]">
                  ⚠️ Confirm Selection
                </h2>

                <p className="mt-3 text-sm text-white/80">
                  You’ve chosen{" "}
                  <strong className="text-white">
                    {countries.find((c) => c.id === chosenCountry)?.name}
                  </strong>
                  . This cannot be changed later. Please type the country name
                  below to confirm.
                </p>

                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type country name exactly"
                  className="mt-4 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white outline-none"
                />

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setConfirmationOpen(false);
                      setConfirmText("");
                    }}
                    className="rounded-md border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={
                      confirmText.trim().toLowerCase() !==
                      countries
                        .find((c) => c.id === chosenCountry)
                        ?.name.toLowerCase()
                    }
                    onClick={() => {
                      fetch("/api/user-country", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email,
                          plan_name: planName,
                          country_id: chosenCountry,
                        }),
                      })
                        .then(() => {
                          setUserCountry({
                            email,
                            plan_name: planName,
                            country_id: chosenCountry,
                          });
                          setModalOpen(false);
                        })
                        .catch(console.error);
                    }}
                    className="rounded-md bg-[#15AFE4] px-3 py-2 text-sm font-semibold text-[#1F2023] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      <GlobalStyles />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-screen-2xl px-2 py-4 sm:px-4 lg:px-6"
      >
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" passHref>
            <motion.div
              className="inline-block cursor-pointer"
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => {
                setLogoHover(false);
                clearTimeout(pressTimer);
              }}
              onMouseDown={() => {
                pressTimer = setTimeout(() => setAdminModalOpen(true), 2000);
              }}
              onMouseUp={() => clearTimeout(pressTimer)}
              onTouchStart={() => {
                pressTimer = setTimeout(() => setAdminModalOpen(true), 2000);
              }}
              onTouchEnd={() => clearTimeout(pressTimer)}
              onClick={() => {
                if (pressTimer !== null) router.push("/");
              }}
              animate={{
                scale: isLogoHover ? 1.05 : 1,
                filter: isLogoHover
                  ? "drop-shadow(0 0 12px #FFDC00) brightness(1.2) saturate(1.3)"
                  : "none",
              }}
              transition={{
                scale: { type: "spring", stiffness: 300, damping: 20 },
                filter: { duration: 0.2 },
              }}
            >
              <Image
                src="/images/race-analytics-new-logo-white.webp"
                alt="Race Auto India"
                width={Math.round(160 * 1.5)}
                height={Math.round(60 * 1.5)}
                priority
              />
            </motion.div>
          </Link>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {/* Exclusive Services (tailwind dropdown) */}
            <div ref={exclusiveRef} className="relative z-30">
              <button
                type="button"
                onClick={() => setExclusiveOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md bg-[#1F2023] px-4 py-2 text-sm font-semibold text-[#FFC107] shadow-sm hover:bg-white/5"
              >
                Exclusive Services
                <span
                  className={`transition ${exclusiveOpen ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>

              <div
                className={[
                  "absolute right-0 z-40 mt-2 w-[320px] rounded-xl border border-white/10 bg-[#1F2023]/95 p-3 text-sm text-white shadow-2xl backdrop-blur",
                  "transition duration-200",
                  exclusiveOpen
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0",
                ].join(" ")}
              >
                <div className="space-y-1">
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#FFDC00]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Key%20Market%20Indicators&body=Hello%2C%0D%0A%0D%0AThis%20request%20is%20made%20from%20the%20Forecast%20Page%20of%20Race%20Auto%20India.%0D%0AI%20would%20like%20to%20receive%20the%20latest%20Key%20Market%20Indicators.%0D%0AThank%20you."
                  >
                    Key Market Indicators
                  </a>
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#FFDC00]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Global%20Comparisons&body=Hi%2C%0D%0A%0D%0ARequest%20made%20from%20the%20Forecast%20Page.%20I%20am%20interested%20in%20Global%20Comparison%20data.%0D%0ARegards."
                  >
                    Global Comparisons
                  </a>
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#FFDC00]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Market%20Highlights&body=Dear%20Team%2C%0D%0A%0D%0AThis%20is%20a%20request%20from%20the%20Forecast%20Page.%20Please%20share%20the%20latest%20market%20highlights.%0D%0AThank%20you."
                  >
                    Highlights
                  </a>
                </div>

                <div className="my-3 h-px bg-white/10" />

                <div className="space-y-2">
                  <div className="px-3 text-xs font-bold uppercase tracking-wide text-[#FFDC00]">
                    Analyst Opinion
                  </div>
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#15AFE4]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Book%20Analyst%20Appointment&body=Hello%2C%0D%0A%0D%0AI%20am%20requesting%20an%20appointment%20with%20an%20analyst%20via%20the%20Forecast%20Page.%0D%0ARegards."
                  >
                    Book an Appointment
                  </a>
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#15AFE4]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Submit%20a%20Query&body=Hi%20Team%2C%0D%0A%0D%0AI%20have%20a%20market-related%20query%20from%20the%20Forecast%20Page.%0D%0ARegards."
                  >
                    Send Your Queries
                  </a>
                </div>

                <div className="my-3 h-px bg-white/10" />

                <div className="space-y-2">
                  <div className="px-3 text-xs font-bold uppercase tracking-wide text-[#FFDC00]">
                    Reports
                  </div>
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#15AFE4]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Sample%20Report&body=Dear%20Team%2C%0D%0A%0D%0ARequest%20from%20the%20Forecast%20Page%20to%20receive%20a%20sample%20report.%0D%0AThanks."
                  >
                    Sample Reports on Demand
                  </a>
                  <a
                    className="block rounded-md px-3 py-2 hover:bg-white/5 hover:text-[#15AFE4]"
                    href="mailto:info@raceautoindia.com,director@raceautoindia.com?subject=Forecast%20Page%20Request%20-%20Full%20Report%20Purchase&body=Hi%2C%0D%0A%0D%0AI%20want%20to%20purchase%20a%20full%20market%20report%20via%20the%20Forecast%20Page.%20Please%20send%20pricing%20and%20access%20details.%0D%0AThanks."
                  >
                    Purchase Full Report on Demand
                  </a>
                </div>
              </div>
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-md bg-[#1F2023] px-4 py-2 text-sm font-semibold text-[#15AFE4] shadow-sm hover:bg-gradient-to-r hover:from-[#15AFE4] hover:to-[#2C2E31] hover:text-white"
              onClick={() =>
                router.push(`/score-card?graphId=${selectedGraphId}`)
              }
            >
              <FaClipboardList />
              Build Your Own Tailored Forecast
            </button>

            <button
              className="inline-flex items-center gap-2 rounded-md bg-[#1F2023] px-4 py-2 text-sm font-semibold text-[#15AFE4] shadow-sm hover:bg-gradient-to-r hover:from-[#15AFE4] hover:to-[#2C2E31] hover:text-white"
              onClick={() => router.push("/flash-reports")}
            >
              <FaBolt />
              Flash Reports
            </button>

            {mountLoginNav || planName ? (
              <LoginNavButton />
            ) : (
              <button
                className="inline-flex items-center rounded-md bg-[#1F2023] px-4 py-2 text-sm font-semibold text-white/90 shadow-sm hover:bg-white/5"
                onClick={() => setMountLoginNav(true)}
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Selectors */}
        <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
          {/* LEFT: Category + Region */}
          <div className="flex flex-wrap items-center justify-start gap-3">
            {/* Category */}
            <div ref={categoryRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!email) {
                    setMountLoginNav(true);
                    return;
                  }
                  setOpenCategory((v) => !v);
                  setOpenRegion(false);
                  setOpenGraph(false);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
              >
                {selectedCategoryId
                  ? hierarchyMap[selectedCategoryId]
                  : "Category"}
                <span
                  className={`transition ${openCategory ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>

              <div
                className={[
                  "absolute left-0 top-full z-20 mt-2 w-[260px] max-h-[420px] overflow-auto rounded-xl border border-white/15 bg-[#0B0F14]/95 p-2 text-sm text-white shadow-2xl backdrop-blur-md",
                  "transition duration-200",
                  openCategory
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0",
                ].join(" ")}
              >
                {categories.map((cat, idx) => {
                  const locked = !isAdmin && planName === "silver" && idx >= 2;
                  const active = selectedCategoryId === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (locked) return;
                        setSelectedCategoryId(cat.id);
                        setSelectedRegionId(null);
                        setSelectedGraphId(null);
                        setOpenCategory(false);
                      }}
                      className={[
                        "group relative flex w-full items-center justify-between rounded-md px-3 py-2 text-left",
                        locked
                          ? "cursor-not-allowed text-white/40"
                          : active
                            ? "bg-[#15AFE4]/15 text-[#FFDC00]"
                            : "text-white hover:bg-white/5 hover:text-[#15AFE4]",
                      ].join(" ")}
                    >
                      <span>{cat.name}</span>

                      {locked && (
                        <span className="ml-2 text-xs text-white/40">
                          Locked
                        </span>
                      )}

                      {locked && (
                        <span className="pointer-events-none absolute -top-2 left-1/2 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[#15AFE4]/40 bg-black/90 px-2 py-1 text-xs text-white group-hover:block">
                          Upgrade to Gold or Platinum to unlock
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Region */}
            {selectedCategoryId && (
              <div ref={regionRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      setMountLoginNav(true);
                      return;
                    }
                    setOpenRegion((v) => !v);
                    setOpenCategory(false);
                    setOpenGraph(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  {selectedRegionId
                    ? hierarchyMap[selectedRegionId]
                    : "Regions"}
                  <span
                    className={`transition ${openRegion ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                <div
                  className={[
                    "absolute left-0 top-full z-20 mt-2 w-[340px] max-h-[520px] overflow-auto rounded-xl border border-white/15 bg-[#0B0F14]/95 p-3 text-sm text-white shadow-2xl backdrop-blur-md",
                    "transition duration-200",
                    openRegion
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0",
                  ].join(" ")}
                >
                  {allRegionsNode && (
                    <label className="flex items-center gap-2 rounded-md px-2 py-2 text-white hover:bg-white/5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#FFC107]"
                        checked={selectedRegionId === allRegionsNode.id}
                        onChange={() => {
                          if (selectedRegionId === allRegionsNode.id) {
                            setSelectedRegionId(null);
                          } else {
                            setSelectedRegionId(allRegionsNode.id);
                            setSelectedGraphId(null);
                          }
                          setOpenRegion(false);
                        }}
                      />
                      <span className="font-semibold">
                        {allRegionsNode.name}
                      </span>
                    </label>
                  )}

                  <div className="mt-2 space-y-2">
                    {displayRegions.map((region) => {
                      const children = countriesByRegion[region.id] || [];
                      const isOpen = openRegions[region.id];
                      const isSilverRestricted =
                        planName === "silver" && !isAdmin;

                      return (
                        <div
                          key={region.id}
                          className="rounded-lg border border-white/10 bg-white/0"
                        >
                          <button
                            type="button"
                            className={[
                              "flex w-full items-center justify-between rounded-lg px-2 py-2 text-left",
                              isSilverRestricted
                                ? "cursor-not-allowed text-white/50"
                                : "text-white hover:bg-white/5",
                            ].join(" ")}
                            onClick={(e) => {
                              if (!email) {
                                setMountLoginNav(true);
                                return;
                              }
                              if (isSilverRestricted) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenRegions((prev) => ({
                                ...prev,
                                [region.id]: !prev[region.id],
                              }));
                            }}
                          >
                            <span className="font-semibold">{region.name}</span>
                            <span className="text-white/60">
                              {isOpen ? "▾" : "▸"}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="px-2 pb-2">
                              {children.map((cn) => {
                                const isGoldOrPlat =
                                  planName === "gold" ||
                                  planName === "platinum";
                                const disabled =
                                  !isAdmin &&
                                  isGoldOrPlat &&
                                  cn.name !== chosenCountryName;

                                return (
                                  <label
                                    key={cn.id}
                                    className={[
                                      "mt-1 flex items-center gap-2 rounded-md px-2 py-1",
                                      disabled
                                        ? "cursor-not-allowed text-white/40"
                                        : "cursor-pointer text-white hover:bg-white/5",
                                    ].join(" ")}
                                  >
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 accent-[#FFC107]"
                                      disabled={disabled}
                                      checked={selectedRegionId === cn.id}
                                      onChange={() => {
                                        if (disabled) return;

                                        setSelectedRegionId(
                                          selectedRegionId === cn.id
                                            ? null
                                            : cn.id,
                                        );
                                        if (selectedRegionId !== cn.id) {
                                          setSelectedGraphId(null);
                                        }

                                        setOpenRegion(false);
                                      }}
                                    />
                                    {cn.name}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CENTER: Graph picker */}
          <div className="flex justify-center">
            {selectedCountriesList.length > 0 && (
              <div
                ref={graphRef}
                className="relative z-10 w-full max-w-3xl text-center"
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md bg-white/5 px-4 py-2 text-base font-semibold text-white hover:bg-white/10"
                  onClick={() => {
                    if (!email) {
                      setMountLoginNav(true);
                      return;
                    }
                    setOpenGraph((v) => !v);
                    setOpenCategory(false);
                    setOpenRegion(false);
                  }}
                >
                  {availableGraphs.find((g) => g.id === selectedGraphId)
                    ?.name || "Select a graph"}
                  <span
                    className={`transition ${openGraph ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                <div
                  className={[
                    "absolute left-1/2 top-full z-20 mt-2 w-[520px] max-w-[90vw] -translate-x-1/2 rounded-xl border border-white/15 bg-[#0B0F14]/95 p-2 text-left text-sm text-white shadow-2xl backdrop-blur-md",
                    "transition duration-200",
                    openGraph
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0",
                  ].join(" ")}
                >
                  <div className="max-h-[420px] overflow-auto">
                    {availableGraphs.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedGraphId(opt.id);
                          setOpenGraph(false);
                        }}
                        className={[
                          "block w-full rounded-md px-3 py-2 text-left",
                          selectedGraphId === opt.id
                            ? "bg-[#15AFE4]/15 text-[#FFDC00]"
                            : "text-white hover:bg-white/5 hover:text-[#15AFE4]",
                        ].join(" ")}
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Spacer (keeps center truly centered on lg+) */}
          <div className="hidden lg:block" />
        </div>

        {/* Summary */}
        {selectedGraph?.summary && (
          <motion.p
            className="mx-auto mt-4 max-w-4xl text-center text-sm leading-relaxed text-white/90 sm:text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {selectedGraph.summary}
          </motion.p>
        )}

        {/* Chart */}
        <div className="mt-4">
          {loading ? (
            <div className="h-[450px] w-full animate-pulse rounded-xl bg-white/5" />
          ) : !selectedGraphId ? (
            <p className="text-center text-white/80">
              Please choose a category, select a region/country or “All
              Regions,” then pick a graph.
            </p>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedGraphId}-${selectedRegionId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative z-0 rounded-xl bg-[#1F2023] p-3 sm:p-4 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
                  {/* Growth rates */}
                  <div className="mb-3 rounded-lg bg-transparent p-3 text-center">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#FFC107]">
                      Growth Rates (CAGR%)
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
                      {growthRates.historical != null && (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#D64444]" />
                          {growthRates.historical.toFixed(1)}% Historical
                        </div>
                      )}
                      {growthRates.linear != null && (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#F58C1F]" />
                          {growthRates.linear.toFixed(1)}% Forecast (Stats)
                        </div>
                      )}
                      {growthRates.score != null && (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#23DD1D]" />
                          {growthRates.score.toFixed(1)}% Forecast (Survey)
                        </div>
                      )}
                      {growthRates.ai != null && (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#A17CFF]" />
                          {growthRates.ai.toFixed(1)}% Forecast (AI)
                        </div>
                      )}
                      {growthRates.race != null && (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#FF8A65]" />
                          {growthRates.race.toFixed(1)}% Forecast (Race)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Powered by logo */}
                  {!isMobile && (
                    <div className="pointer-events-none absolute right-3 top-3 sm:right-6 sm:top-4 flex items-center gap-2">
                      <span className="text-xs text-white/60">Powered by</span>
                      <Image
                        src="/images/Ri-Logo-Graph-White.webp"
                        alt="Race Innovations"
                        width={33}
                        height={50}
                        className="opacity-100"
                      />
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    {(() => {
                      if (!selectedGraph) return null;

                      // LINE
                      if (selectedGraph.chart_type === "line") {
                        return (
                          <LineChart
                            data={dataToPlot}
                            margin={chartMarginLine}
                            animationDuration={isMobile ? 1200 : 2500}
                            animationEasing="ease-out"
                          >
                            {!isMobile && (
                              <image
                                href="/images/chart-background-race-auto-logo.png"
                                x="38%"
                                y="8%"
                                width="300"
                                height="300"
                                opacity="0.04"
                              />
                            )}

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
                                  stopColor="#D64444"
                                  stopOpacity={0.9}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#D64444"
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
                                fontSize: 12,
                              }}
                            />

                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={yTick}
                              domain={["auto", "auto"]}
                              tickFormatter={abbreviate}
                              width={isMobile ? 40 : 60}
                            />

                            {!isMobile && (
                              <Brush
                                dataKey="year"
                                height={12}
                                stroke="rgba(255,255,255,0.4)"
                                fill="rgba(255,255,255,0.08)"
                                strokeWidth={1}
                                tickFormatter={(d) => d}
                                tick={{
                                  fill: "rgba(255,255,255,0.6)",
                                  fontSize: 9,
                                  fontFamily: "inherit",
                                }}
                                tickMargin={4}
                                traveller={
                                  <Rectangle
                                    width={6}
                                    height={16}
                                    radius={3}
                                    fill="rgba(255,255,255,0.6)"
                                    stroke="rgba(255,255,255,0.4)"
                                    strokeWidth={1}
                                    cursor="ew-resize"
                                  />
                                }
                              />
                            )}

                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              wrapperStyle={{
                                marginTop: isMobile ? 10 : 24,
                                fontSize: isMobile ? 11 : 13,
                                lineHeight: isMobile ? "14px" : "16px",
                              }}
                              payload={legendPayload}
                            />

                            <Line
                              dataKey="value"
                              name="Historical"
                              stroke="url(#histGrad)"
                              type="monotone"
                              strokeWidth={3}
                              connectNulls
                              animationBegin={0}
                            />

                            {hasLinear && (
                              <Line
                                dataKey={
                                  forecastCount > 1
                                    ? "forecastLinear"
                                    : "forecastVolume"
                                }
                                name="Forecast (Stats)"
                                stroke="#F58C1F"
                                type="monotone"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                connectNulls
                                animationBegin={150}
                              />
                            )}

                            {hasScore && (
                              <Line
                                dataKey={
                                  forecastCount > 1
                                    ? "forecastScore"
                                    : "forecastVolume"
                                }
                                name="Forecast (Survey-based)"
                                stroke="#23DD1D"
                                type="monotone"
                                strokeWidth={2}
                                strokeDasharray="2 2"
                                connectNulls
                                animationBegin={300}
                              />
                            )}

                            {hasAI && (
                              <Line
                                dataKey="forecastAI"
                                name="Forecast (AI)"
                                stroke="#A17CFF"
                                type="monotone"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                connectNulls
                                animationBegin={450}
                              />
                            )}

                            {hasRace && (
                              <Line
                                dataKey="forecastRace"
                                name="Forecast (Race)"
                                stroke="#ffc107"
                                type="monotone"
                                strokeWidth={2}
                                strokeDasharray="2 4"
                                connectNulls
                                animationBegin={600}
                              />
                            )}

                            {hasByf && (
                              <Line
                                dataKey="forecastByf"
                                name="Forecast (BYF)"
                                stroke="#38CCD4"
                                type="monotone"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                connectNulls
                                animationBegin={750}
                              />
                            )}
                          </LineChart>
                        );
                      }

                      // BAR
                      if (selectedGraph.chart_type === "bar") {
                        if (!selectedDataset?.data) return null;

                        const barCount = chartData.length;
                        const maxBarSize =
                          barCount < 5 ? 100 : barCount < 10 ? 60 : 24;
                        const barCategoryGap =
                          barCount < 5 ? 40 : barCount < 10 ? 24 : 16;

                        const segments = Object.keys(selectedDataset.data);

                        return (
                          <BarChart
                            data={barChartData}
                            margin={chartMarginBar}
                            barCategoryGap={barCategoryGap}
                            maxBarSize={maxBarSize}
                          >
                            <CartesianGrid
                              stroke="rgba(255,255,255,0.05)"
                              strokeDasharray="3 3"
                            />

                            <XAxis
                              dataKey="year"
                              axisLine={false}
                              tickLine={false}
                              tick={{
                                fill: "rgba(255,255,255,0.6)",
                                fontSize: isMobile ? 10 : 12,
                              }}
                              padding={{ left: 10, right: 10 }}
                            />

                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              width={isMobile ? 38 : 60}
                              tick={{
                                fill: "rgba(255,255,255,0.6)",
                                fontSize: isMobile ? 10 : 12,
                              }}
                            />

                            <Tooltip
                              content={<CustomTooltip chartType="bar" />}
                              cursor={{ fill: "rgba(255,255,255,0.08)" }}
                            />

                            <Legend
                              wrapperStyle={{
                                color: "rgba(255,255,255,0.7)",
                                marginTop: 16,
                              }}
                              iconType="circle"
                            />

                            <defs>
                              {segments.map((seg, i) => (
                                <linearGradient
                                  key={i}
                                  id={`grad-${i}`}
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor={getColor(i)}
                                    stopOpacity={0.8}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor={getDark(i)}
                                    stopOpacity={0.3}
                                  />
                                </linearGradient>
                              ))}
                            </defs>

                            {segments.map((seg, i) => (
                              <Bar
                                key={seg}
                                dataKey={seg}
                                stackId="stack1"
                                fill={`url(#grad-${i})`}
                                radius={[6, 6, 0, 0]}
                                maxBarSize={maxBarSize}
                              />
                            ))}
                          </BarChart>
                        );
                      }

                      // PIE (default)
                      return (
                        <PieChart>
                          <defs>
                            {pieData.map((_, i) => (
                              <linearGradient
                                key={i}
                                id={`sliceGrad-${i}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={getColor(i)}
                                  stopOpacity={0.8}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={getDark(i)}
                                  stopOpacity={0.3}
                                />
                              </linearGradient>
                            ))}
                          </defs>

                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={4}
                            stroke="rgba(255,255,255,0.1)"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={`url(#sliceGrad-${i})`} />
                            ))}
                          </Pie>

                          <Tooltip content={<CustomTooltip />} cursor={false} />
                          <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            wrapperStyle={{
                              color: "rgba(255,255,255,0.7)",
                              marginTop: 16,
                            }}
                          />
                        </PieChart>
                      );
                    })()}
                  </ResponsiveContainer>

                  {selectedGraph?.description && (
                    <div className="mt-3 text-sm text-white/70">
                      {selectedGraph.description}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        <Footer />
      </motion.div>
    </div>
  );
}
