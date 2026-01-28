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
  CopyOutlined,
  SnippetsOutlined,
} from "@ant-design/icons";

const { confirm } = Modal;
const { Search } = Input;
const { Option } = Select;
const nodeWidth = 172;
const nodeHeight = 36;

// Auto‐layout with Dagre
const getLayoutedElements = (nodes, edges, direction = "TB") => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction });

  nodes.forEach((n) =>
    graph.setNode(n.id, { width: nodeWidth, height: nodeHeight })
  );
  edges.forEach((e) => graph.setEdge(e.source, e.target));
  dagre.layout(graph);

  return {
    nodes: nodes.map((n) => {
      const { x, y } = graph.node(n.id);
      return {
        ...n,
        position: { x: x - nodeWidth / 2, y: y - nodeHeight / 2 },
        style: {
          background: "#fff",
          border: "2px solid #1890ff",
          borderRadius: 8,
          padding: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          fontSize: 14,
          color: "#333",
        },
      };
    }),
    edges: edges.map((e) => ({
      ...e,
      animated: true,
      style: { stroke: "#1890ff", strokeWidth: 2 },
    })),
  };
};

export default function ContentHierarchyFlow() {
  // 1) RAW data
  const [rawNodes, setRawNodes] = useState([]);
  const [rawEdges, setRawEdges] = useState([]);

  // 2) React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 3) Selection
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  // 4) Dropdown cascade
  const [cascadeSelection, setCascadeSelection] = useState([]);

  // 5) Add / rename modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [parentId, setParentId] = useState(null);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // 6) Loading / error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 7) Flow instance & wrapper ref
  const [rfInstance, setRfInstance] = useState(null);
  const reactFlowWrapper = useRef(null);

  // 8) Clipboard for copy/paste
  const [clipboardNodes, setClipboardNodes] = useState([]);
  const [copiedRootId, setCopiedRootId] = useState(null);

  //
  // ─── Derive a “slice” of the graph (2 levels or detail) ───────────────────────
  //
  const { nodes: filteredRawNodes, edges: filteredRawEdges } = useMemo(() => {
    if (selectedNodeId) {
      // DETAIL VIEW: clicked node + its children + grandchildren
      const center = rawNodes.find((n) => n.id === selectedNodeId);

      // level-1 (direct children)
      const level1 = rawNodes.filter(
        (n) => n.parent_id != null && String(n.parent_id) === selectedNodeId
      );
      const level1Ids = level1.map((n) => n.id);

      // level-2 (grandchildren)
      const level2 = rawNodes.filter(
        (n) => n.parent_id != null && level1Ids.includes(String(n.parent_id))
      );

      // collect nodes to render
      const nodes = center
        ? [center, ...level1, ...level2]
        : [...level1, ...level2];

      // collect edges: center→level1, level1→level2
      const sliceEdges = rawEdges.filter(
        (e) =>
          // edge from center to a child
          (e.source === selectedNodeId && level1Ids.includes(e.target)) ||
          // edge from a child to a grandchild
          (level1Ids.includes(e.source) &&
            level2.some((g) => g.id === e.target))
      );

      return { nodes, edges: sliceEdges };
    }

    // INITIAL VIEW → level-0 + level-1
    const level1 = rawNodes.filter((n) => n.parent_id == null);
    const level1Ids = level1.map((n) => n.id);
    const level2 = rawNodes.filter(
      (n) => n.parent_id != null && level1Ids.includes(String(n.parent_id))
    );
    const sliceEdges = rawEdges.filter(
      (e) =>
        level1Ids.includes(e.source) && level2.some((n) => n.id === e.target)
    );
    return {
      nodes: [...level1, ...level2],
      edges: sliceEdges,
    };
  }, [rawNodes, rawEdges, selectedNodeId]);

  //
  // ─── Fetch hierarchy from API ─────────────────────────────────────────────────
  //
  const fetchHierarchy = useCallback(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/contentHierarchy", {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        });
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        // console.log(data.length);
        setRawNodes(
          data.map((n) => ({
            id: String(n.id),
            data: { label: n.name },
            parent_id: n.parent_id,
          }))
        );
        setRawEdges(
          data
            .filter((n) => n.parent_id != null)
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

  //
  // ─── Layout the filtered slice ───────────────────────────────────────────────
  //
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(filteredRawNodes, filteredRawEdges),
    [filteredRawNodes, filteredRawEdges]
  );
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges]);

  //
  // ─── Highlight the selected node ─────────────────────────────────────────────
  //
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style:
          n.id === selectedNodeId
            ? { ...n.style, background: "#fffb8f", border: "2px solid #ffd21d" }
            : n.style,
      }))
    );
  }, [selectedNodeId, layoutedNodes]);

  //
  // ─── Build a parent→children map for dropdowns & copy/delete ────────────────
  //
  const childrenMap = useMemo(
    () =>
      rawNodes.reduce((map, n) => {
        const key = n.parent_id != null ? String(n.parent_id) : "root";
        (map[key] = map[key] || []).push(n);
        return map;
      }, {}),
    [rawNodes]
  );

  // Helper: collect *all* descendants of a node:
  const collectDescendants = useCallback(
    (rootId) => {
      const result = [];
      const queue = [...(childrenMap[String(rootId)] || [])];
      while (queue.length) {
        const node = queue.shift();
        result.push({
          id: node.id,
          parent: node.parent_id,
          name: node.data.label,
        });
        queue.push(...(childrenMap[String(node.id)] || []));
      }
      return result;
    },
    [childrenMap]
  );

  //
  // ─── Focus / zoom logic ─────────────────────────────────────────────────────
  //
  const focusNode = useCallback((id) => {
    setSelectedNodeId(id);
  }, []);

  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedNode(null);
      return;
    }
    const node = layoutedNodes.find((n) => n.id === selectedNodeId);
    setSelectedNode(node || null);

    if (node && rfInstance && reactFlowWrapper.current) {
      const zoom = 1.5;
      const { width } = reactFlowWrapper.current.getBoundingClientRect();
      const x = width / 2 - node.position.x * zoom;
      const y = 50 - node.position.y * zoom;
      rfInstance.setViewport({ x, y, zoom });
    }
  }, [selectedNodeId, layoutedNodes, rfInstance]);

  //
  // ─── Handlers: search, cascade, add, delete, rename, copy/paste ─────────────
  //
  const onSearchNode = useCallback(
    (val) => {
      const found = rawNodes.find((n) =>
        n.data.label.toLowerCase().includes(val.toLowerCase())
      );
      found ? focusNode(found.id) : message.error("Not found");
    },
    [rawNodes, focusNode]
  );

  const handleLevelSelect = useCallback(
    (level, id) => {
      setCascadeSelection((prev) => {
        const arr = prev.slice(0, level);
        arr[level] = id;
        return arr;
      });
      if (id) focusNode(id);
    },
    [focusNode]
  );

  const onAddNode = useCallback(async () => {
    if (!newNodeName.trim()) return message.error("Enter node name");
    setModalLoading(true);
    try {
      const res = await fetch("/api/contentHierarchy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({ parent_id: parentId, name: newNodeName }),
      });
      if (!res.ok) throw new Error("Add failed");
      message.success("Node added");
      setIsAddModalVisible(false);
      setNewNodeName("");
      fetchHierarchy();
    } catch (e) {
      message.error(e.message);
    } finally {
      setModalLoading(false);
    }
  }, [newNodeName, parentId, fetchHierarchy]);

  const deleteNode = useCallback(async () => {
    if (!selectedNodeId) return message.error("Select a node first");
    setModalLoading(true);
    try {
      const res = await fetch("/api/contentHierarchy", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({ id: Number(selectedNodeId) }),
      });
      if (!res.ok) throw new Error("Delete failed");
      message.success("Node deleted");
      setSelectedNodeId(null);
      setSelectedNode(null);
      fetchHierarchy();
    } catch (e) {
      message.error(e.message);
    } finally {
      setModalLoading(false);
    }
  }, [selectedNodeId, fetchHierarchy]);

  const renameNode = useCallback(async () => {
    if (!renameValue.trim()) return message.error("Enter new name");
    setModalLoading(true);
    try {
      const res = await fetch("/api/contentHierarchy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({ id: Number(selectedNodeId), name: renameValue }),
      });
      if (!res.ok) throw new Error("Rename failed");
      message.success("Node renamed");
      setIsRenameModalVisible(false);
      fetchHierarchy();
    } catch (e) {
      message.error(e.message);
    } finally {
      setModalLoading(false);
    }
  }, [renameValue, selectedNodeId, fetchHierarchy]);

  const handleCopy = () => {
    if (!selectedNodeId) {
      message.error("Select a node first to copy its subtree.");
      return;
    }
    const descendants = collectDescendants(selectedNodeId);
    if (!descendants.length) {
      message.info("Selected node has no children to copy.");
      return;
    }
    setClipboardNodes(descendants);
    setCopiedRootId(selectedNodeId);
    message.success(`Copied ${descendants.length} descendant nodes.`);
  };

  const handlePaste = useCallback(async () => {
    if (!selectedNodeId) {
      message.error("Select a node to paste into.");
      return;
    }
    if (!clipboardNodes.length) {
      message.error("Nothing copied. Copy a subtree first.");
      return;
    }
    const newIdMap = {};
    try {
      for (const item of clipboardNodes) {
        const newParentId =
          String(item.parent) === String(copiedRootId)
            ? Number(selectedNodeId)
            : newIdMap[item.parent];
        const res = await fetch("/api/contentHierarchy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          body: JSON.stringify({ parent_id: newParentId, name: item.name }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to insert node");
        }
        const created = await res.json();
        newIdMap[item.id] = created.id;
      }
      message.success("Subtree pasted successfully.");
      setClipboardNodes([]);
      setCopiedRootId(null);
      fetchHierarchy();
    } catch (err) {
      console.error(err);
      message.error("Paste failed: " + err.message);
    }
  }, [clipboardNodes, copiedRootId, selectedNodeId, fetchHierarchy]);

  const handleDeleteDescendants = useCallback(() => {
    if (!selectedNodeId) {
      message.error("Select a node first to delete its descendants.");
      return;
    }
    confirm({
      title: "Delete all descendants?",
      icon: <ExclamationCircleOutlined />,
      content:
        "This will remove all child nodes (and their children) under the selected node. This cannot be undone.",
      onOk: async () => {
        try {
          const deleteSubtree = async (nodeId) => {
            for (const kid of childrenMap[String(nodeId)] || []) {
              await deleteSubtree(kid.id);
            }
            await fetch("/api/contentHierarchy", {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
              },
              body: JSON.stringify({ id: Number(nodeId) }),
            });
          };
          for (const child of childrenMap[String(selectedNodeId)] || []) {
            await deleteSubtree(child.id);
          }
          message.success("All descendants deleted.");
          setSelectedNodeId(null);
          setSelectedNode(null);
          fetchHierarchy();
        } catch (e) {
          console.error(e);
          message.error("Failed to delete descendants: " + e.message);
        }
      },
    });
  }, [selectedNodeId, childrenMap, fetchHierarchy]);

  //
  // ─── Render ─────────────────────────────────────────────────────────────────
  //
  if (loading)
    return <Spin tip="Loading..." style={{ width: "100%", marginTop: 20 }} />;
  if (error) return <Empty description={error} style={{ marginTop: 20 }} />;

  // Cascade dropdowns
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
        value={cascadeSelection[lvl] || null}
        onChange={(v) => handleLevelSelect(lvl, v)}
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
      {/* Toolbar */}
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
              onClick={() =>
                confirm({
                  title: "Confirm delete?",
                  icon: <ExclamationCircleOutlined />,
                  onOk: deleteNode,
                })
              }
            >
              Delete Node
            </Button>
            <Button
              icon={<EditOutlined />}
              style={{ marginRight: 8 }}
              onClick={() => {
                setRenameValue(selectedNode.data.label);
                setIsRenameModalVisible(true);
              }}
            >
              Rename Node
            </Button>
          </>
        )}
        <Button
          icon={<CopyOutlined />}
          style={{ marginLeft: 8 }}
          onClick={handleCopy}
          disabled={!selectedNodeId}
        >
          Copy Subtree
        </Button>
        <Button
          icon={<SnippetsOutlined />}
          style={{ marginLeft: 8 }}
          onClick={handlePaste}
          disabled={!clipboardNodes.length || !selectedNodeId}
        >
          Paste Subtree
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          style={{ marginLeft: 8 }}
          onClick={handleDeleteDescendants}
          disabled={!selectedNodeId}
        >
          Delete Descendants
        </Button>
        <div style={{ marginTop: 8 }}>
          {selectedNode ? (
            <>
              <strong>Selected Node:</strong>{" "}
              <span>
                {selectedNode.data.label} (ID: {selectedNode.id})
              </span>
            </>
          ) : (
            "No selection"
          )}
        </div>
      </div>

      {/* React Flow canvas */}
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

      {/* Add Node Modal */}
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

      {/* Rename Node Modal */}
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