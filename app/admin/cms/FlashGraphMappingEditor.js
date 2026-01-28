"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";

const { Text } = Typography;

const FIELDS = [
  { key: "overall_graph_id", label: "Overall" },
  { key: "pv_graph_id", label: "PV" },
  { key: "cv_graph_id", label: "CV" },
  { key: "tw_graph_id", label: "2W" },
  { key: "threew_graph_id", label: "3W" },
  { key: "tractor_graph_id", label: "Tractor" },
  { key: "truck_graph_id", label: "Truck" },
  { key: "bus_graph_id", label: "Bus" },
  { key: "ce_graph_id", label: "Construction Equipment" },
];

export default function FlashGraphMappingEditor() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [graphs, setGraphs] = useState([]);

  const graphOptions = useMemo(() => {
    return (graphs || []).map((g) => ({
      label: `#${g.id} — ${g.name}`,
      value: g.id,
    }));
  }, [graphs]);

  const load = async () => {
    setLoading(true);
    try {
      const [graphsRes, cfgRes] = await Promise.all([
        fetch("/api/graphs?context=flash", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        }),
        fetch("/api/admin/flash-dynamic/flash-reports-config", {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
        }),
      ]);

      if (!graphsRes.ok) throw new Error("Failed to load graphs");
      if (!cfgRes.ok) throw new Error("Failed to load mapping");

      const [graphsJson, cfgJson] = await Promise.all([
        graphsRes.json(),
        cfgRes.json(),
      ]);

      const g = graphsJson || [];
      setGraphs(g);

      // If the mapping contains IDs that don't exist anymore, clear them to avoid confusing the admin.
      const validIds = new Set((g || []).map((x) => Number(x.id)));
      const cleaned = { ...(cfgJson || {}) };
      let cleared = 0;
      for (const f of FIELDS) {
        const raw = cleaned?.[f.key];
        if (raw == null || raw === "") {
          cleaned[f.key] = null;
          continue;
        }
        const n = Number(raw);
        if (!Number.isFinite(n) || !validIds.has(n)) {
          cleaned[f.key] = null;
          cleared++;
        } else {
          cleaned[f.key] = n;
        }
      }

      form.setFieldsValue(cleaned);
      if (cleared) {
        message.warning(
          `${cleared} mapped graph ID(s) were not found in Flash graphs and were cleared.`,
        );
      }
    } catch (e) {
      message.error(e?.message || "Failed to load mapping");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/flash-dynamic/flash-reports-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify(values),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Save failed");

      message.success("Flash graph mapping saved");
      await load();
    } catch (e) {
      message.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin tip="Loading Flash mapping..." />
      </div>
    );
  }

  return (
    <Card style={{ maxWidth: 900 }}>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Text type="secondary">
          Select which <b>Flash graph</b> powers each Flash Reports segment.
          These IDs are read by the public endpoint{" "}
          <code>/api/flash-reports/config</code>.
        </Text>

        <Form form={form} layout="vertical">
          {FIELDS.map((f) => (
            <Form.Item key={f.key} name={f.key} label={f.label}>
              <Select
                allowClear
                showSearch
                placeholder="Select a Flash graph"
                options={graphOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          ))}

          <Space>
            <Button onClick={load}>Refresh</Button>
            <Button type="primary" onClick={onSave} loading={saving}>
              Save Mapping
            </Button>
          </Space>
        </Form>
      </Space>
    </Card>
  );
}
