"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, Select, Space, Spin, Typography, Alert } from "antd";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useLinearRegressionForecast } from "../../hooks/LinearRegressionForecast";
import { useForecastGrowth } from "../../hooks/useForecastGrowth";
import { useAverageYearlyScores } from "../../hooks/useAverageYearlyScores";

const { Title, Text } = Typography;

// Forecast root node id (locked requirement)
const ROOT_PARENT_ID = "76";

const PALETTE = [
  "#15AFE4",
  "#FFC107",
  "#23DD1D",
  "#A17CFF",
  "#FF8A65",
  "#38CCD4",
  "#FF92E3",
  "#85FF8C",
];

const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const parseStreamIds = (stream) =>
  String(stream || "")
    .split(",")
    .map((s) => Number(String(s).trim()))
    .filter((x) => Number.isFinite(x) && x > 0);

export default function PreviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [graphs, setGraphs] = useState([]);
  const [volumeDataMap, setVolumeDataMap] = useState({});
  const [contentNodes, setContentNodes] = useState([]);
  const [scoreSettings, setScoreSettings] = useState({ yearNames: [] });
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [selectedGraphId, setSelectedGraphId] = useState(null);

  // --- Load everything (no restrictions) ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [graphsRes, volRes, hierarchyRes, scoreRes, qsRes, subsRes] =
          await Promise.all([
            fetch(`/api/graphs?context=forecast`).then((r) => r.json()),
            fetch(`/api/volumeData`).then((r) => r.json()),
            fetch(`/api/contentHierarchy`).then((r) => r.json()),
            fetch(`/api/scoreSettings`).then((r) => r.json()),
            fetch(`/api/questions`).then((r) => r.json()),
            fetch(`/api/saveScores`).then((r) => r.json()),
          ]);

        if (!alive) return;

        setGraphs(Array.isArray(graphsRes) ? graphsRes : []);

        const vmap = {};
        (Array.isArray(volRes) ? volRes : []).forEach((d) => {
          // normalize numeric values
          const clean = {};
          Object.entries(d.data || {}).forEach(([k, series]) => {
            const s = {};
            Object.entries(series || {}).forEach(([yr, val]) => {
              s[yr] = num(val);
            });
            clean[k] = s;
          });
          vmap[d.id] = { ...d, data: clean };
        });
        setVolumeDataMap(vmap);

        setContentNodes(Array.isArray(hierarchyRes) ? hierarchyRes : []);
        setScoreSettings(
          scoreRes && typeof scoreRes === "object"
            ? scoreRes
            : { yearNames: [] },
        );
        setQuestions(Array.isArray(qsRes) ? qsRes : []);
        setSubmissions(
          Array.isArray(subsRes?.submissions) ? subsRes.submissions : [],
        );
      } catch (e) {
        console.error(e);
        if (alive)
          setError(
            "Failed to load preview data. Check API routes in production.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // --- Content hierarchy helpers ---
  const nodeById = useMemo(() => {
    const m = new Map();
    (contentNodes || []).forEach((n) => m.set(Number(n.id), n));
    return m;
  }, [contentNodes]);

  const categories = useMemo(() => {
    return (contentNodes || []).filter(
      (n) => String(n.parent_id) === ROOT_PARENT_ID,
    );
  }, [contentNodes]);

  const regions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return (contentNodes || []).filter(
      (n) => String(n.parent_id) === String(selectedCategoryId),
    );
  }, [contentNodes, selectedCategoryId]);

  const allRegionsNode = useMemo(() => {
    if (!selectedCategoryId) return null;
    return (
      (contentNodes || []).find(
        (n) =>
          String(n.parent_id) === String(selectedCategoryId) &&
          n.name === "All Regions",
      ) || null
    );
  }, [contentNodes, selectedCategoryId]);

  const displayRegions = useMemo(() => {
    if (!selectedCategoryId) return [];
    const allId = allRegionsNode?.id;
    return (regions || []).filter((r) => String(r.id) !== String(allId));
  }, [regions, allRegionsNode, selectedCategoryId]);

  const countriesByRegion = useMemo(() => {
    const lookup = {};
    (displayRegions || []).forEach((region) => {
      lookup[String(region.id)] = (contentNodes || []).filter(
        (n) => String(n.parent_id) === String(region.id),
      );
    });
    return lookup;
  }, [contentNodes, displayRegions]);

  const allRegionsChildrenIds = useMemo(() => {
    if (!allRegionsNode) return [];
    return (contentNodes || [])
      .filter((n) => String(n.parent_id) === String(allRegionsNode.id))
      .map((n) => n.id);
  }, [contentNodes, allRegionsNode]);

  const selectedCountriesList = useMemo(() => {
    if (!selectedRegionId) return [];
    if (
      allRegionsNode &&
      String(selectedRegionId) === String(allRegionsNode.id)
    ) {
      return allRegionsChildrenIds;
    }
    return [selectedRegionId];
  }, [selectedRegionId, allRegionsNode, allRegionsChildrenIds]);

  // --- Available graphs for the selected region/country ---
  const availableGraphs = useMemo(() => {
    if (!selectedCountriesList.length) return [];
    return (graphs || []).filter((g) => {
      const dsIds = Array.isArray(g.dataset_ids)
        ? g.dataset_ids
        : [g.dataset_ids];
      return dsIds.some((dsId) => {
        const ds = volumeDataMap[Number(dsId)];
        if (!ds?.stream) return false;
        const parts = parseStreamIds(ds.stream);
        return parts.some((p) => selectedCountriesList.includes(p));
      });
    });
  }, [graphs, volumeDataMap, selectedCountriesList]);

  // Keep graph selection valid when filters change
  useEffect(() => {
    if (!availableGraphs.length) {
      setSelectedGraphId(null);
      return;
    }
    if (
      !selectedGraphId ||
      !availableGraphs.some((g) => g.id === selectedGraphId)
    ) {
      setSelectedGraphId(availableGraphs[0].id);
    }
  }, [availableGraphs, selectedGraphId]);

  // Reasonable defaults (first category + All Regions)
  useEffect(() => {
    if (!categories.length) return;
    if (selectedCategoryId == null) {
      setSelectedCategoryId(categories[0].id);
      return;
    }
    // When category changes, default region to All Regions (if available)
    if (selectedCategoryId != null && selectedRegionId == null) {
      if (allRegionsNode) setSelectedRegionId(allRegionsNode.id);
    }
  }, [categories, selectedCategoryId, selectedRegionId, allRegionsNode]);

  // Reset region/graph when category changes
  useEffect(() => {
    if (!selectedCategoryId) return;
    // Ensure region belongs to category
    const valid = regions.some(
      (r) => String(r.id) === String(selectedRegionId),
    );
    if (!valid) {
      setSelectedRegionId(allRegionsNode?.id ?? null);
      setSelectedGraphId(null);
    }
  }, [selectedCategoryId, regions, selectedRegionId, allRegionsNode]);

  const selectedGraph = useMemo(
    () => (graphs || []).find((g) => g.id === selectedGraphId) || null,
    [graphs, selectedGraphId],
  );

  const selectedDataset = useMemo(() => {
    if (!selectedGraph) return null;
    const dsIds = Array.isArray(selectedGraph.dataset_ids)
      ? selectedGraph.dataset_ids
      : [selectedGraph.dataset_ids];
    const first = Number(dsIds?.[0]);
    return volumeDataMap[first] || null;
  }, [selectedGraph, volumeDataMap]);

  // --- Build line series (historical) ---
  const lineSeries = useMemo(() => {
    if (!selectedDataset?.data)
      return { key: null, years: [], values: [], rows: [] };
    const keys = Object.keys(selectedDataset.data || {});
    const firstKey = keys[0] || null;
    if (!firstKey) return { key: null, years: [], values: [], rows: [] };
    const series = selectedDataset.data[firstKey] || {};
    const years = Object.keys(series).sort();
    const values = years.map((y) => num(series[y]));
    const rows = years.map((y) => ({ year: Number(y), value: num(series[y]) }));
    return { key: firstKey, years, values, rows };
  }, [selectedDataset]);

  // --- Score-based forecast inputs (global average, NOT user-specific) ---
  const { yearNames: scoreYearNamesAll, averages: avgScoresAll } =
    useAverageYearlyScores(
      useMemo(() => {
        if (!Array.isArray(submissions) || submissions.length === 0) return [];
        if (!Array.isArray(questions) || questions.length === 0) return [];

        const yearNames = Array.isArray(scoreSettings?.yearNames)
          ? scoreSettings.yearNames
          : [];
        if (!yearNames.length) return [];

        // Build weights + attrs once
        const posAttrs = [];
        const negAttrs = [];
        const weights = {};
        (questions || []).forEach((q) => {
          const key = String(q.id);
          weights[key] = Number(q.weight) || 0;
          const attr = { key, label: q.text };
          q.type === "positive" ? posAttrs.push(attr) : negAttrs.push(attr);
        });

        // Normalize to the shape expected by useAverageYearlyScores
        return (submissions || []).map((sub) => {
          const posScores = {};
          const negScores = {};
          posAttrs.forEach(
            (a) => (posScores[a.key] = Array(yearNames.length).fill(0)),
          );
          negAttrs.forEach(
            (a) => (negScores[a.key] = Array(yearNames.length).fill(0)),
          );

          (sub.scores || []).forEach(
            ({ questionId, yearIndex, score, skipped }) => {
              if (skipped) return;
              const k = String(questionId);
              if (posScores[k] && yearIndex != null)
                posScores[k][yearIndex] = Number(score) || 0;
              if (negScores[k] && yearIndex != null)
                negScores[k][yearIndex] = Number(score) || 0;
            },
          );

          return {
            id: sub.id,
            createdAt: sub.createdAt,
            posAttributes: posAttrs,
            negAttributes: negAttrs,
            posScores,
            negScores,
            weights,
            yearNames,
          };
        });
      }, [submissions, questions, scoreSettings?.yearNames]),
    );

  const avgScoreValuesAll = useMemo(
    () =>
      Array.isArray(avgScoresAll)
        ? avgScoresAll.map((a) => Number(a.avg) || 0)
        : [],
    [avgScoresAll],
  );

  const forecastDataLR = useLinearRegressionForecast(
    lineSeries.values,
    scoreSettings?.yearNames || [],
  );

  const forecastDataScoreAll = useForecastGrowth(
    lineSeries.values,
    avgScoreValuesAll,
  );

  const hasSurveyData =
    Array.isArray(questions) &&
    questions.length > 0 &&
    Array.isArray(submissions) &&
    submissions.length > 0 &&
    Array.isArray(scoreSettings?.yearNames) &&
    scoreSettings.yearNames.length > 0;

  // --- Forecast presence (ignore BYOF for preview) ---
  const aiForecast = selectedGraph?.ai_forecast || {};
  const raceForecast = selectedGraph?.race_forecast || {};

  const hasLinear =
    selectedGraph?.chart_type === "line" &&
    selectedGraph?.forecast_types?.includes("linear");
  const hasScore =
    selectedGraph?.chart_type === "line" &&
    selectedGraph?.forecast_types?.includes("score") &&
    hasSurveyData;
  const hasAI =
    selectedGraph?.chart_type === "line" &&
    Object.keys(aiForecast || {}).length > 0;
  const hasRace =
    selectedGraph?.chart_type === "line" &&
    Object.keys(raceForecast || {}).length > 0;

  const forecastCount = [hasLinear, hasScore, hasAI, hasRace].filter(
    Boolean,
  ).length;

  const unifiedLineData = useMemo(() => {
    if (!lineSeries.rows.length) return [];

    const hist = lineSeries.rows.map((r) => ({
      year: Number(r.year),
      value: num(r.value),
      forecastLinear: null,
      forecastScore: null,
      forecastAI: null,
      forecastRace: null,
    }));

    // carry last actual value into the “0th” forecast point
    if (hist.length) {
      const last = hist[hist.length - 1];
      last.forecastLinear = last.value;
      last.forecastScore = last.value;
      last.forecastAI = last.value;
      last.forecastRace = last.value;
    }

    const years = Array.isArray(scoreSettings?.yearNames)
      ? scoreSettings.yearNames
      : [];
    const fc = years.map((yr, i) => ({
      year: Number(yr),
      value: null,
      forecastLinear: forecastDataLR?.[i]?.forecastVolume ?? null,
      forecastScore: hasSurveyData
        ? (forecastDataScoreAll?.[i]?.forecastVolume ?? null)
        : null,
      forecastAI: aiForecast?.[yr] ?? null,
      forecastRace: raceForecast?.[yr] ?? null,
    }));

    return [...hist, ...fc];
  }, [
    lineSeries.rows,
    scoreSettings?.yearNames,
    forecastDataLR,
    forecastDataScoreAll,
    aiForecast,
    raceForecast,
    hasSurveyData,
  ]);

  const growthRates = useMemo(() => {
    const histCount = lineSeries.rows.length;
    if (!unifiedLineData.length || histCount < 2) return {};

    const calcCAGR = (start, end, periods) =>
      start != null && end != null && periods > 0 && start > 0
        ? (Math.pow(end / start, 1 / periods) - 1) * 100
        : null;

    const firstHist = lineSeries.values[0];
    const lastHist = lineSeries.values[histCount - 1];
    const historical = calcCAGR(firstHist, lastHist, histCount - 1);

    const fc = unifiedLineData.slice(histCount);
    if (fc.length < 2) return { historical };
    const firstFc = fc[0];
    const lastFc = fc[fc.length - 1];
    const periodsFc = fc.length - 1;

    return {
      historical,
      linear: hasLinear
        ? calcCAGR(firstFc.forecastLinear, lastFc.forecastLinear, periodsFc)
        : null,
      score: hasScore
        ? calcCAGR(firstFc.forecastScore, lastFc.forecastScore, periodsFc)
        : null,
      ai: hasAI
        ? calcCAGR(firstFc.forecastAI, lastFc.forecastAI, periodsFc)
        : null,
      race: hasRace
        ? calcCAGR(firstFc.forecastRace, lastFc.forecastRace, periodsFc)
        : null,
    };
  }, [
    unifiedLineData,
    lineSeries.rows.length,
    lineSeries.values,
    hasLinear,
    hasScore,
    hasAI,
    hasRace,
  ]);

  // --- Bar & Pie datasets (for completeness) ---
  const barChartData = useMemo(() => {
    if (!selectedDataset?.data) return [];
    const segments = Object.keys(selectedDataset.data);
    if (!segments.length) return [];
    const years = Object.keys(selectedDataset.data[segments[0]] || {}).sort();
    return years.map((year) => {
      const row = { year };
      segments.forEach((seg) => {
        row[seg] = num(selectedDataset.data[seg]?.[year] ?? 0);
      });
      return row;
    });
  }, [selectedDataset]);

  const pieData = useMemo(() => {
    // some datasets store pie-friendly values under data.data
    const yearData = selectedDataset?.data?.data;
    if (!yearData || typeof yearData !== "object") return [];
    return Object.entries(yearData).map(([name, value]) => ({
      name,
      value: num(value),
    }));
  }, [selectedDataset]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "#111827",
          padding: 10,
          borderRadius: 8,
          color: "#fff",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        {payload
          .filter((p) => p.value != null)
          .map((p) => (
            <div key={p.dataKey} style={{ fontSize: 12, opacity: 0.9 }}>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.name}:</span>{" "}
              {Number(p.value).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
          ))}
      </div>
    );
  };

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ label: c.name, value: String(c.id) })),
    [categories],
  );

  const regionOptions = useMemo(() => {
    if (!selectedCategoryId) return [];

    const opts = [];
    if (allRegionsNode) {
      opts.push({ label: "All Regions", value: String(allRegionsNode.id) });
    }

    // group: Region → Countries
    (displayRegions || []).forEach((region) => {
      const children = countriesByRegion[String(region.id)] || [];
      children.forEach((c) => {
        opts.push({
          label: `${region.name} — ${c.name}`,
          value: String(c.id),
        });
      });
    });

    return opts;
  }, [selectedCategoryId, allRegionsNode, displayRegions, countriesByRegion]);

  const graphOptions = useMemo(
    () =>
      (availableGraphs || []).map((g) => ({
        label: g.name,
        value: String(g.id),
      })),
    [availableGraphs],
  );

  const chartHeight = 420;

  return (
    <div style={{ padding: 12 }}>
      <Title level={4} style={{ marginTop: 0 }}>
        Forecast Preview (CMS)
      </Title>
      <Text type="secondary">
        This preview ignores all restrictions. Choose a Category, Region/Country
        and Graph.
      </Text>

      {error && (
        <div style={{ marginTop: 12 }}>
          <Alert type="error" message={error} showIcon />
        </div>
      )}

      <Card style={{ marginTop: 12 }}>
        <Space wrap size={12}>
          <div style={{ minWidth: 260 }}>
            <Text strong>Category</Text>
            <Select
              style={{ width: "100%", marginTop: 6 }}
              placeholder="Select category"
              options={categoryOptions}
              value={
                selectedCategoryId != null
                  ? String(selectedCategoryId)
                  : undefined
              }
              onChange={(v) => {
                setSelectedCategoryId(Number(v));
                setSelectedRegionId(null);
                setSelectedGraphId(null);
              }}
              showSearch
              optionFilterProp="label"
            />
          </div>

          <div style={{ minWidth: 320 }}>
            <Text strong>Region / Country</Text>
            <Select
              style={{ width: "100%", marginTop: 6 }}
              placeholder="Select region / country"
              options={regionOptions}
              value={
                selectedRegionId != null ? String(selectedRegionId) : undefined
              }
              onChange={(v) => {
                setSelectedRegionId(Number(v));
                setSelectedGraphId(null);
              }}
              showSearch
              optionFilterProp="label"
              disabled={!selectedCategoryId}
            />
          </div>

          <div style={{ minWidth: 420 }}>
            <Text strong>Graph</Text>
            <Select
              style={{ width: "100%", marginTop: 6 }}
              placeholder="Select graph"
              options={graphOptions}
              value={
                selectedGraphId != null ? String(selectedGraphId) : undefined
              }
              onChange={(v) => setSelectedGraphId(Number(v))}
              showSearch
              optionFilterProp="label"
              disabled={!selectedRegionId}
            />
          </div>
        </Space>
      </Card>

      <Card style={{ marginTop: 12 }}>
        {loading ? (
          <div
            style={{
              height: chartHeight,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Spin />
          </div>
        ) : !selectedGraph ? (
          <Text type="secondary">Select a graph to preview.</Text>
        ) : (
          <div>
            {selectedGraph?.summary ? (
              <div style={{ marginBottom: 10 }}>
                <Text>{selectedGraph.summary}</Text>
              </div>
            ) : null}

            {/* Growth rates (only meaningful for line charts) */}
            {selectedGraph.chart_type === "line" && (
              <div style={{ marginBottom: 10, fontSize: 12 }}>
                <Space wrap size={10}>
                  {growthRates.historical != null && (
                    <Text>
                      Historical: {growthRates.historical.toFixed(1)}%
                    </Text>
                  )}
                  {growthRates.linear != null && (
                    <Text>Stats: {growthRates.linear.toFixed(1)}%</Text>
                  )}
                  {growthRates.score != null && (
                    <Text>Survey: {growthRates.score.toFixed(1)}%</Text>
                  )}
                  {growthRates.ai != null && (
                    <Text>AI: {growthRates.ai.toFixed(1)}%</Text>
                  )}
                  {growthRates.race != null && (
                    <Text>Race: {growthRates.race.toFixed(1)}%</Text>
                  )}
                </Space>
              </div>
            )}

            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                {selectedGraph.chart_type === "line" ? (
                  <LineChart
                    data={forecastCount > 1 ? unifiedLineData : unifiedLineData}
                    margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(0,0,0,0.08)"
                      strokeDasharray="3 3"
                    />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(v) => Number(v).toLocaleString()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* Historical */}
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Historical"
                      stroke="#D64444"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />

                    {hasLinear && (
                      <Line
                        type="monotone"
                        dataKey="forecastLinear"
                        name="Forecast (Stats)"
                        stroke="#F58C1F"
                        strokeWidth={3}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {hasScore && (
                      <Line
                        type="monotone"
                        dataKey="forecastScore"
                        name="Forecast (Survey)"
                        stroke="#23DD1D"
                        strokeWidth={3}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {hasAI && (
                      <Line
                        type="monotone"
                        dataKey="forecastAI"
                        name="Forecast (AI)"
                        stroke="#A17CFF"
                        strokeWidth={3}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {hasRace && (
                      <Line
                        type="monotone"
                        dataKey="forecastRace"
                        name="Forecast (Race)"
                        stroke="#FFC107"
                        strokeWidth={3}
                        dot={false}
                        connectNulls
                      />
                    )}
                  </LineChart>
                ) : selectedGraph.chart_type === "bar" ? (
                  <BarChart
                    data={barChartData}
                    margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(0,0,0,0.08)"
                      strokeDasharray="3 3"
                    />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(v) => Number(v).toLocaleString()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {Object.keys(selectedDataset?.data || {}).map((k, idx) => (
                      <Bar
                        key={k}
                        dataKey={k}
                        stackId="a"
                        fill={PALETTE[idx % PALETTE.length]}
                      />
                    ))}
                  </BarChart>
                ) : selectedGraph.chart_type === "pie" ? (
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={150}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PALETTE[idx % PALETTE.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  // fallback
                  <LineChart
                    data={lineSeries.rows}
                    margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                  >
                    <CartesianGrid
                      stroke="rgba(0,0,0,0.08)"
                      strokeDasharray="3 3"
                    />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(v) => Number(v).toLocaleString()} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Value"
                      stroke="#15AFE4"
                      strokeWidth={3}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
