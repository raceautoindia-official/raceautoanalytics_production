"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";

const { Text } = Typography;
const { TextArea } = Input;

/**
 * CMS editor for the OEM Forecast Rationale table shown under the segment
 * forecast share chart on the flash report pages.
 *
 * One explanation per OEM covering the whole forecast window — the site puts it
 * beside that OEM's month-by-month shares, so there is no per-month copy to
 * maintain.
 *
 * Saves the whole set for a country + segment in one POST, so deleting a row
 * here removes it from the site. The endpoint sits behind the admin basic-auth
 * middleware, same as the insights API.
 */

const SEGMENTS = [
  { value: "passenger vehicle", label: "Passenger Vehicle" },
  { value: "two-wheeler", label: "Two-Wheeler" },
  { value: "three wheeler", label: "Three-Wheeler" },
  { value: "commercial vehicle", label: "Commercial Vehicle" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "tractor", label: "Tractor" },
  { value: "construction equipment", label: "Construction Equipment" },
  { value: "overall", label: "Overall" },
];

const blankRow = (rank) => ({
  key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  rank,
  oem: "",
  description: "",
});

export default function FlashForecastReasons() {
  const [countries, setCountries] = useState([{ value: "india", label: "India" }]);
  const [country, setCountry] = useState("india");
  const [segment, setSegment] = useState("passenger vehicle");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Country list, same source the rest of the CMS uses.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/flash-reports/countries", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !Array.isArray(j)) return;
        const opts = j
          .map((c) => {
            const v = String(c.value || c.name || "").trim().toLowerCase();
            return v ? { value: v, label: c.label || c.name || v } : null;
          })
          .filter(Boolean);
        if (opts.length) setCountries(opts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/flash-forecast-reasons?country=${encodeURIComponent(
          country,
        )}&segment=${encodeURIComponent(segment)}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Failed to load (${res.status})`);
      setRows(
        (json.rows || []).map((r, i) => ({
          key: String(r.id ?? `row-${i}`),
          rank: Number(r.rank_index) || i + 1,
          oem: r.oem_name || "",
          description: r.description || "",
        })),
      );
    } catch (e) {
      message.error(e?.message || "Failed to load rationale rows");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [country, segment]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key, field, value) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const save = async () => {
    const incomplete = rows.filter((r) => !String(r.oem || "").trim());
    if (incomplete.length) {
      message.warning("Every row needs an OEM name. Blank rows are skipped.");
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/flash-forecast-reasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, segment, rows }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Save failed (${res.status})`);
      message.success(`Saved ${json.saved} row(s) for ${segment} / ${country}.`);
      await load();
    } catch (e) {
      message.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      width: 90,
      render: (_, r) => (
        <InputNumber
          min={1}
          max={99}
          value={r.rank}
          onChange={(v) => update(r.key, "rank", v || 1)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "OEM name",
      dataIndex: "oem",
      width: 240,
      render: (_, r) => (
        <Input
          value={r.oem}
          placeholder="MARUTI SUZUKI INDIA LTD"
          onChange={(e) => update(r.key, "oem", e.target.value)}
        />
      ),
    },
    {
      title: "Reason / description (3–4 lines)",
      dataIndex: "description",
      render: (_, r) => (
        <TextArea
          value={r.description}
          rows={4}
          maxLength={800}
          showCount
          placeholder="Why this OEM is forecast at this share — demand drivers, launches, capacity, policy effects…"
          onChange={(e) => update(r.key, "description", e.target.value)}
        />
      ),
    },
    {
      title: "",
      width: 80,
      render: (_, r) => (
        <Button
          danger
          size="small"
          onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
        >
          Remove
        </Button>
      ),
    },
  ];

  return (
    <Card title="Forecast Rationale (under the Segment Forecast Share chart)">
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="What this controls"
          description={
            <div style={{ fontSize: 12 }}>
              <div>
                Each row is one OEM: a rank badge, the OEM name, and a short
                explanation of why the forecast places it there.
              </div>
              <div>
                One explanation per OEM, covering the whole forecast window. The
                site shows it beside that OEM&apos;s monthly shares.
              </div>
              <div>
                Saving replaces the whole set for the selected country and
                segment — removing a row here removes it from the site.
              </div>
              <div>
                The section is hidden on the site when nothing is published for
                that country and segment at all.
              </div>
            </div>
          }
        />

        <Space wrap>
          <Select
            value={country}
            onChange={setCountry}
            options={countries}
            style={{ minWidth: 200 }}
            showSearch
            optionFilterProp="label"
          />
          <Select
            value={segment}
            onChange={setSegment}
            options={SEGMENTS}
            style={{ minWidth: 220 }}
          />
          <Button onClick={load} loading={loading}>
            Reload
          </Button>
          <Button
            onClick={() =>
              setRows((prev) => [...prev, blankRow(prev.length + 1)])
            }
          >
            Add OEM row
          </Button>
          <Button type="primary" onClick={save} loading={saving}>
            Save
          </Button>
        </Space>

        <Text type="secondary" style={{ fontSize: 12 }}>
          Editing <b>{segment}</b> for <b>{country}</b> — {rows.length} row(s).
        </Text>

        <Table
          rowKey="key"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          size="small"
        />
      </Space>
    </Card>
  );
}
