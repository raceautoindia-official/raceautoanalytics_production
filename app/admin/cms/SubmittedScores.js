"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Spin,
  Alert,
  Select,
  Row,
  Col,
  message,
  TreeSelect,
  Tooltip,
} from "antd";

// Helper: build a nested TreeSelect from flat contentHierarchy
function buildTree(nodes, parentId = null) {
  return nodes
    .filter((n) => n.parent_id === parentId)
    .map((n) => ({
      title: n.name,
      value: n.id.toString(),
      key: n.id.toString(),
      children: buildTree(nodes, n.id),
    }));
}

export default function SubmittedScores() {
  // ─── State & hooks ──────────────────────────────────────────
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedStreamPath, setSelectedStreamPath] = useState([]);

  const [graphs, setGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1) Load hierarchy & dataset streams
  useEffect(() => {
    Promise.all([
      fetch("/api/contentHierarchy").then((r) => r.json()),
      fetch("/api/volumeData").then((r) => r.json()),
    ])
      .then(([hierarchy, vols]) => {
        setContentHierarchy(hierarchy);
        setDatasets(vols);
        // expand all top‐level nodes by default
        const roots = hierarchy
          .filter((n) => n.parent_id === null)
          .map((n) => n.id.toString());
        setExpandedKeys(roots);
      })
      .catch((err) => message.error("Failed loading streams: " + err.message));
  }, []);

  // 2) Load all graphs
  useEffect(() => {
    fetch("/api/graphs")
      .then((r) => r.json())
      .then((list) => {
        // normalize dataset_ids → array
        const parsed = list.map((g) => {
          let ids = [];
          if (Array.isArray(g.dataset_ids)) ids = g.dataset_ids;
          else if (typeof g.dataset_ids === "string") {
            try {
              const j = JSON.parse(g.dataset_ids);
              if (Array.isArray(j)) ids = j;
              else if (typeof j === "number") ids = [j];
            } catch {}
          } else if (typeof g.dataset_ids === "number") {
            ids = [g.dataset_ids];
          }
          return { ...g, dataset_ids: ids };
        });
        setGraphs(parsed);
        if (parsed.length) setSelectedGraph(parsed[0].id);
      })
      .catch((err) => message.error("Failed loading graphs: " + err.message));
  }, []);

  // 3) Figure out which dataset IDs our stream‐picker currently selects
  const filteredDatasetIds = useMemo(() => {
    if (!selectedStreamPath.length) return [];
    const prefix = selectedStreamPath.join(",");
    return datasets.filter((d) => d.stream.startsWith(prefix)).map((d) => d.id);
  }, [datasets, selectedStreamPath]);

  // 4) Filter graphs down to only those that reference one of those datasets
  const filteredGraphs = useMemo(() => {
    if (!selectedStreamPath.length) return graphs;
    if (!filteredDatasetIds.length) return [];
    return graphs.filter((g) =>
      g.dataset_ids.some((id) => filteredDatasetIds.includes(id))
    );
  }, [graphs, selectedStreamPath, filteredDatasetIds]);

  // 5) Keep our selectedGraph in‐bounds
  useEffect(() => {
    if (!filteredGraphs.length) {
      setSelectedGraph(null);
      setSubmissions([]);
    } else if (
      selectedGraph == null ||
      !filteredGraphs.some((g) => g.id === selectedGraph)
    ) {
      setSelectedGraph(filteredGraphs[0].id);
    }
  }, [filteredGraphs, selectedGraph]);

  // 6) Always build the TreeSelect data
  const treeData = useMemo(
    () => buildTree(contentHierarchy),
    [contentHierarchy]
  );

  // 7) Fetch the submissions any time we pick a new graph
  useEffect(() => {
    if (!selectedGraph) return;
    setLoading(true);
    fetch(`/api/saveScores?graphId=${selectedGraph}`, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch submissions");
        return r.json();
      })
      .then((json) => {
        setSubmissions(json.submissions);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedGraph]);

  // ─── Early exits (but *after* all hooks have run) ────────────
  if (!contentHierarchy.length || !graphs.length) {
    return <Spin tip="Loading filters…" />;
  }
  if (loading) return <Spin tip="Loading submissions…" />;
  if (error)
    return <Alert type="error" message="Error" description={error} showIcon />;

  // ─── Table columns ─────────────────────────────────────────
  const columns = [
    {
      title: "Submission ID",
      dataIndex: "id",
      key: "id",
      width: 100,
    },
    {
      title: "When",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (dt) => new Date(dt).toLocaleString(),
    },
    {
      title: "User",
      dataIndex: "userEmail",
      key: "userEmail",
      render: (e) => e || "Not available",
    },
    {
      title: "Graph",
      dataIndex: "graphId",
      key: "graphId",
      render: (gid) => {
        const g = graphs.find((x) => x.id === gid);
        // gather all streams for its datasets
        const streams = datasets
          .filter((d) => g.dataset_ids.includes(d.id))
          .map((d) => d.stream)
          .join("; ");
        return <Tooltip title={streams}>{g?.name || gid}</Tooltip>;
      },
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* — Filters: stream → graph — */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <TreeSelect
            style={{ width: "100%" }}
            value={selectedStreamPath.slice(-1)[0] || null}
            treeData={treeData}
            treeExpandedKeys={expandedKeys}
            onTreeExpand={setExpandedKeys}
            onChange={(val) => {
              // rebuild full path up to root
              const path = [];
              let cur = contentHierarchy.find((n) => n.id.toString() === val);
              while (cur) {
                path.unshift(cur.id.toString());
                cur = contentHierarchy.find((n) => n.id === cur.parent_id);
              }
              setSelectedStreamPath(path);
            }}
            placeholder="Filter by stream…"
            allowClear
          />
        </Col>
        <Col span={12}>
          <Select
            style={{ width: 200 }}
            placeholder={filteredGraphs.length ? "Select a graph" : "No graphs"}
            value={selectedGraph}
            onChange={setSelectedGraph}
            disabled={!filteredGraphs.length}
          >
            {filteredGraphs.map((g) => (
              <Select.Option key={g.id} value={g.id}>
                {g.name}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* — Submissions table with expandable details — */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={submissions}
        expandable={{
          expandedRowRender: (sub) => {
            // 1) figure out all years present
            const years = Array.from(
              new Set(sub.scores.map((r) => r.yearIndex))
            ).sort((a, b) => a - b);
            // 2) pivot by questionId
            const byQ = {};
            sub.scores.forEach((r) => {
              if (!byQ[r.questionId]) byQ[r.questionId] = {};
              byQ[r.questionId][r.yearIndex] = r.skipped
                ? "⏭️ Skipped"
                : r.score;
            });
            // 3) build dataSource: one row per question
            const dataSource = Object.entries(byQ).map(([qId, rowMap]) => {
              const row = { key: qId, questionId: qId };
              years.forEach((y) => {
                row[`year${y}`] = rowMap[y] ?? "";
              });
              return row;
            });
            // 4) build columns: first Question ID, then one for each year
            const detailCols = [
              {
                title: "Question ID",
                dataIndex: "questionId",
                key: "questionId",
              },
              ...years.map((y) => ({
                title: `Year ${y + 1}`,
                dataIndex: `year${y}`,
                key: `year${y}`,
                align: "center",
              })),
            ];
            return (
              <Table
                columns={detailCols}
                dataSource={dataSource}
                pagination={false}
                size="small"
              />
            );
          },
        }}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
