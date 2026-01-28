// File: app/components/UserOverallScores.jsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Collapse,
  Typography,
  Spin,
  Alert,
  Table,
  Row,
  Col,
  TreeSelect,
  Select,
  message,
} from "antd";
import SubmissionYearlyScores from "./SubmissionYearlyScores";
import { useAverageYearlyScores } from "../../hooks/useAverageYearlyScores";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export default function UserOverallScores() {
  // ── Stream → Graph filter state ────────────────────────────
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedStreamPath, setSelectedStreamPath] = useState([]);

  const [graphs, setGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);

  // ── Submission state ───────────────────────────────────────
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // compute the per-year averages for the overall table
  const { yearNames, averages } = useAverageYearlyScores(submissions);

  // ── build treeData for TreeSelect ──────────────────────────
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
  const treeData = useMemo(
    () => buildTree(contentHierarchy),
    [contentHierarchy]
  );

  // ── 1) load volumeData + contentHierarchy for the stream filter
  useEffect(() => {
    async function loadFilter() {
      try {
        const [volRows, hierarchy] = await Promise.all([
          fetch("/api/volumeData").then((r) => r.json()),
          fetch("/api/contentHierarchy").then((r) => r.json()),
        ]);
        setDatasets(
          volRows.map((d) => ({ ...d, parsedStream: d.stream.split(",") }))
        );
        setContentHierarchy(hierarchy);
        // expand all top‐level nodes
        const roots = hierarchy
          .filter((n) => n.parent_id === null)
          .map((n) => n.id.toString());
        setExpandedKeys(roots);
      } catch (err) {
        message.error("Failed to load filter data");
      }
    }
    loadFilter();
  }, []);

  // ── 2) fetch all graphs and normalize dataset_ids → array
  useEffect(() => {
    fetch("/api/graphs")
      .then((r) => r.json())
      .then((data) => {
        const parsed = data.map((g) => {
          let ids = [];
          if (Array.isArray(g.dataset_ids)) {
            ids = g.dataset_ids;
          } else if (typeof g.dataset_ids === "string") {
            try {
              const maybe = JSON.parse(g.dataset_ids);
              if (Array.isArray(maybe)) ids = maybe;
              else if (typeof maybe === "number") ids = [maybe];
            } catch {}
          } else if (typeof g.dataset_ids === "number") {
            ids = [g.dataset_ids];
          }
          return { ...g, dataset_ids: ids };
        });
        setGraphs(parsed);
        if (parsed.length) setSelectedGraph(parsed[0].id);
      })
      .catch(() => message.error("Could not load graphs"));
  }, []);

  // ── 3) derive which dataset IDs match our selected stream path
  const filteredDatasetIds = useMemo(() => {
    if (!selectedStreamPath.length) return [];
    const prefix = selectedStreamPath.join(",");
    return datasets.filter((d) => d.stream.startsWith(prefix)).map((d) => d.id);
  }, [datasets, selectedStreamPath]);

  // ── 4) filter graphs by those datasets
  const filteredGraphs = useMemo(() => {
    // no stream chosen → show all
    if (!selectedStreamPath.length) return graphs;
    // stream chosen but nothing matches → none
    if (!filteredDatasetIds.length) return [];
    // otherwise only graphs whose dataset_ids intersect
    return graphs.filter((g) =>
      g.dataset_ids.some((ds) => filteredDatasetIds.includes(ds))
    );
  }, [graphs, selectedStreamPath, filteredDatasetIds]);

  // ── 5) whenever filteredGraphs changes, pick first (or clear)
  useEffect(() => {
    if (filteredGraphs.length > 0) {
      if (!filteredGraphs.some((g) => g.id === selectedGraph)) {
        setSelectedGraph(filteredGraphs[0].id);
      }
    } else {
      setSelectedGraph(null);
      setSubmissions([]);
    }
  }, [filteredGraphs]);

  // ── 6) load submissions for the currently selected graph
  useEffect(() => {
    if (!selectedGraph) return;
    async function loadSubs() {
      setLoading(true);
      setError(null);
      try {
        // fetch the raw submissions for that graph
        const subRes = await fetch(`/api/saveScores?graphId=${selectedGraph}`, {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        });
        if (!subRes.ok) throw new Error("Failed to load submissions");
        const { submissions: rawSubs } = await subRes.json();

        // fetch the questions and settings so we can enrich
        const [qRes, sRes] = await Promise.all([
          fetch(`/api/questions?graphId=${selectedGraph}`, {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          }),
          fetch(`/api/scoreSettings`, {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          }),
        ]);
        if (!qRes.ok) throw new Error("Failed to load questions");
        if (!sRes.ok) throw new Error("Failed to load settings");

        const questions = await qRes.json();
        const { yearNames: yNames } = await sRes.json();

        // build positive vs negative attrs & weights
        const posAttrs = [];
        const negAttrs = [];
        const weights = {};
        questions.forEach((q) => {
          const key = String(q.id);
          weights[key] = Number(q.weight) || 0;
          const attr = { key, label: q.text };
          if (q.type === "positive") posAttrs.push(attr);
          else negAttrs.push(attr);
        });

        // now enrich each raw submission
        const enriched = rawSubs.map((sub) => {
          const posScores = {};
          const negScores = {};
          posAttrs.forEach(
            (a) => (posScores[a.key] = Array(yNames.length).fill(0))
          );
          negAttrs.forEach(
            (a) => (negScores[a.key] = Array(yNames.length).fill(0))
          );

          sub.scores.forEach(({ questionId, yearIndex, score, skipped }) => {
            if (skipped) return;
            const k = String(questionId);
            if (posScores[k]) posScores[k][yearIndex] = score;
            if (negScores[k]) negScores[k][yearIndex] = score;
          });

          return {
            id: sub.id,
            createdAt: sub.createdAt,
            userEmail: sub.userEmail || null,
            graphId: sub.graphId,
            posAttributes: posAttrs,
            negAttributes: negAttrs,
            posScores,
            negScores,
            weights,
            yearNames: yNames,
          };
        });

        setSubmissions(enriched);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSubs();
  }, [selectedGraph]);

  // ── Render states ───────────────────────────────────────────────
  if (!selectedGraph) {
    return (
      <Alert message="Please pick a graph above to see its submissions." />
    );
  }
  if (loading) {
    return <Spin tip="Loading submissions…" />;
  }
  if (error) {
    return <Alert type="error" message="Error" description={error} showIcon />;
  }
  if (!submissions.length) {
    return (
      <Alert message="No submissions have been made for this graph yet." />
    );
  }

  // build the single row for the overall‐average table
  const overallRow = averages.reduce(
    (acc, { year, avg }) => ({ ...acc, [year]: avg }),
    { key: "overall" }
  );
  const overallColumns = yearNames.map((yr) => ({
    title: yr,
    dataIndex: yr,
    key: yr,
    align: "center",
  }));

  return (
    <div style={{ padding: "1rem" }}>
      {/* ─── Graph filter UI ───────────────────────────────────── */}
      <Row gutter={16} align="bottom" style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Text strong>Graphs Filter:</Text>
          <TreeSelect
            style={{ width: "100%" }}
            value={selectedStreamPath.slice(-1)[0] || null}
            treeData={treeData}
            treeExpandedKeys={expandedKeys}
            onTreeExpand={setExpandedKeys}
            onChange={(val) => {
              // rebuild full path
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
        <Col span={12}>
          <Text strong>Graph:</Text>{" "}
          <Select
            style={{ width: 250 }}
            value={selectedGraph}
            onChange={setSelectedGraph}
            placeholder={filteredGraphs.length ? undefined : "No graphs match"}
            disabled={filteredGraphs.length === 0}
          >
            {filteredGraphs.map((g) => (
              <Select.Option key={g.id} value={g.id}>
                {g.name}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* ─── Overall average ───────────────────────────────────── */}
      <Title level={4}>Average Score Across All Submissions</Title>
      <Table
        dataSource={[overallRow]}
        columns={overallColumns}
        pagination={false}
        size="small"
        bordered
        rowKey="key"
        style={{ marginBottom: "1.5rem" }}
      />

      {/* ─── List of individual submissions ─────────────────────── */}
      <Title level={3}>All Submissions (Yearly Scores)</Title>
      <Collapse defaultActiveKey={submissions.map((s) => String(s.id))}>
        {submissions.map((sub) => (
          <Panel
            key={sub.id}
            header={
              <div>
                <Text strong>Submission {sub.id}</Text>{" "}
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {new Date(sub.createdAt).toLocaleString()}
                </Text>{" "}
                <Text style={{ marginLeft: 16, fontStyle: "italic" }}>
                  {sub.userEmail || "Not available"}
                </Text>
              </div>
            }
          >
            <SubmissionYearlyScores submission={sub} />
          </Panel>
        ))}
      </Collapse>
    </div>
  );
}
