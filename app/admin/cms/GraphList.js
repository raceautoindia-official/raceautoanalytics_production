"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table,
  Tag,
  Space,
  Tooltip,
  Button,
  message,
  Popconfirm,
  Empty,
  Spin,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
  Input,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";

// Default to forecast context so the Forecast CMS never accidentally lists Flash graphs
export default function GraphList({ context = "forecast" } = {}) {
  const [graphs, setGraphs] = useState([]);
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [volumeDataMap, setVolumeDataMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editGraph, setEditGraph] = useState(null);
  const [aiForecastRows, setAiForecastRows] = useState([]);
  const [raceForecastRows, setRaceForecastRows] = useState([]);
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);

  const isFlashGraph = (editGraph?.context || context) === "flash";

  // Fetch all three endpoints in parallel
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const graphsUrl = context
        ? `/api/graphs?context=${encodeURIComponent(context)}`
        : "/api/graphs";

      const [graphsRes, hierarchyRes, volRowsRes] = await Promise.all([
        fetch(graphsUrl, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        }).then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch("/api/contentHierarchy", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        }).then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch("/api/volumeData", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        }).then((r) => (r.ok ? r.json() : Promise.reject())),
      ]);

      setGraphs(graphsRes);
      setVisibleCount(graphsRes.length);
      setContentHierarchy(hierarchyRes);

      // Build a map of volumeData by ID
      const volMap = {};
      volRowsRes.forEach((e) => {
        volMap[e.id] = e;
      });
      setVolumeDataMap(volMap);
    } catch (err) {
      console.error(err);
      message.error("Failed to load graphs or related data");
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    setVisibleCount(graphs.length);
  }, [graphs]);

  // Build lookups once
  const nodeNameById = useMemo(() => {
    const map = new Map();
    (contentHierarchy || []).forEach((n) => map.set(Number(n.id), n.name));
    return map;
  }, [contentHierarchy]);

  const parseDatasetId = (dataset_ids) => {
    if (Array.isArray(dataset_ids)) return Number(dataset_ids[0]);
    if (typeof dataset_ids === "number") return dataset_ids;
    if (typeof dataset_ids === "string") {
      try {
        const parsed = JSON.parse(dataset_ids);
        if (Array.isArray(parsed)) return Number(parsed[0]);
        const num = Number(dataset_ids);
        return Number.isFinite(num) ? num : undefined;
      } catch {
        const num = Number(dataset_ids);
        return Number.isFinite(num) ? num : undefined;
      }
    }
    return undefined;
  };

  const namesFromStream = (stream) => {
    if (!stream) return [];
    const ids = String(stream)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter(Boolean);
    return ids.map((id) => nodeNameById.get(id) || String(id));
  };

  const getCategoryAndRegion = (datasetId) => {
    const ds = volumeDataMap[Number(datasetId)];
    if (!ds || !ds.stream) return { category: "—", region: "—" };
    const names = namesFromStream(ds.stream);
    const category = names[2] ?? "—"; // 3rd child
    const region = names[names.length - 2] ?? "—"; // penultimate
    return { category, region };
  };

  const preview = (txt, n = 120) => {
    if (!txt) return "";
    return txt.length > n ? `${txt.slice(0, n)}…` : txt;
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Delete a graph and remove it from local state (no full reload)
  const handleDelete = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/graphs?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
      });
      if (!res.ok) throw new Error();
      message.success("Deleted successfully");
      setGraphs((prev) => prev.filter((g) => g.id !== id));
    } catch {
      message.error("Delete failed");
    }
  }, []);

  const handleEdit = (record) => {
    setEditGraph(record);
    setDescription(record.description || "");
    setSummary(record.summary || "");
    setAiForecastRows(
      Object.entries(record.ai_forecast || {}).map(([year, value]) => ({
        year,
        value,
      })),
    );
    setRaceForecastRows(
      Object.entries(record.race_forecast || {}).map(([year, value]) => ({
        year,
        value,
      })),
    );
    setEditModalVisible(true);
  };

  const handleForecastChange = (setter, index, key, value) => {
    setter((prev) => {
      const copy = [...prev];
      copy[index][key] = value;
      return copy;
    });
  };

  const handleAddRow = (setter) => {
    setter((prev) => [...prev, { year: "", value: "" }]);
  };

  const handleRemoveRow = (setter, index) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const isValidYYYYMM = (s) => {
    const m = /^\d{4}-\d{2}$/.exec(String(s || "").trim());
    if (!m) return false;
    const mm = Number(String(s).slice(5, 7));
    return mm >= 1 && mm <= 12;
  };

  // Build distinct filter options for Category and Region
  const categoryFilters = useMemo(() => {
    const set = new Set();
    (graphs || []).forEach((g) => {
      const datasetId = parseDatasetId(g.dataset_ids);
      const { category } = getCategoryAndRegion(datasetId);
      set.add(category || "—");
    });
    return Array.from(set)
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((v) => ({ text: v, value: v }));
  }, [graphs, volumeDataMap, nodeNameById]);

  const regionFilters = useMemo(() => {
    const set = new Set();
    (graphs || []).forEach((g) => {
      const datasetId = parseDatasetId(g.dataset_ids);
      const { region } = getCategoryAndRegion(datasetId);
      set.add(region || "—");
    });
    return Array.from(set)
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((v) => ({ text: v, value: v }));
  }, [graphs, volumeDataMap, nodeNameById]);

  // Column definitions (memoized so they don’t recreate unnecessarily)
  const columns = useMemo(() => {
    const isFlashList = context === "flash";

    const cols = [
      { title: "ID", dataIndex: "id", width: 60 },
      { title: "Name", dataIndex: "name", ellipsis: true },
    ];

    // Category/Region are derived from historical datasets; they confuse Flash Graphs (Flash uses segment mapping),
    // so we hide them only for the Flash Graphs table.
    if (!isFlashList) {
      cols.push(
        {
          title: "Category",
          key: "category",
          filters: categoryFilters,
          filterMultiple: true,
          filterSearch: true,
          onFilter: (val, row) => {
            const datasetId = parseDatasetId(row.dataset_ids);
            const { category } = getCategoryAndRegion(datasetId);
            return (category || "—") === val;
          },
          render: (_, record) => {
            const datasetId = parseDatasetId(record.dataset_ids);
            return getCategoryAndRegion(datasetId).category;
          },
        },
        {
          title: "Region",
          key: "region",
          filters: regionFilters,
          filterMultiple: true,
          filterSearch: true,
          onFilter: (val, row) => {
            const datasetId = parseDatasetId(row.dataset_ids);
            const { region } = getCategoryAndRegion(datasetId);
            return (region || "—") === val;
          },
          render: (_, record) => {
            const datasetId = parseDatasetId(record.dataset_ids);
            return getCategoryAndRegion(datasetId).region;
          },
        },
      );
    }

    // Core columns
    cols.push(
      // Chart type unchanged (renamed title for clarity)
      {
        title: "Chart Type",
        dataIndex: "chart_type",
        render: (t) =>
          typeof t === "string" ? t.charAt(0).toUpperCase() + t.slice(1) : "—",
        filters: [
          { text: "Line", value: "line" },
          { text: "Bar", value: "bar" },
          { text: "Pie", value: "pie" },
        ],
        onFilter: (val, row) => row.chart_type === val,
        width: 120,
      },

      // Keep your existing Forecasts column as-is
      {
        title: "Forecasts",
        key: "forecast_summary",
        render: (_, record) => {
          const { ai_forecast, race_forecast } = record;

          const formatTooltip = (forecast) =>
            Object.entries(forecast || {})
              .map(([year, val]) => `${year}: ${val}`)
              .join("\n");

          const yearRange = (forecast) => {
            const years = Object.keys(forecast || {});
            return years.length
              ? `${years[0]}–${years[years.length - 1]}`
              : "null";
          };

          return (
            <Space size="small" direction="vertical">
              <Tooltip
                title={ai_forecast ? formatTooltip(ai_forecast) : "null"}
              >
                <Tag color="blue">AI: {yearRange(ai_forecast)}</Tag>
              </Tooltip>
              <Tooltip
                title={race_forecast ? formatTooltip(race_forecast) : "null"}
              >
                <Tag color="geekblue">Race: {yearRange(race_forecast)}</Tag>
              </Tooltip>
            </Space>
          );
        },
      },
    );

    // Flash graphs don't use Summary/Description, so hide writeups column in Flash Graphs table
    if (!isFlashList) {
      cols.push({
        title: "Writeups",
        key: "writeups",
        render: (_, record) => {
          const hasSummary = Boolean(record.summary && record.summary.trim());
          const hasDescription = Boolean(
            record.description && record.description.trim(),
          );

          const tooltipContent = (
            <div style={{ maxWidth: 420 }}>
              {hasSummary && (
                <div style={{ marginBottom: 6 }}>
                  <strong>Summary:</strong> {preview(record.summary)}
                </div>
              )}
              {hasDescription && (
                <div>
                  <strong>Description:</strong> {preview(record.description)}
                </div>
              )}
              {!hasSummary && !hasDescription && <em>No writeups</em>}
            </div>
          );

          return (
            <Tooltip placement="topLeft" title={tooltipContent}>
              <span>
                <Tag color={hasSummary ? "processing" : undefined}>
                  Summary {hasSummary ? "✓" : "✗"}
                </Tag>
                <Tag color={hasDescription ? "success" : undefined}>
                  Description {hasDescription ? "✓" : "✗"}
                </Tag>
              </span>
            </Tooltip>
          );
        },
      });
    }

    cols.push(
      {
        title: "Created",
        dataIndex: "created_at",
        render: (dt) => (dt ? new Date(dt).toLocaleString() : "—"),
        width: 170,
        sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      },

      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Popconfirm
              title="Delete this graph?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Edit
            </Button>
          </Space>
        ),
      },
    );

    return cols;
    // 🔁 Dependencies: we derive Category/Region from volumeDataMap + nodeNameById
  }, [
    context,
    volumeDataMap,
    nodeNameById,
    handleDelete,
    categoryFilters,
    regionFilters,
  ]);

  if (loading) {
    return (
      <Spin
        tip="Loading graphs..."
        style={{ display: "block", marginTop: 50 }}
      />
    );
  }

  if (!graphs.length) {
    return (
      <Empty description="No graphs available" style={{ marginTop: 50 }} />
    );
  }

  return (
    <>
      <Modal
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={async () => {
          const ai = {};
          const race = {};

          const badKeys = [];
          const put = (out, r) => {
            const key = String(r?.year ?? "").trim();
            const val = r?.value;
            if (!key) return;
            if (val === "" || val === null || val === undefined) return;

            if (isFlashGraph && !isValidYYYYMM(key)) {
              badKeys.push(key);
              return;
            }
            out[key] = Number(val);
          };

          aiForecastRows.forEach((r) => put(ai, r));
          raceForecastRows.forEach((r) => put(race, r));

          if (isFlashGraph && badKeys.length) {
            message.warning(
              `Skipped invalid month keys: ${badKeys.slice(0, 6).join(", ")}${
                badKeys.length > 6 ? "…" : ""
              }`,
            );
          }

          try {
            const res = await fetch("/api/graphs", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
              },
              body: JSON.stringify({
                id: editGraph.id,
                name: editGraph.name,
                // Flash graphs don't use writeups; keep existing values untouched
                description: isFlashGraph
                  ? editGraph.description || ""
                  : description,
                summary: isFlashGraph ? editGraph.summary || "" : summary,
                dataset_ids: editGraph.dataset_ids,
                forecast_types: editGraph.forecast_types,
                chart_type: editGraph.chart_type,
                ai_forecast: Object.keys(ai).length ? ai : null,
                race_forecast: Object.keys(race).length ? race : null,
                context: editGraph.context || "forecast",
                score_settings_key:
                  editGraph.score_settings_key || "scoreSettings",
                flash_segment: editGraph.flash_segment || null,
              }),
            });

            if (!res.ok) throw new Error();
            message.success("Forecast updated");
            setEditModalVisible(false);
            loadAll();
          } catch {
            message.error("Update failed");
          }
        }}
        title={`Edit Forecasts for: ${editGraph?.name}`}
        width={600}
        okText="Save"
      >
        {!isFlashGraph && (
          <Form layout="vertical">
            <Form.Item label="Summary">
              <Input.TextArea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Enter summary"
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>

            <Form.Item label="Description">
              <Input.TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            </Form.Item>
          </Form>
        )}

        <h4>AI Forecast</h4>
        {aiForecastRows.map((row, i) => (
          <Row gutter={8} key={`ai-${i}`} style={{ marginBottom: 8 }}>
            <Col span={10}>
              {isFlashGraph ? (
                <Input
                  placeholder="YYYY-MM"
                  value={row.year}
                  onChange={(e) =>
                    handleForecastChange(
                      setAiForecastRows,
                      i,
                      "year",
                      e.target.value,
                    )
                  }
                />
              ) : (
                <InputNumber
                  placeholder="Year"
                  value={row.year}
                  onChange={(val) =>
                    handleForecastChange(setAiForecastRows, i, "year", val)
                  }
                  style={{ width: "100%" }}
                />
              )}
            </Col>
            <Col span={10}>
              <InputNumber
                placeholder="Value"
                value={row.value}
                onChange={(val) =>
                  handleForecastChange(setAiForecastRows, i, "value", val)
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col span={4}>
              <Button
                danger
                onClick={() => handleRemoveRow(setAiForecastRows, i)}
              >
                Remove
              </Button>
            </Col>
          </Row>
        ))}
        <Button
          type="dashed"
          onClick={() => handleAddRow(setAiForecastRows)}
          style={{ marginBottom: 16 }}
        >
          + Add AI Forecast
        </Button>

        <h4>Race Forecast</h4>
        {raceForecastRows.map((row, i) => (
          <Row gutter={8} key={`race-${i}`} style={{ marginBottom: 8 }}>
            <Col span={10}>
              {isFlashGraph ? (
                <Input
                  placeholder="YYYY-MM"
                  value={row.year}
                  onChange={(e) =>
                    handleForecastChange(
                      setRaceForecastRows,
                      i,
                      "year",
                      e.target.value,
                    )
                  }
                />
              ) : (
                <InputNumber
                  placeholder="Year"
                  value={row.year}
                  onChange={(val) =>
                    handleForecastChange(setRaceForecastRows, i, "year", val)
                  }
                  style={{ width: "100%" }}
                />
              )}
            </Col>
            <Col span={10}>
              <InputNumber
                placeholder="Value"
                value={row.value}
                onChange={(val) =>
                  handleForecastChange(setRaceForecastRows, i, "value", val)
                }
                style={{ width: "100%" }}
              />
            </Col>
            <Col span={4}>
              <Button
                danger
                onClick={() => handleRemoveRow(setRaceForecastRows, i)}
              >
                Remove
              </Button>
            </Col>
          </Row>
        ))}
        <Button type="dashed" onClick={() => handleAddRow(setRaceForecastRows)}>
          + Add Race Forecast
        </Button>
      </Modal>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600 }}>Total graphs: {visibleCount}</div>
      </div>

      <Table
        rowKey="id"
        dataSource={graphs}
        columns={columns}
        onChange={(_, __, ___, extra) => {
          // after filters/sort, this is the number of rows currently visible
          setVisibleCount(extra.currentDataSource.length);
        }}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Total ${total} graphs`,
        }}
      />
    </>
  );
}
