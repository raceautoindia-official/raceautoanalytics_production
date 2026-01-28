// File: app/components/ManageQuestions.js
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Table,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Popconfirm,
  message,
  Row,
  Col,
  Typography,
  TreeSelect,
} from "antd";

const { Text } = Typography;

export default function ManageQuestions({ context } = {}) {
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [selectedStreamPath, setSelectedStreamPath] = useState([]);

  const [graphs, setGraphs] = useState([]);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // filter state: 'all' | 'positive' | 'negative'
  const [filterType, setFilterType] = useState("all");

  // load datasets + hierarchy
  useEffect(() => {
    async function load() {
      try {
        const [volRows, hierarchy] = await Promise.all([
          fetch("/api/volumeData").then((r) => r.json()),
          fetch("/api/contentHierarchy").then((r) => r.json()),
        ]);
        setDatasets(
          volRows.map((d) => ({
            ...d,
            parsedStream: d.stream.split(","),
          }))
        );
        setContentHierarchy(hierarchy);
        // expand all top‐level nodes by default:
        const roots = hierarchy
          .filter((n) => n.parent_id === null)
          .map((n) => n.id.toString());
        setExpandedKeys(roots);
      } catch (err) {
        message.error("Failed to load dataset filter: ", err.message);
      }
    }
    load();
  }, []);

  const fetchQuestions = async () => {
    if (!selectedGraph) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/questions?graphId=${selectedGraph}`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
      });
      const data = await res.json();
      setQuestions(data);
    } catch {
      message.error("Could not load questions");
    } finally {
      setLoading(false);
    }
  };

  // recursively build tree nodes
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

  // which dataset IDs match your chosen path?
  const filteredDatasetIds = useMemo(() => {
    if (!selectedStreamPath.length) return [];
    const prefix = selectedStreamPath.join(",");
    return datasets.filter((d) => d.stream.startsWith(prefix)).map((d) => d.id);
  }, [datasets, selectedStreamPath]);

  // only graphs whose dataset_ids array intersects that set:
  const filteredGraphs = useMemo(() => {
    // 1) no stream filter yet → show everything
    if (!selectedStreamPath.length) return graphs;

    // 2) stream chosen but it yields no matching datasets → show nothing
    if (!filteredDatasetIds.length) return [];

    // 3) otherwise only graphs that reference one of those datasets
    return graphs.filter((g) =>
      g.dataset_ids.some((id) => filteredDatasetIds.includes(id))
    );
  }, [graphs, selectedStreamPath, filteredDatasetIds]);

  // useEffect(() => {
  //   if (filteredGraphs.length === 0) {
  //     setSelectedGraph(null);
  //   } else if (!filteredGraphs.some((g) => g.id === selectedGraph)) {
  //     setSelectedGraph(filteredGraphs[0].id);
  //   }
  // }, [filteredGraphs, selectedGraph]);

  // whenever filteredGraphs changes, pick a new selectedGraph (or none)
  useEffect(() => {
    if (filteredGraphs.length > 0) {
      // if our old selection isn’t in the new list, pick the first
      if (!filteredGraphs.some((g) => g.id === selectedGraph)) {
        setSelectedGraph(filteredGraphs[0].id);
      }
    } else {
      // no graphs → clear selection & questions
      setSelectedGraph(null);
      setQuestions([]);
    }
  }, [filteredGraphs, selectedGraph, setQuestions]);

  useEffect(() => {
    fetchQuestions();
  }, [selectedGraph]);

  useEffect(() => {
    const url = context
      ? `/api/graphs?context=${encodeURIComponent(context)}`
      : "/api/graphs";

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const parsed = data.map((g) => {
          let ids = [];

          // 1) If it's already an array, use it:
          if (Array.isArray(g.dataset_ids)) {
            ids = g.dataset_ids;

            // 2) If it's a string, try to JSON.parse:
          } else if (typeof g.dataset_ids === "string") {
            try {
              const maybe = JSON.parse(g.dataset_ids);
              if (Array.isArray(maybe)) {
                ids = maybe;
              } else if (typeof maybe === "number") {
                ids = [maybe];
              }
            } catch {
              ids = [];
            }

            // 3) If it's already a number, wrap it:
          } else if (typeof g.dataset_ids === "number") {
            ids = [g.dataset_ids];
          }

          return {
            ...g,
            dataset_ids: ids,
          };
        });

        setGraphs(parsed);
        if (parsed.length) setSelectedGraph(parsed[0].id);
      })
      .catch(() => {
        message.error("Could not load graphs");
      });
  }, []);

  const onFinish = async (values) => {
    if (!selectedGraph) {
      message.error("Please select a graph first");
      return;
    }
    try {
      await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({ ...values, graphId: selectedGraph }),
      });
      message.success("Question added");
      form.resetFields();
      fetchQuestions();
    } catch {
      message.error("Add failed");
    }
  };

  const deleteQuestion = async (id) => {
    try {
      await fetch("/api/questions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({ id }),
      });
      message.success("Deleted");
      fetchQuestions();
    } catch {
      message.error("Delete failed");
    }
  };

  // coerce weight to Number so reduce stays numeric
  const totalPositive = questions
    .filter((q) => q.type === "positive")
    .reduce((sum, q) => sum + Number(q.weight || 0), 0);

  const totalNegative = questions
    .filter((q) => q.type === "negative")
    .reduce((sum, q) => sum + Number(q.weight || 0), 0);

  // filter what's shown
  const displayed = questions.filter((q) => {
    if (filterType === "all") return true;
    return q.type === filterType;
  });

  const columns = [
    { title: "ID", dataIndex: "id", width: 60 },
    { title: "Question", dataIndex: "text", ellipsis: true },
    { title: "Weight", dataIndex: "weight" },
    {
      title: "Type",
      dataIndex: "type",
      render: (t) => t.charAt(0).toUpperCase() + t.slice(1),
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      render: (dt) => new Date(dt).toLocaleString(),
    },
    {
      title: "Action",
      render: (_, record) => (
        <Popconfirm
          title="Delete this question?"
          onConfirm={() => deleteQuestion(record.id)}
        >
          <a>Delete</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} align="bottom" style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Text strong>Graphs Filter:</Text>
          <TreeSelect
            style={{ width: "100%" /* removed marginTop */ }}
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

        <Col span={12}>
          <Text strong>Graph:</Text>{" "}
          <Select
            value={selectedGraph}
            onChange={setSelectedGraph}
            style={{ width: 200 }}
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

      <Form
        form={form}
        layout="inline"
        onFinish={onFinish}
        style={{ marginBottom: 16 }}
      >
        <Form.Item
          name="text"
          rules={[{ required: true, message: "Question text required" }]}
        >
          <Input placeholder="Question" style={{ width: 300 }} />
        </Form.Item>
        <Form.Item
          name="weight"
          rules={[{ required: true, message: "Weight required" }]}
        >
          <InputNumber placeholder="Weight" min={0} max={1} step={0.01} />
        </Form.Item>
        <Form.Item
          name="type"
          rules={[{ required: true, message: "Select type" }]}
        >
          <Select placeholder="Type" style={{ width: 140 }}>
            <Select.Option value="positive">Positive</Select.Option>
            <Select.Option value="negative">Negative</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Question
          </Button>
        </Form.Item>
      </Form>

      <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Text strong>Show:</Text>{" "}
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 140 }}
          >
            <Select.Option value="all">All</Select.Option>
            <Select.Option value="positive">Positive</Select.Option>
            <Select.Option value="negative">Negative</Select.Option>
          </Select>
        </Col>
        <Col>
          <Text>
            Total Positive Weight:{" "}
            <Text strong>{totalPositive.toFixed(2)}</Text>
          </Text>
        </Col>
        <Col>
          <Text>
            Total Negative Weight:{" "}
            <Text strong>{totalNegative.toFixed(2)}</Text>
          </Text>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={displayed}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
}
