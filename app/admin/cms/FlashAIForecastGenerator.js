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
  Switch,
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

  const cutoffDay = 3;
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
  // Truck sub-segments (Tipper / Tractor-Trailer charts)
  tipper: "Tipper",
  trailer: "Trailer",
  "tractor trailer": "Trailer",
  tractortrailer: "Trailer",
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
  // Tipper / Tractor-Trailer must be checked before tractor/truck so a name
  // like "Tractor Trailer" doesn't fall into the "tractor" bucket.
  if (name.includes("tipper")) return "tipper";
  if (name.includes("trailer")) return "trailer";
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
  // Per-graph reasons from the last run. Without these the generator reported
  // only the first error and gave no way to tell what actually failed.
  const [failures, setFailures] = useState([]);
  // Opt-in: the research pass spends OpenAI credits on every graph, so it is
  // off unless deliberately switched on.
  const [useResearch, setUseResearch] = useState(false);

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
          // lookback=27 gives ~28 months of history. Seasonality is a month-of-year
          // effect, so it cannot be observed inside a single year — the old
          // ~10-month window was the reason the AI forecast could only ever
          // return a straight line.
          `/api/flash-reports/overall-chart-data?month=${baseMonth}&horizon=6&lookback=27&country=${encodeURIComponent(
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
          // Kept so generation can send the analyst line to the API, which
          // holds the AI forecast within a set distance of it. Without this the
          // band silently never applies to anything generated from the CMS.
          raceForecast: f?.raceForecast || null,
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
    setFailures([]);

    const failed = [];
    let done = 0;

    try {
      for (let i = 0; i < graphIds.length; i++) {
        const graphId = graphIds[i];
        setProgress({ current: i + 1, total: graphIds.length });

        const graph = graphs.find((g) => g.id === graphId);
        if (!graph) continue;

        // Questions are no longer required: the forecast is calculated from the
        // volume history, so a graph without questions is generated like any
        // other. (They still drive the ML Survey and BYF lines.)
        const qs = questionsMap[graphId] || [];

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
          useResearch,
        };

        // One graph failing must not abandon the rest of the batch. Previously
        // a single error threw out of the loop, so an early failure looked
        // like the whole generator was broken.
        try {
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
            throw new Error(
              aiJson?.error || `AI forecast failed (HTTP ${aiRes.status})`,
            );
          }

          await saveCountryAIForecast(graphId, selectedCountry, aiJson);
          done++;
        } catch (e) {
          failed.push(`#${graphId} ${graph.name} — ${e?.message || "failed"}`);
        }
      }

      setFailures(failed);

      if (failed.length) {
        message.warning(
          `Generated ${done} of ${graphIds.length}. ${failed.length} could not be generated — see the list below.`,
        );
      } else {
        message.success(
          `Flash AI forecast generated for ${done} graph${done === 1 ? "" : "s"}.`,
        );
      }

      await load();
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
              <div>
                1) By default the forecast is calculated from each graph&apos;s
                own volume history — no API key or credits are used, and
                re-running gives the same result.
              </div>
              <div>
                2) Turning on <b>online research</b> additionally asks OpenAI to
                search the web for published figures, policy changes and
                festival dates, then adjust the calculated forecast. This
                SPENDS CREDITS on every selected graph — roughly two calls each,
                one of them a web search. If a call fails the calculated
                forecast is kept, so nothing breaks.
              </div>
              <div>
                3) A graph needs at least 6 months of history to be forecast.
              </div>
              <div>
                3) Ensure Flash segment mapping is set; otherwise the segment is guessed from the graph name.
              </div>
            </div>
          }
        />

        {failures.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`${failures.length} graph${
              failures.length === 1 ? "" : "s"
            } could not be generated`}
            description={
              <div style={{ fontSize: 12, maxHeight: 220, overflowY: "auto" }}>
                {failures.map((f, i) => (
                  <div key={i}>{f}</div>
                ))}
              </div>
            }
            closable
            onClose={() => setFailures([])}
          />
        )}

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
