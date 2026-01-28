"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { Button, Modal, Input, message, Spin, Empty, Select } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const { confirm } = Modal;
const { Search } = Input;
const { Option } = Select;
const nodeWidth = 172;
const nodeHeight = 36;

// Auto-layout helper
const getLayoutedElements = (nodes, edges, direction = "TB") => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction });
  nodes.forEach((n) =>
    graph.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((e) => graph.setEdge(e.source, e.target));
  dagre.layout(graph);

  const styledNodes = nodes.map((n) => {
    const { x, y } = graph.node(n.id);
    return {
      ...n,
      position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 },
      style: {
        background: "#e6f7ff",
        border: "2px solid #1890ff",
        borderRadius: 8,
        padding: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontSize: 14,
        color: "#000",
      },
    };
  });
  const styledEdges = edges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: "#40a9ff", strokeWidth: 3 },
  }));
  return { nodes: styledNodes, edges: styledEdges };
};

export default function FormatHierarchyFlow() {
  const [rawNodes, setRawNodes] = useState([]);
  const [rawEdges, setRawEdges] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [cascadeSelection, setCascadeSelection] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [parentId, setParentId] = useState(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [rfInstance, setRfInstance] = useState(null);
  const reactFlowWrapper = useRef(null);

  const fetchHierarchy = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/formatHierarchy", {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`
          }
        });
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setRawNodes(
          data.map((n) => ({
            id: String(n.id),
            data: { label: n.name },
            parent_id: n.parent_id,
            chart_id: n.chart_id,
          }))
        );
        setRawEdges(
          data
            .filter((n) => n.parent_id)
            .map((n) => ({
              id: `e${n.parent_id}-${n.id}`,
              source: String(n.parent_id),
              target: String(n.id),
            }))
        );
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges]);

  useEffect(() => {
    setNodes(
      layoutedNodes.map((n) => ({
        ...n,
        style:
          n.id === selectedNodeId
            ? { ...n.style, background: "#fffb8f", border: "2px solid #ffd21d" }
            : n.style,
      }))
    );
  }, [layoutedNodes, selectedNodeId]);

  const childrenMap = useMemo(
    () =>
      rawNodes.reduce((map, n) => {
        const key = n.parent_id ? String(n.parent_id) : "root";
        (map[key] = map[key] || []).push(n);
        return map;
      }, {}),
    [rawNodes]
  );

  const focusNode = useCallback(
    (id) => {
      const node = layoutedNodes.find((n) => n.id === id);
      if (node && rfInstance && reactFlowWrapper.current) {
        const zoom = 1.5;
        const { width } = reactFlowWrapper.current.getBoundingClientRect();
        const x = width / 2 - node.position.x * zoom;
        const y = 50 - node.position.y * zoom;
        rfInstance.setViewport({ x, y, zoom });
        setSelectedNodeId(id);
        setSelectedNode(node);
      }
    },
    [layoutedNodes, rfInstance]
  );

  const handleLevelSelect = useCallback(
    (level, id) => {
      setCascadeSelection((prev) => {
        const arr = prev.slice(0, level);
        arr[level] = id;
        return arr;
      });
      id && focusNode(id);
    },
    [focusNode]
  );

  const onSearchNode = useCallback(
    (val) => {
      const found = rawNodes.find((n) =>
        n.data.label.toLowerCase().includes(val.toLowerCase())
      );
      found ? focusNode(found.id) : message.error("Not found");
    },
    [rawNodes, focusNode]
  );

  const onAddNode = useCallback(async () => {
    if (!newNodeName.trim()) return message.error("Enter node name");
    setModalLoading(true);
    try {
      const chartId =
        selectedNode?.chart_id || parseInt(selectedNode?.id) || null;
      const res = await fetch("/api/formatHierarchy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json" ,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`
        },
        body: JSON.stringify({
          parent_id: parentId,
          name: newNodeName,
          chart_id: chartId,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      if (!selectedNode)
        await fetch("/api/formatHierarchy", {
          method: "PUT",
           headers: {
          "Content-Type": "application/json" ,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`
        },
          body: JSON.stringify({ id: created.id, chart_id: created.id }),
        });
      message.success("Node added");
      setIsAddModalVisible(false);
      setNewNodeName("");
      fetchHierarchy();
    } catch {
      message.error("Error adding node");
    } finally {
      setModalLoading(false);
    }
  }, [newNodeName, parentId, selectedNode, fetchHierarchy]);

  const deleteNode = useCallback(async () => {
    if (!selectedNodeId) return message.error("Select a node");
    setModalLoading(true);
    try {
      const res = await fetch("/api/formatHierarchy", {
        method: "DELETE",
         headers: {
          "Content-Type": "application/json" ,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`
        },
        body: JSON.stringify({ id: Number(selectedNodeId) }),
      });
      if (!res.ok) throw new Error();
      message.success("Node deleted");
      setSelectedNodeId(null);
      setSelectedNode(null);
      fetchHierarchy();
    } catch {
      message.error("Error deleting node");
    } finally {
      setModalLoading(false);
    }
  }, [selectedNodeId, fetchHierarchy]);

  const showDeleteConfirm = useCallback(() => {
    confirm({
      title: "Are you sure?",
      icon: <ExclamationCircleOutlined />,
      onOk: deleteNode,
    });
  }, [deleteNode]);

  const renameNode = useCallback(async () => {
    if (!renameValue.trim()) return message.error("Enter new name");
    setModalLoading(true);
    try {
      const res = await fetch("/api/formatHierarchy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json" ,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`
        },
        body: JSON.stringify({ id: Number(selectedNodeId), name: renameValue }),
      });
      if (!res.ok) throw new Error();
      message.success("Node renamed");
      setIsRenameModalVisible(false);
      fetchHierarchy();
    } catch {
      message.error("Error renaming node");
    } finally {
      setModalLoading(false);
    }
  }, [renameValue, selectedNodeId, fetchHierarchy]);

  if (loading)
    return <Spin tip="Loading..." style={{ width: "100%", marginTop: 20 }} />;
  if (error) return <Empty description={error} style={{ marginTop: 20 }} />;

  const dropdowns = [];
  let parent = "root";
  for (let lvl = 0; ; lvl++) {
    const list = childrenMap[parent] || [];
    if (lvl > 0 && (!cascadeSelection[lvl - 1] || !list.length)) break;
    dropdowns.push(
      <Select
        key={lvl}
        placeholder={`Level ${lvl}`}
        style={{ minWidth: 140, marginRight: 8, marginBottom: 8 }}
        dropdownMatchSelectWidth={false}
        dropdownStyle={{ whiteSpace: "normal", minWidth: 140 }}
        value={cascadeSelection[lvl] || null}
        onChange={(val) => handleLevelSelect(lvl, val)}
        allowClear
      >
        {list.map((n) => (
          <Option key={n.id} value={n.id}>
            {n.data.label}
          </Option>
        ))}
      </Select>
    );
    parent = cascadeSelection[lvl] || "root";
    if (!cascadeSelection[lvl]) break;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "80vh",
        border: "1px solid #ccc",
        borderRadius: 6,
        background: "#f9f9f9",
      }}
    >
      <div
        style={{
          padding: 12,
          background: "#fff",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap" }}>{dropdowns}</div>
        <Search
          placeholder="Search Node"
          onSearch={onSearchNode}
          style={{ width: 240, marginBottom: 8 }}
          allowClear
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          style={{ marginRight: 8 }}
          onClick={() => {
            setParentId(selectedNode ? selectedNode.id : null);
            setIsAddModalVisible(true);
          }}
        >
          Add Node
        </Button>
        {selectedNode && (
          <>
            <Button
              danger
              icon={<DeleteOutlined />}
              style={{ marginRight: 8 }}
              onClick={showDeleteConfirm}
            >
              Delete
            </Button>
            <Button
              icon={<EditOutlined />}
              style={{ marginRight: 8 }}
              onClick={() => {
                setRenameValue(selectedNode.data.label);
                setIsRenameModalVisible(true);
              }}
            >
              Rename
            </Button>
            <Button
              icon={<ExclamationCircleOutlined />}
              onClick={() => {
                setSelectedNodeId(null);
                setSelectedNode(null);
                setCascadeSelection([]);
                message.info("Selection cleared");
              }}
            >
              Clear Selection
            </Button>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          {selectedNode ? (
            <>
              <strong>Selected Node:</strong>{" "}
              <strong>
                {selectedNode.data.label} (ID: {selectedNode.id})
              </strong>
            </>
          ) : (
            "No selection"
          )}
        </div>
      </div>
      <div ref={reactFlowWrapper} style={{ flex: 1, minHeight: 0 }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={(inst) => {
              setRfInstance(inst);
              inst.fitView({ padding: 0.1 });
            }}
            onNodeClick={(e, n) => focusNode(n.id)}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodesDraggable={false}
            style={{ width: "100%", height: "100%", background: "#f0f2f5" }}
          >
            <Background color="#888" gap={16} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <Modal
        title="Add Node"
        open={isAddModalVisible}
        onOk={onAddNode}
        confirmLoading={modalLoading}
        onCancel={() => setIsAddModalVisible(false)}
      >
        <Input
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
          placeholder="Node name"
        />
      </Modal>
      <Modal
        title="Rename Node"
        open={isRenameModalVisible}
        onOk={renameNode}
        confirmLoading={modalLoading}
        onCancel={() => setIsRenameModalVisible(false)}
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="New name"
        />
      </Modal>
    </div>
  );
}
