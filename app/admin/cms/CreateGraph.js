"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Space,
  Spin,
  InputNumber,
  Row,
  Col,
  TreeSelect,
  Checkbox,
} from "antd";

export default function CreateGraph({
  context = "forecast",
  scoreSettingsKey,
} = {}) {
  const [form] = Form.useForm();
  const [datasets, setDatasets] = useState([]);
  const [hierarchyMap, setHierarchyMap] = useState({});
  const [yearNames, setYearNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [streamDropdowns, setStreamDropdowns] = useState([]);
  const [selectedStreamPath, setSelectedStreamPath] = useState([]);
  const [allVolumeDatasets, setAllVolumeDatasets] = useState([]);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [aiEnabled, setAiEnabled] = useState(false); // AI inputs optional

  const resolvedScoreSettingsKey =
    scoreSettingsKey ||
    (context === "flash" ? "flashScoreSettings" : "scoreSettings");

  const forecastTypes = [
    { label: "Linear Regression", value: "linear" },
    { label: "Survey Avg (Score-Based)", value: "score" },
    { label: "BYOF (User)", value: "byof" },
    { label: "AI Forecast", value: "ai" },
    { label: "Race Forecast", value: "race" },
  ];
  const chartTypes = [
    { label: "Line Chart", value: "line" },
    { label: "Bar Chart", value: "bar" },
    { label: "Pie Chart", value: "pie" },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [volRows, hierarchy, scoreSettings] = await Promise.all([
          fetch("/api/volumeData", {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          }).then((r) => r.json()),
          fetch("/api/contentHierarchy", {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          }).then((r) => r.json()),
          fetch(
            `/api/scoreSettings?key=${encodeURIComponent(
              resolvedScoreSettingsKey,
            )}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
              },
            },
          ).then((r) => r.json()),
        ]);

        setContentHierarchy(hierarchy);
        setYearNames(scoreSettings.yearNames || []);
        setDatasets(
          volRows.map((d) => ({ ...d, parsedStream: d.stream.split(",") })),
        );
        const rootKeys = hierarchy
          .filter((n) => n.parent_id === null)
          .map((n) => n.id.toString());

        setExpandedKeys(rootKeys);

        // Flash graphs do NOT use dataset_ids for historical values (Flash uses /api/flash-reports/overall-chart-data),
        // but we keep dataset selection to avoid CMS confusion by auto-selecting & locking to an "Overall" dataset.
        if (context === "flash") {
          try {
            const overallNode =
              hierarchy.find((n) => /\boverall\b/i.test(n?.name || "")) ||
              hierarchy.find((n) => /overall/i.test(n?.name || "")) ||
              hierarchy.find((n) => n.parent_id === null) ||
              null;

            let path = [];
            if (overallNode) {
              let cur = overallNode;
              while (cur) {
                path.unshift(cur.id.toString());
                cur = hierarchy.find((n) => n.id === cur.parent_id);
              }
              setSelectedStreamPath(path);
            }

            const pathStr = path.length ? path.join(",") : "";
            const candidates = pathStr
              ? volRows.filter((d) =>
                  String(d.stream || "").startsWith(pathStr),
                )
              : [];

            const byNewest = (a, b) =>
              new Date(b.createdAt || b.created_at || 0).getTime() -
              new Date(a.createdAt || a.created_at || 0).getTime();

            const chosen =
              (candidates && candidates.length
                ? [...candidates].sort(byNewest)[0]
                : [...volRows].sort(byNewest)[0]) || null;

            form.setFieldsValue({
              chartType: "line",
              forecastTypes: ["linear", "score", "byof", "ai", "race"],
              datasetId: chosen ? chosen.id : undefined,
            });
          } catch (e) {
            // non-fatal
          }
        }
      } catch (e) {
        console.error(e);
        message.error("Failed to load datasets or hierarchy");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!contentHierarchy.length) return;

    const roots = contentHierarchy.filter((n) => n.parent_id === null);

    if (roots.length === 1) {
      const rootId = roots[0].id.toString();
      const initialDropdowns = [{ level: 0, options: roots, selected: rootId }];
      setStreamDropdowns(initialDropdowns);
      updateStreamDropdown(rootId, 0, initialDropdowns);
    } else {
      setStreamDropdowns([{ level: 0, options: roots, selected: null }]);
    }
  }, [contentHierarchy]);

  const updateStreamDropdown = (selectedId, levelIndex, dropdownsOverride) => {
    const updated = dropdownsOverride
      ? [...dropdownsOverride]
      : [...streamDropdowns];
    if (!updated[levelIndex]) return;

    updated[levelIndex].selected = selectedId;
    updated.splice(levelIndex + 1);

    const children = contentHierarchy.filter(
      (n) => n.parent_id === parseInt(selectedId),
    );
    if (children.length) {
      updated.push({
        level: levelIndex + 1,
        options: children,
        selected: null,
      });
    }

    setStreamDropdowns(updated);

    const path = updated.map((d) => d.selected).filter(Boolean);
    setSelectedStreamPath(path);
  };

  const filteredDatasetOptions = useMemo(() => {
    if (!selectedStreamPath.length) return [];

    const pathStr = selectedStreamPath.join(",");
    return datasets
      .filter((d) => d.stream.startsWith(pathStr))
      .map((d) => {
        const streamNames = d.stream
          .split(",")
          .map(
            (id) => contentHierarchy.find((n) => n.id.toString() === id)?.name,
          )
          .join(" > ");
        const date = new Date(d.createdAt).toLocaleDateString();
        return {
          label: `#${d.id} — ${streamNames} (${date})`,
          value: d.id,
        };
      });
  }, [datasets, selectedStreamPath, contentHierarchy]);

  const buildTreeData = (nodes, parentId = null) => {
    return nodes
      .filter((n) => n.parent_id === parentId)
      .map((node) => {
        const children = buildTreeData(nodes, node.id);
        return {
          title: node.name,
          value: node.id.toString(),
          key: node.id.toString(),
          children: children.length ? children : undefined,
        };
      });
  };

  const treeData = useMemo(
    () => buildTreeData(contentHierarchy),
    [contentHierarchy],
  );

  const onFinish = useCallback(
    async (values) => {
      try {
        // Build AI forecast (optional)
        const aiForecast = {};
        let aiCount = 0;
        if (values.chartType === "line" && aiEnabled) {
          for (let y of yearNames) {
            const v = values[`ai_${y}`];
            if (v !== undefined && v !== null && v !== "") {
              aiForecast[y] = v;
              aiCount++;
            }
          }
        }

        // Build Race forecast (required for line)
        const raceForecast = {};
        if (values.chartType === "line") {
          for (let y of yearNames) {
            raceForecast[y] = values[`race_${y}`];
          }
        }

        const datasetIdsArr = values.datasetId
          ? [Number(values.datasetId)]
          : null;

        // Send BOTH styles to be compatible with old or new API
        const payload = {
          // shared
          name: values.name,
          description: values.description || "",
          summary: values.summary || "",

          // new snake_case
          dataset_ids: datasetIdsArr,
          chart_type: values.chartType,
          forecast_types: values.forecastTypes || [],
          race_forecast: values.chartType === "line" ? raceForecast : {}, // bar/pie => {}
          ai_forecast: aiEnabled && aiCount ? aiForecast : {}, // never null
          context,
          score_settings_key: resolvedScoreSettingsKey,
          flash_segment:
            context === "flash" ? values.flashSegment || null : null,

          // old camelCase (back-compat)
          datasetIds: datasetIdsArr,
          chartType: values.chartType,
          forecastTypes: values.forecastTypes || [],
          raceForecast: values.chartType === "line" ? raceForecast : {},
          aiForecast: aiEnabled && aiCount ? aiForecast : {},
          scoreSettingsKey: resolvedScoreSettingsKey,
          flashSegment:
            context === "flash" ? values.flashSegment || null : null,
        };

        const res = await fetch("/api/graphs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Save failed");
        }

        // Handle all possible response shapes
        const graph = data?.graph || data; // if API returns {graph}, use it; else use top-level
        const createdId = graph?.id ?? data?.id;
        const createdName = graph?.name ?? values.name;

        message.success(`Graph "${createdName}" (#${createdId}) created!`);
        form.resetFields();
        setAiEnabled(false);
      } catch (e) {
        message.error(e.message || "Creation failed");
      }
    },
    [form, yearNames, aiEnabled, context, resolvedScoreSettingsKey],
  );

  if (loading) {
    return (
      <Spin
        tip="Loading datasets..."
        style={{ display: "block", marginTop: 50 }}
      />
    );
  }

  return (
    <div style={{ margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Create Graph</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ chartType: "line" }}
        style={{}}
      >
        <Row gutter={[16, 16]}>
          {/* ───────────────── Left Column: Meta & Filters ───────────────── */}
          <Col xs={24} lg={10} xl={12}>
            <Form.Item
              name="name"
              label="Graph Name"
              rules={[{ required: true, message: "Please enter a graph name" }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="e.g. Sales Trend 2020–2025" allowClear />
            </Form.Item>

            {/* Summary/Description are not needed for Flash graphs */}
            {context !== "flash" && (
              <>
                <Form.Item
                  name="summary"
                  label="Summary (30 words)"
                  style={{ marginBottom: 12 }}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Add a brief summary..."
                    allowClear
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Description (300 words)"
                  style={{ marginBottom: 12 }}
                >
                  <Input.TextArea
                    rows={5}
                    placeholder="Add a short description..."
                    allowClear
                  />
                </Form.Item>
              </>
            )}

            {/* Stream filter + Dataset in a row */}
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  label="Historical Dataset Filter"
                  style={{ marginBottom: 12 }}
                >
                  <TreeSelect
                    style={{ width: "100%" }}
                    value={
                      selectedStreamPath[selectedStreamPath.length - 1] || null
                    }
                    dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
                    treeData={treeData}
                    placeholder={
                      context === "flash"
                        ? "Locked to Overall"
                        : "Select stream"
                    }
                    disabled={context === "flash"}
                    onChange={(val) => {
                      const path = [];
                      let current = contentHierarchy.find(
                        (n) => n.id.toString() === val,
                      );
                      while (current) {
                        path.unshift(current.id.toString());
                        current = contentHierarchy.find(
                          (n) => n.id === current.parent_id,
                        );
                      }
                      setSelectedStreamPath(path);
                    }}
                    treeExpandedKeys={expandedKeys}
                    onTreeExpand={(keys) => setExpandedKeys(keys)}
                    showSearch
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="datasetId"
                  label="Historical Dataset"
                  rules={
                    context === "flash"
                      ? []
                      : [{ required: true, message: "Select a dataset" }]
                  }
                  style={{ marginBottom: 12 }}
                >
                  <Select
                    placeholder="Choose a dataset"
                    options={filteredDatasetOptions}
                    disabled={context === "flash"}
                    allowClear
                    showSearch
                  />
                </Form.Item>
              </Col>
            </Row>

            {context === "flash" && (
              <div
                style={{
                  marginTop: -4,
                  marginBottom: 12,
                  fontSize: 12,
                  color: "rgba(0,0,0,0.65)",
                }}
              >
                For <b>Flash Reports</b>, historical values come from the Flash
                monthly stream (Overall chart API). The dataset is locked to an{" "}
                <b>Overall</b> dataset here to avoid confusion.
              </div>
            )}

            {/* Chart type + Forecast methods in a row */}
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item
                  name="chartType"
                  label="Chart Type"
                  rules={[{ required: true, message: "Select a chart type" }]}
                  style={{ marginBottom: 12 }}
                >
                  <Select
                    placeholder="Select visualization"
                    options={chartTypes}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) =>
                    prev.chartType !== curr.chartType
                  }
                >
                  {({ getFieldValue }) =>
                    getFieldValue("chartType") === "line" ? (
                      <Form.Item
                        name="forecastTypes"
                        label="Forecast Methods"
                        rules={[
                          {
                            required: true,
                            message: "Select forecasting methods",
                          },
                        ]}
                        style={{ marginBottom: 12 }}
                      >
                        <Select
                          mode="multiple"
                          placeholder="Select methods"
                          options={forecastTypes}
                          allowClear
                        />
                      </Form.Item>
                    ) : (
                      <div />
                    )
                  }
                </Form.Item>
              </Col>
            </Row>

            {context === "flash" && (
              <Form.Item
                name="flashSegment"
                label="Flash Segment (optional)"
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="Overall / PV / CV / 2W..."
                  allowClear
                  options={[
                    { label: "Overall", value: "overall" },
                    { label: "PV", value: "pv" },
                    { label: "CV", value: "cv" },
                    { label: "2W", value: "2w" },
                    { label: "3W", value: "3w" },
                    { label: "Tractor", value: "tractor" },
                    { label: "Truck", value: "truck" },
                    { label: "Bus", value: "bus" },
                  ]}
                />
              </Form.Item>
            )}
          </Col>

          {/* ──────────────── Right Column: Forecast Inputs ──────────────── */}
          <Col xs={24} lg={10} xl={12}>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.chartType !== curr.chartType}
            >
              {({ getFieldValue }) =>
                getFieldValue("chartType") === "line" ? (
                  context === "flash" ? (
                    <div
                      style={{
                        padding: 12,
                        border: "1px solid #f0f0f0",
                        borderRadius: 8,
                        background: "#fafafa",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        Flash graphs use month keys (YYYY-MM)
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: "rgba(0,0,0,0.65)",
                        }}
                      >
                        Create the graph here (questions + dataset + forecast
                        types). Then go to <b>All Graphs</b> in this Flash tab
                        to add/update AI &amp; Race forecasts using month keys
                        like <b>2026-01</b>.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* AI toggle (optional) */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <strong>AI Forecast Volume</strong>
                        <Checkbox
                          checked={aiEnabled}
                          onChange={(e) => setAiEnabled(e.target.checked)}
                        >
                          Provide AI forecast (optional)
                        </Checkbox>
                      </div>

                      {aiEnabled && (
                        <div style={{ marginBottom: 12 }}>
                          <Row gutter={[8, 8]}>
                            {yearNames.map((year) => (
                              <Col
                                key={`ai_${year}`}
                                xs={12}
                                sm={8}
                                md={6}
                                lg={6}
                                xl={6} // responsive grid: 2–4 per row
                              >
                                <Form.Item
                                  name={`ai_${year}`}
                                  label={year}
                                  labelCol={{ span: 24 }}
                                  wrapperCol={{ span: 24 }}
                                  // No "required" rule -> optional
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber
                                    min={0}
                                    style={{ width: "100%" }}
                                  />
                                </Form.Item>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}

                      {/* Race Insights (required) */}
                      <div style={{ marginTop: 4, marginBottom: 8 }}>
                        <strong>Race Insights Forecast Volume</strong>
                      </div>
                      <div>
                        <Row gutter={[8, 8]}>
                          {yearNames.map((year) => (
                            <Col
                              key={`race_${year}`}
                              xs={12}
                              sm={8}
                              md={6}
                              lg={6}
                              xl={6} // responsive grid: 2–4 per row
                            >
                              <Form.Item
                                name={`race_${year}`}
                                label={year}
                                labelCol={{ span: 24 }}
                                wrapperCol={{ span: 24 }}
                                rules={[
                                  {
                                    required: true,
                                    message: `Enter Race forecast for ${year}`,
                                  },
                                ]}
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber
                                  min={0}
                                  style={{ width: "100%" }}
                                />
                              </Form.Item>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </>
                  )
                ) : null
              }
            </Form.Item>

            <Form.Item style={{ marginTop: 16 }}>
              <Space wrap>
                <Button type="primary" htmlType="submit">
                  Create Graph
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setAiEnabled(false);
                  }}
                >
                  Reset
                </Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
}
