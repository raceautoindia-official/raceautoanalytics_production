// File: app/admin/cms/AIForecast.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  TreeSelect,
  Input,
  Button,
  message,
  Row,
  Col,
  Spin,
  Collapse,
  Modal,
  Table,
  Select,
  Tooltip,
  Radio,
  Progress,
} from "antd";
import { useAIForecast } from "../../hooks/useAIForecast";
import { useAIFORMatter } from "../../hooks/useAIFORMATTER";
import { formatGraphForAI } from "../../utils/formatGraphForAI";

const { TextArea } = Input;
const { Text } = Typography;
const { Panel } = Collapse;

export default function AIForecast() {
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedStreamPath, setSelectedStreamPath] = useState([]);

  const [datasets, setDatasets] = useState([]);
  const [graphs, setGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [questionsMap, setQuestionsMap] = useState({});
  const [graphFilter, setGraphFilter] = useState("all");
  const [graphEligibilityMap, setGraphEligibilityMap] = useState({});

  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [categoryDefinition, setCategoryDefinition] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [definitionDraft, setDefinitionDraft] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [generationInProgress, setGenerationInProgress] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
  });
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [forecastResult, setForecastResult] = useState(null);
  const { generateForecast, loading: forecastLoading } = useAIForecast();
  const {
    formattedData,
    loading: formatting,
    error,
  } = useAIFORMatter(selectedGraph);

  useEffect(() => {
    async function load() {
      try {
        const [volRows, hierarchy] = await Promise.all([
          fetch("/api/volumeData").then((r) => r.json()),
          fetch("/api/contentHierarchy").then((r) => r.json()),
        ]);
        setDatasets(volRows);
        setContentHierarchy(hierarchy);

        const roots = hierarchy
          .filter((n) => n.parent_id === null)
          .map((n) => n.id.toString());
        setExpandedKeys(roots);

        const cats = hierarchy.filter((n) => n.parent_id === 76);
        setCategories(cats);
        if (cats.length) {
          const firstCat = cats[0];
          setSelectedCategoryId(firstCat.id);
          const defRes = await fetch(
            `/api/category-definition?categoryId=${firstCat.id}`
          );
          if (defRes.ok) {
            const data = await defRes.json();
            if (data.definition) setCategoryDefinition(data.definition);
          }
        }
      } catch {
        message.error("Failed to load hierarchy or volume data");
      }
    }
    load();
  }, []);

  useEffect(() => {
    fetch("/api/graphs")
      .then((r) => r.json())
      .then((data) => {
        const parsed = data.map((g) => {
          let ids = [];
          if (Array.isArray(g.dataset_ids)) ids = g.dataset_ids;
          else if (typeof g.dataset_ids === "string") {
            try {
              const parsed = JSON.parse(g.dataset_ids);
              ids = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              ids = [];
            }
          } else if (typeof g.dataset_ids === "number") {
            ids = [g.dataset_ids];
          }
          return { ...g, dataset_ids: ids };
        });
        setGraphs(parsed);
        Promise.all(
          parsed.map(async (g) => {
            const res = await fetch(`/api/questions?graphId=${g.id}`);
            if (!res.ok) return { graphId: g.id, questions: [] };
            const data = await res.json();
            return { graphId: g.id, questions: data };
          })
        ).then((questionData) => {
          const map = {};
          questionData.forEach(({ graphId, questions }) => {
            map[graphId] = questions;
          });
          setQuestionsMap(map);
        });
      })
      .catch(() => message.error("Could not load graphs"));
  }, []);

  useEffect(() => {
    async function evaluateEligibility() {
      try {
        const eligibility = await checkGraphEligibility(
          graphs,
          datasets,
          contentHierarchy
        );
        setGraphEligibilityMap(eligibility);
      } catch (err) {
        console.error("Eligibility check failed:", err);
      }
    }

    if (graphs.length && datasets.length && contentHierarchy.length) {
      evaluateEligibility();
    }
  }, [graphs, datasets, contentHierarchy]);

  const getRegionName = (stream) => {
    const ids = stream.split(",");
    const regionId = ids[ids.length - 2];
    const regionNode = contentHierarchy.find(
      (n) => n.id.toString() === regionId
    );
    return regionNode?.name || "Unknown";
  };

  const getCategoryName = (stream) => {
    const ids = stream.split(",");
    const categoryId = ids[2]; // third value
    const categoryNode = contentHierarchy.find(
      (n) => n.id.toString() === categoryId
    );
    return categoryNode?.name || "Unknown";
  };

  const filteredDatasetIds = useMemo(() => {
    if (!selectedStreamPath.length) return [];
    const prefix = selectedStreamPath.join(",");
    return datasets.filter((d) => d.stream.startsWith(prefix)).map((d) => d.id);
  }, [datasets, selectedStreamPath]);

  const filteredGraphs = useMemo(() => {
    if (!selectedStreamPath.length) return graphs;
    if (!filteredDatasetIds.length) return [];
    return graphs.filter((g) =>
      g.dataset_ids.some((id) => filteredDatasetIds.includes(id))
    );
  }, [graphs, selectedStreamPath, filteredDatasetIds]);

  const graphTableData = useMemo(() => {
    return filteredGraphs.map((g) => {
      const datasetIds = Array.isArray(g.dataset_ids)
        ? g.dataset_ids
        : typeof g.dataset_ids === "string"
        ? (() => {
            try {
              const parsed = JSON.parse(g.dataset_ids);
              return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              return [];
            }
          })()
        : typeof g.dataset_ids === "number"
        ? [g.dataset_ids]
        : [];

      const firstDataset = datasets.find((d) => datasetIds.includes(d.id));
      const region = firstDataset
        ? getRegionName(firstDataset.stream)
        : "Unknown";
      const category = firstDataset
        ? getCategoryName(firstDataset.stream)
        : "Unknown";

      const aiForecast = g.ai_forecast || {};
      const hasAIData = Object.keys(aiForecast).length > 0;
      const aiDataText = hasAIData
        ? Object.entries(aiForecast)
            .map(([year, value]) => `${year}: ${value}`)
            .join("\n")
        : null;

      const questions = questionsMap[g.id] || [];
      const numPositive = questions.filter((q) => q.type === "positive").length;
      const numNegative = questions.filter((q) => q.type === "negative").length;
      const hasQuestions = questions.length > 0;

      return {
        key: g.id,
        graphId: g.id,
        graphName: g.name,
        regionName: region,
        categoryName: category,
        hasAIData,
        aiDataText,
        hasQuestions,
        numPositive,
        numNegative,
      };
    });
  }, [filteredGraphs, datasets, contentHierarchy, questionsMap]);

  const filteredTableData = useMemo(() => {
    switch (graphFilter) {
      case "eligible":
        return graphTableData.filter(
          (g) => graphEligibilityMap[g.graphId]?.isEligible
        );
      case "eligibleNoData":
        return graphTableData.filter(
          (g) => graphEligibilityMap[g.graphId]?.isEligible && !g.hasAIData
        );
      case "notEligible":
        return graphTableData.filter(
          (g) => !graphEligibilityMap[g.graphId]?.isEligible
        );
      default:
        return graphTableData;
    }
  }, [graphFilter, graphTableData, graphEligibilityMap]);

  const graphColumns = [
    {
      title: "Graph Name",
      dataIndex: "graphName",
      key: "graphName",
    },
    {
      title: "Category",
      dataIndex: "categoryName",
      key: "categoryName",
    },
    {
      title: "Region",
      dataIndex: "regionName",
      key: "regionName",
    },
    {
      title: "AI Data",
      key: "aiData",
      render: (_, record) =>
        record.hasAIData ? (
          <Tooltip title={<pre style={{ margin: 0 }}>{record.aiDataText}</pre>}>
            <span style={{ color: "green" }}>Available</span>
          </Tooltip>
        ) : (
          <span style={{ color: "gray" }}>None</span>
        ),
    },
    {
      title: "Questions",
      key: "questions",
      render: (_, record) =>
        record.hasQuestions ? (
          <Tooltip
            title={`Positive: ${record.numPositive}\nNegative: ${record.numNegative}`}
          >
            <span style={{ color: "#1890ff" }}>Available</span>
          </Tooltip>
        ) : (
          <span style={{ color: "#999" }}>None</span>
        ),
    },
    {
      title: "Eligible",
      key: "eligible",
      render: (_, record) => {
        const status = graphEligibilityMap[record.graphId];
        if (!status) return <span style={{ color: "#999" }}>Checking…</span>;
        if (status.isEligible) {
          return <span style={{ color: "green" }}>Yes</span>;
        } else {
          return (
            <Tooltip
              title={
                <div>
                  <strong>Missing:</strong>
                  <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                    {status.missingFields.map((field) => (
                      <li key={field}>
                        {{
                          graphName: "Graph Name",
                          categoryName: "Category Name",
                          categoryDefinition: "Category Definition",
                          region: "Region",
                          volumeData: "Volume Data",
                          years: "Years",
                          questions: "Questions",
                          forecastGraph: "Not a forecast graph",
                        }[field] || field}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            >
              <span style={{ color: "red" }}>No</span>
            </Tooltip>
          );
        }
      },
    },

    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button type="link" onClick={() => setSelectedGraph(record.graphId)}>
          Select
        </Button>
      ),
    },
  ];

  const handleGenerate = async () => {
    if (!selectedRowKeys.length)
      return message.error("No eligible graphs selected.");
    setAnimatedPercent(0);
    setGenerationInProgress(true);
    setGenerationProgress({ current: 0, total: selectedRowKeys.length });
    setForecastResult(null);

    for (let i = 0; i < selectedRowKeys.length; i++) {
      const graphId = selectedRowKeys[i];
      setGenerationProgress({ current: i + 1, total: selectedRowKeys.length });

      try {
        const formatted = await formatGraphForAI(graphId);
        const result = await generateForecast(formatted);
        setForecastResult(result);

        // 🟢 Step 1: Get the full graph object from your graphs list
        const graphToUpdate = graphs.find((g) => g.id === graphId);
        if (!graphToUpdate) {
          console.warn("Graph not found in memory:", graphId);
          continue;
        }

        // 🟢 Step 2: Send updated ai_forecast to your API
        const response = await fetch("/api/graphs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: graphToUpdate.id,
            name: graphToUpdate.name,
            description: graphToUpdate.description,
            summary: graphToUpdate.summary,
            datasetIds: graphToUpdate.dataset_ids,
            forecastTypes: graphToUpdate.forecast_types,
            chartType: graphToUpdate.chart_type,
            aiForecast: result, // ⬅️ this is the new AI forecast from OpenAI
            raceForecast: graphToUpdate.race_forecast,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          console.error("Failed to update AI forecast:", err);
        }
      } catch (err) {
        console.error(`Failed to generate forecast for graph ${graphId}`, err);
      }
    }

    setGenerationInProgress(false);
    message.success("AI Forecast generation completed.");
    await fetch("/api/graphs")
      .then((r) => r.json())
      .then((updated) => setGraphs(updated));
    setSelectedRowKeys(0);
  };

  useEffect(() => {
    if (!generationInProgress) return;

    const targetPercent = Math.round(
      (generationProgress.current / generationProgress.total) * 100
    );

    const interval = setInterval(() => {
      setAnimatedPercent((prev) => {
        if (prev >= targetPercent) {
          clearInterval(interval);
          return targetPercent;
        }
        return prev + 1; // smooth 1% increments
      });
    }, 30); // change speed here

    return () => clearInterval(interval);
  }, [generationProgress]);

  const openDefinitionModal = () => {
    setDefinitionDraft(categoryDefinition || "");
    setModalOpen(true);
  };

  const saveDefinitionFromModal = async () => {
    try {
      const res = await fetch("/api/category-definition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          definition: definitionDraft,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setCategoryDefinition(definitionDraft);
      setModalOpen(false);
      message.success("Definition saved");
    } catch {
      message.error("Save failed");
    }
  };

  const buildTree = (nodes, parentId = null) =>
    nodes
      .filter((n) => n.parent_id === parentId)
      .map((n) => ({
        title: n.name,
        value: n.id.toString(),
        key: n.id.toString(),
        children: buildTree(nodes, n.id),
      }));

  const treeData = useMemo(
    () => buildTree(contentHierarchy),
    [contentHierarchy]
  );

  async function checkGraphEligibility(graphs, datasets, hierarchy) {
    const result = {};

    const scoreSettingsRes = await fetch("/api/scoreSettings");
    const scoreSettings = await scoreSettingsRes.json();
    const years = scoreSettings.yearNames || [];

    await Promise.all(
      graphs.map(async (graph) => {
        const dataset = datasets.find((d) => graph.dataset_ids.includes(d.id));
        if (!dataset) return;

        const streamParts = dataset.stream.split(",");
        const categoryId = streamParts[2];
        const regionId = streamParts.at(-2);

        const categoryNode = hierarchy.find(
          (n) => n.id.toString() === categoryId
        );
        const regionNode = hierarchy.find((n) => n.id.toString() === regionId);
        const categoryName = categoryNode?.name || "";
        const region = regionNode?.name || "";

        const volumeData = dataset.data || {};

        const defRes = await fetch(
          `/api/category-definition?categoryId=${categoryId}`
        );
        const defJson = await defRes.json();
        const categoryDefinition = defJson?.definition || "";

        const questionRes = await fetch(`/api/questions?graphId=${graph.id}`);
        const questions = await questionRes.json();

        const formattedQuestions = questions.map((q) => ({
          text: q.text,
          weight: q.weight,
          type: q.type,
        }));

        // Now check for missing fields
        const missing = [];
        if (!graph.name) missing.push("graphName");
        if (
          !Array.isArray(graph.forecast_types) ||
          graph.forecast_types.length === 0
        ) {
          missing.push("forecastGraph");
        }
        if (!categoryName) missing.push("categoryName");
        if (!categoryDefinition) missing.push("categoryDefinition");
        if (!region) missing.push("region");
        if (!volumeData || Object.keys(volumeData).length === 0)
          missing.push("volumeData");
        if (!years.length) missing.push("years");
        if (!formattedQuestions.length) missing.push("questions");

        result[graph.id] = {
          isEligible: missing.length === 0,
          missingFields: missing,
        };
      })
    );

    return result;
  }

  return (
    <Collapse defaultActiveKey={["generator"]}>
      {/* ─── Category Definition ────────────────────────────── */}
      <Panel header="Category Definition" key="definition">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Text strong>Category:</Text>
            <Select
              value={selectedCategoryId}
              onChange={async (val) => {
                setSelectedCategoryId(val);
                const res = await fetch(
                  `/api/category-definition?categoryId=${val}`
                );
                if (res.ok) {
                  const data = await res.json();
                  setCategoryDefinition(data.definition || "");
                }
              }}
              style={{ width: "100%" }}
            >
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>

        <Text strong>Definition:</Text>
        <div
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 4,
            padding: "8px 12px",
            marginBottom: 8,
            background: "#fafafa",
            minHeight: "64px",
          }}
        >
          {categoryDefinition ? (
            <span>{categoryDefinition}</span>
          ) : (
            <em style={{ color: "#999" }}>No definition added yet.</em>
          )}
        </div>

        <Button type="default" onClick={openDefinitionModal}>
          {categoryDefinition ? "Edit Definition" : "Add Definition"}
        </Button>

        <Modal
          title={
            categoryDefinition
              ? "Edit Category Definition"
              : "Add Category Definition"
          }
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={saveDefinitionFromModal}
          okText="Save"
        >
          <TextArea
            value={definitionDraft}
            onChange={(e) => setDefinitionDraft(e.target.value)}
            placeholder="Enter category definition..."
            autoSize={{ minRows: 3, maxRows: 6 }}
          />
        </Modal>
      </Panel>

      {/* ─── Forecast Generation ────────────────────────────── */}
      <Panel header="AI Forecast Generator" key="generator">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Text strong>Stream:</Text>
            <TreeSelect
              style={{ width: "100%" }}
              value={selectedStreamPath.slice(-1)[0] || null}
              treeData={treeData}
              treeExpandedKeys={expandedKeys}
              onTreeExpand={setExpandedKeys}
              onChange={(val) => {
                const path = [];
                let cur = contentHierarchy.find((n) => n.id.toString() === val);
                while (cur) {
                  path.unshift(cur.id.toString());
                  cur = contentHierarchy.find((n) => n.id === cur.parent_id);
                }
                setSelectedStreamPath(path);
              }}
              placeholder="Pick a stream to filter graphs…"
              allowClear
            />
          </Col>
        </Row>
        <Row style={{ marginBottom: 16 }}>
          <Col>
            <Text strong>Filter Graphs:</Text>
            <Radio.Group
              style={{ marginLeft: 16 }}
              value={graphFilter}
              onChange={(e) => setGraphFilter(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">All Graphs</Radio.Button>
              <Radio.Button value="eligible">Eligible</Radio.Button>
              <Radio.Button value="eligibleNoData">
                Eligible w/o AI Data
              </Radio.Button>
              <Radio.Button value="notEligible">Not Eligible</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>

        <Button
          onClick={() => {
            const eligibleKeys = filteredTableData
              .filter((g) => graphEligibilityMap[g.graphId]?.isEligible)
              .map((g) => g.graphId);
            setSelectedRowKeys(eligibleKeys);
          }}
        >
          Select All Eligible
        </Button>

        <Table
          columns={graphColumns.filter((col) => col.key !== "action")}
          dataSource={filteredTableData}
          pagination={{ pageSize: 5 }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: !graphEligibilityMap[record.graphId]?.isEligible,
            }),
          }}
        />

        <Row gutter={16} align="middle">
          <Col>
            <Button
              type="primary"
              onClick={handleGenerate}
              disabled={generationInProgress || selectedRowKeys.length === 0}
              icon={generationInProgress ? <Spin size="small" /> : null}
            >
              {generationInProgress
                ? `Generating (${generationProgress.current} of ${generationProgress.total})…`
                : "Generate AI Forecast"}
            </Button>
          </Col>

          {forecastResult && !generationInProgress && (
            <Col>
              <Text type="success">✅ Generation completed</Text>
            </Col>
          )}

          {error && (
            <Col>
              <Text type="danger">❌ Error: {error}</Text>
            </Col>
          )}
        </Row>
        {generationInProgress && (
          <div style={{ marginTop: 12 }}>
            <Progress
              percent={animatedPercent}
              status="active"
              strokeColor="#1890ff"
              showInfo={false}
            />
          </div>
        )}

        {forecastResult && (
          <pre style={{ marginTop: 24 }}>
            <strong>AI Forecast Output:</strong>
            {"\n" + JSON.stringify(forecastResult, null, 2)}
          </pre>
        )}
      </Panel>
    </Collapse>
  );
}
