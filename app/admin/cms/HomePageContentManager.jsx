"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Table,
  Tabs,
  message,
} from "antd";

const ICON_OPTIONS = [
  { value: "Activity", label: "Activity" },
  { value: "Globe2", label: "Globe2" },
  { value: "Target", label: "Target" },
  { value: "TrendingUp", label: "TrendingUp" },
  { value: "Badge", label: "Badge" },
  { value: "Gauge", label: "Gauge" },
];

const THEME_OPTIONS = [
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
  { value: "amber", label: "Amber" },
  { value: "violet", label: "Violet" },
];

function useCrud(endpoint) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const json = await res.json();
      setRows(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function upsert(payload) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to save");
    }
    await refresh();
  }

  async function remove(id) {
    const res = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to delete");
    }
    await refresh();
  }

  return { rows, loading, refresh, upsert, remove };
}

function OptionalBoxesManager() {
  const api = useCrud("/api/admin/home-content/optional-insights");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    api.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { title: "Title", dataIndex: "title", key: "title" },
      { title: "Icon", dataIndex: "icon", key: "icon", width: 120 },
      { title: "Theme", dataIndex: "theme", key: "theme", width: 120 },
      {
        title: "Active",
        dataIndex: "is_active",
        key: "is_active",
        width: 90,
        render: (v) => (v ? "Yes" : "No"),
      },
      { title: "Order", dataIndex: "sort_order", key: "sort_order", width: 90 },
      {
        title: "Actions",
        key: "actions",
        width: 180,
        render: (_, row) => (
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => {
                setEditing(row);
                form.setFieldsValue(row);
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              danger
              onClick={async () => {
                try {
                  await api.remove(row.id);
                  message.success("Deleted");
                } catch (e) {
                  message.error(String(e.message || e));
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [api, form],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Optional insight boxes</h2>
          <p className="text-sm text-black/60">
            These map to the extra 3 boxes (cards 4–6) on Home. Rendered only
            when active.
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({
              is_active: true,
              sort_order: 10,
              theme: "slate",
            });
            setOpen(true);
          }}
        >
          Add box
        </Button>
      </div>

      <Divider />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={api.rows}
        loading={api.loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? "Edit optional box" : "Add optional box"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            await api.upsert({ ...values, id: editing?.id });
            message.success("Saved");
            setOpen(false);
          } catch (e) {
            if (e?.errorFields) return;
            message.error(String(e.message || e));
          }
        }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g., Seasonal Trend Detected" />
          </Form.Item>
          <Form.Item name="body" label="Body" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Short insight text" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="icon" label="Icon" rules={[{ required: true }]}>
              <Select options={ICON_OPTIONS} placeholder="Pick icon" />
            </Form.Item>
            <Form.Item name="theme" label="Theme" rules={[{ required: true }]}>
              <Select options={THEME_OPTIONS} placeholder="Pick theme" />
            </Form.Item>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="sort_order"
              label="Sort order"
              rules={[{ required: true }]}
            >
              <InputNumber className="w-full" min={0} max={9999} />
            </Form.Item>
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

function LatestInsightsManager() {
  const api = useCrud("/api/admin/home-content/latest-insights");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    api.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { title: "Tag", dataIndex: "tag", key: "tag", width: 130 },
      { title: "Delta", dataIndex: "delta", key: "delta", width: 120 },
      { title: "Title", dataIndex: "title", key: "title" },
      {
        title: "Publish date",
        dataIndex: "publish_date",
        key: "publish_date",
        width: 140,
      },
      {
        title: "Active",
        dataIndex: "is_active",
        key: "is_active",
        width: 90,
        render: (v) => (v ? "Yes" : "No"),
      },
      { title: "Order", dataIndex: "sort_order", key: "sort_order", width: 90 },
      {
        title: "Actions",
        key: "actions",
        width: 180,
        render: (_, row) => (
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => {
                setEditing(row);
                form.setFieldsValue({
                  ...row,
                  publish_date: toDateInputValue(row.publish_date),
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              danger
              onClick={async () => {
                try {
                  await api.remove(row.id);
                  message.success("Deleted");
                } catch (e) {
                  message.error(String(e.message || e));
                }
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [api, form],
  );

  function toDateInputValue(v) {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10); // ✅ YYYY-MM-DD
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Latest insights</h2>
          <p className="text-sm text-black/60">
            Drives the “Latest Insights” cards on Home.
          </p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({ is_active: true, sort_order: 10 });
            setOpen(true);
          }}
        >
          Add insight
        </Button>
      </div>

      <Divider />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={api.rows}
        loading={api.loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editing ? "Edit insight" : "Add insight"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          try {
            const values = await form.validateFields();
            await api.upsert({ ...values, id: editing?.id });
            message.success("Saved");
            setOpen(false);
          } catch (e) {
            if (e?.errorFields) return;
            message.error(String(e.message || e));
          }
        }}
      >
        <Form layout="vertical" form={form}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="tag" label="Tag" rules={[{ required: true }]}>
              <Input placeholder="e.g., Market Trend" />
            </Form.Item>
            <Form.Item name="delta" label="Delta" rules={[{ required: true }]}>
              <Input placeholder="e.g., +3.4%" />
            </Form.Item>
          </div>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Insight headline" />
          </Form.Item>
          <Form.Item name="body" label="Body" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Short insight summary" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="publish_date"
              label="Publish date (YYYY-MM-DD)"
              rules={[{ required: true }]}
            >
              <Input placeholder="2026-01-24" />
            </Form.Item>
            <Form.Item
              name="sort_order"
              label="Sort order"
              rules={[{ required: true }]}
            >
              <InputNumber className="w-full" min={0} max={9999} />
            </Form.Item>
          </div>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default function HomePageContentManager() {
  return (
    <div>
      <Tabs
        items={[
          {
            key: "optional",
            label: "Optional Boxes",
            children: <OptionalBoxesManager />,
          },
          {
            key: "latest",
            label: "Latest Insights",
            children: <LatestInsightsManager />,
          },
        ]}
      />
    </div>
  );
}
