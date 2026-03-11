"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Divider,
  message,
  Progress,
  Space,
  Table,
  Typography,
  Select,
} from "antd";

const { Text } = Typography;

function getPrevMonthIST() {
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
}

const SEGMENT_TO_CAT = {
  overall: "Total",
  pv: "PV",
  cv: "CV",
  tw: "2W",
  threew: "3W",
  tractor: "TRAC",
  truck: "Truck",
  bus: "Bus",
  // ✅ Construction Equipment
  ce: "CE",
  construction: "CE",
  constructionequipment: "CE",
  "construction equipment": "CE",
};

function normalizeSeg(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function guessFlashSegment(graph) {
  const segRaw = graph?.flash_segment || "";
  const seg = normalizeSeg(segRaw);
  if (SEGMENT_TO_CAT[seg]) return seg;

  const compact = seg.replace(/\s+/g, "");
  if (SEGMENT_TO_CAT[compact]) return compact;

  const name = String(graph?.name || "").toLowerCase();
  if (name.includes("overall") || name.includes("total")) return "overall";
  if (name.includes("pv") || name.includes("passenger")) return "pv";
  if (name.includes("cv") || name.includes("commercial")) return "cv";
  if (name.includes("2w") || name.includes("two")) return "tw";
  if (name.includes("3w") || name.includes("three")) return "threew";
  if (name.includes("tractor") || name.includes("trac")) return "tractor";
  if (name.includes("truck")) return "truck";
  if (name.includes("bus")) return "bus";
  if (
    name.includes("construction") ||
    name.includes("equipment") ||
    name.includes("ce")
  )
    return "ce";
  return "overall";
}

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function FlashAIForecastGenerator() {
  const [countries, setCountries] = useState([{ value: "india", label: "India" }]);
  const [selectedCountry, setSelectedCountry] = useState("india");

  // per graph id: {exists, aiForecast, source}
  const [forecastMap, setForecastMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [graphs, setGraphs] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [chartPoints, setChartPoints] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const baseMonth = useMemo(() => getPrevMonthIST(), []);

  const load = async () => {
    setLoading(true);
    try {
      const [graphsRes, chartRes, periodsRes, countriesRes] = await Promise.all([
        fetch("/api/graphs?context=flash", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          cache: "no-store",
        }),
        fetch(
          `/api/flash-reports/overall-chart-data?month=${baseMonth}&horizon=6&country=${encodeURIComponent(
            selectedCountry
          )}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/scoreSettings?key=flashScoreSettings&baseMonth=${baseMonth}&horizon=6`,
          { cache: "no-store" }
        ),
        fetch("/api/flash-reports/countries", { cache: "no-store" }),
      ]);

      if (!graphsRes.ok) throw new Error("Failed to load Flash graphs");
      if (!chartRes.ok) throw new Error("Failed to load Flash overall chart data");
      if (!periodsRes.ok) throw new Error("Failed to load Flash month labels");

      const [graphsJson, chartJson, periodsJson, countriesJson] = await Promise.all([
        graphsRes.json(),
        chartRes.json(),
        periodsRes.json(),
        countriesRes.json(),
      ]);

      const opts = Array.isArray(countriesJson)
        ? countriesJson
            .map((c) => {
              const v = String(c.value || c.code || c.name || "")
                .trim()
                .toLowerCase();
              const label = c.label || c.name || c.value || v;
              return v ? { value: v, label } : null;
            })
            .filter(Boolean)
        : [];

      const merged = [
        { value: "india", label: "India" },
        ...opts.filter((x) => x.value !== "india"),
      ];
      setCountries(merged);

      const g = graphsJson || [];
      setGraphs(g);
      setChartPoints(chartJson?.data || []);
      setPeriods(periodsJson?.yearNames || []);

      // ✅ Fetch questions per graph with country
      const qPairs = await Promise.all(
        g.map(async (gr) => {
          try {
            const url = `/api/questions?graphId=${gr.id}&country=${encodeURIComponent(
              selectedCountry
            )}`;
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) return [gr.id, []];
            const qs = await res.json();
            return [gr.id, Array.isArray(qs) ? qs : []];
          } catch {
            return [gr.id, []];
          }
        })
      );

      const qMap = {};
      for (const [id, qs] of qPairs) qMap[id] = qs;
      setQuestionsMap(qMap);

      // ✅ Fetch country AI forecast presence for table display
      const fPairs = await Promise.all(
        g.map(async (gr) => {
          try {
            const res = await fetch(
              `/api/flash-reports/graph-forecasts?graphId=${gr.id}&country=${encodeURIComponent(
                selectedCountry
              )}`,
              { cache: "no-store" }
            );
            const json = await res.json().catch(() => ({}));
            return [gr.id, json];
          } catch {
            return [gr.id, { exists: false }];
          }
        })
      );

      const fMap = {};
      for (const [id, f] of fPairs) {
        fMap[id] = {
          exists: !!f?.exists,
          source: f?.source || "none",
          aiForecast: f?.aiForecast || null,
        };
      }
      setForecastMap(fMap);
    } catch (e) {
      message.error(e?.message || "Failed to load Flash AI generator data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  const buildVolumeDataForGraph = (graph) => {
    const seg = guessFlashSegment(graph);
    const catKey = SEGMENT_TO_CAT[seg] || "Total";

    const data = {};
    for (const p of chartPoints || []) {
      const month = p?.month;
      if (!month) continue;
      if (String(month) > String(baseMonth)) continue;

      const v = p?.data?.[catKey];
      const n = asNumber(v);
      if (n != null) data[month] = n;
    }

    return {
      segment: seg,
      categoryKey: catKey,
      volumeData: { data },
    };
  };

  const saveCountryAIForecast = async (graphId, country, aiForecast) => {
    const res = await fetch("/api/flash-reports/graph-forecasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graphId,
        country,
        aiForecast,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || "Failed to save AI forecast for country");
    }
  };

  const generateForGraphs = async (graphIds) => {
    if (!graphIds.length) return;

    if (!periods.length) {
      message.error("Flash month labels not loaded. Check flashScoreSettings.");
      return;
    }

    setGenerating(true);
    setProgress({ current: 0, total: graphIds.length });

    try {
      for (let i = 0; i < graphIds.length; i++) {
        const graphId = graphIds[i];
        setProgress({ current: i + 1, total: graphIds.length });

        const graph = graphs.find((g) => g.id === graphId);
        if (!graph) continue;

        const qs = questionsMap[graphId] || [];

        // ✅ Safety: for non-India, require questions
        if (String(selectedCountry).toLowerCase() !== "india" && qs.length === 0) {
          message.warning(
            `No questions configured for ${selectedCountry.toUpperCase()} for graph #${graphId}. Add them in Flash Questions first.`
          );
          continue;
        }

        const { segment, categoryKey, volumeData } = buildVolumeDataForGraph(graph);

        const categoryName = `Flash Reports — ${segment.toUpperCase()} (${categoryKey})`;
        const categoryDefinition = `Monthly Flash Reports forecast for segment ${segment}. Values are total volumes for ${categoryKey}.`;

        // Region is a human label used only in prompt
        const region = selectedCountry.toUpperCase();

        const payload = {
          graphId,
          categoryName,
          categoryDefinition,
          graphName: graph.name,
          region,
          volumeData,
          years: periods,
          questions: (qs || []).map((q) => ({
            text: q.text,
            weight: q.weight,
            type: q.type,
          })),
        };

        const aiRes = await fetch("/api/ai-forecast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          body: JSON.stringify(payload),
        });

        const aiJson = await aiRes.json().catch(() => ({}));
        if (!aiRes.ok) {
          throw new Error(aiJson?.error || `AI forecast failed for graph #${graphId}`);
        }

        await saveCountryAIForecast(graphId, selectedCountry, aiJson);
      }

      message.success("Flash AI forecast generation completed.");
      await load();
    } catch (e) {
      message.error(e?.message || "Flash AI generation failed");
    } finally {
      setGenerating(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const columns = [
    {
      title: "Graph",
      dataIndex: "name",
      key: "name",
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            #{r.id} — {r.name}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            segment: <b>{String(guessFlashSegment(r)).toUpperCase()}</b>
            {r.flash_segment ? "" : " (guessed)"}
          </div>
        </div>
      ),
    },
    {
      title: "Questions",
      key: "questions",
      width: 120,
      render: (_, r) => {
        const qs = questionsMap[r.id] || [];
        return <span>{qs.length}</span>;
      },
    },
    {
      title: "AI Forecast",
      key: "ai",
      width: 140,
      render: (_, r) => {
        const f = forecastMap?.[r.id];
        const has = !!(f?.aiForecast && Object.keys(f.aiForecast).length > 0);
        return <span>{has ? "✅" : "—"}</span>;
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  return (
    <Card style={{ maxWidth: 1100 }} loading={loading}>
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Text type="secondary">
          This tool generates <b>monthly AI forecasts</b> for Flash graphs and
          saves them into the country override table via{" "}
          <code>/api/flash-reports/graph-forecasts</code> (keys like <code>YYYY-MM</code>).
          <br />
          Base month is fixed to the <b>previous IST month</b>:{" "}
          <b>{baseMonth}</b>, and the future months are taken from{" "}
          <code>flashScoreSettings</code>.
        </Text>

        <Alert
          type="info"
          showIcon
          message="Requirements"
          description={
            <div style={{ fontSize: 12 }}>
              <div>1) Ensure <code>OPENAI_API_KEY</code> is set on the server.</div>
              <div>
                2) Ensure each Flash graph has relevant questions (recommended).
                For non-India countries, questions are required.
              </div>
              <div>
                3) Ensure Flash segment mapping is set; otherwise the segment is guessed from the graph name.
              </div>
            </div>
          }
        />

        <Divider style={{ margin: "8px 0" }} />

        {generating && progress.total > 0 && (
          <div style={{ width: 420, maxWidth: "100%" }}>
            <Progress
              percent={Math.round((progress.current / progress.total) * 100)}
              status="active"
            />
          </div>
        )}

        <Space wrap align="center">
          <Text strong>Country:</Text>
          <Select
            value={selectedCountry}
            style={{ width: 220 }}
            options={countries}
            onChange={(v) => setSelectedCountry(String(v))}
            disabled={generating}
          />
        </Space>

        <Space wrap>
          <Button
            type="primary"
            disabled={generating || !selectedRowKeys.length}
            loading={generating}
            onClick={() => generateForGraphs(selectedRowKeys)}
          >
            Generate for Selected
          </Button>
          <Button
            disabled={generating || !graphs.length}
            onClick={() => generateForGraphs(graphs.map((g) => g.id))}
          >
            Generate for All
          </Button>
          <Button disabled={generating} onClick={load}>
            Refresh
          </Button>
        </Space>

        <Table
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={graphs}
          rowSelection={rowSelection}
          pagination={{ pageSize: 8 }}
        />
      </Space>
    </Card>
  );
}