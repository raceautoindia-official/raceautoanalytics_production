'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Select,
  Upload,
  message,
  Tabs,
  Table,
  InputNumber,
  Spin,
  Empty,
  Progress,
  Alert,
} from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

// ── Styles + helpers for the Bulk Multi-Month grid (add-on feature only) ──
const bulkTh = (first) => ({
  position: 'sticky',
  top: 0,
  background: '#fafafa',
  padding: '6px 8px',
  borderBottom: '1px solid #eee',
  borderRight: '1px solid #eee',
  fontSize: 12,
  textAlign: 'left',
  fontWeight: 600,
  zIndex: first ? 4 : 1,
  ...(first ? { left: 0 } : {}),
});
const bulkTdLabel = {
  position: 'sticky',
  left: 0,
  background: '#fff',
  zIndex: 2,
  padding: '4px 8px',
  borderRight: '1px solid #eee',
  borderBottom: '1px solid #f5f5f5',
  fontSize: 12,
  whiteSpace: 'nowrap',
  fontWeight: 500,
};
const bulkTd = {
  padding: 2,
  borderBottom: '1px solid #f5f5f5',
  borderRight: '1px solid #f5f5f5',
};
// Strip %, commas and spaces so pasted values like "45.2%" or "1,234" import
// cleanly (never block the paste). cleanCell keeps the display string;
// parseNum coerces to a number for saving.
const cleanCell = (t) => String(t ?? '').replace(/[%,\s]/g, '');
const parseNum = (t) => {
  const c = cleanCell(t);
  if (c === '') return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
};

export default function UploadVolumeData() {
  const [formatCharts, setFormatCharts] = useState([]);
  const [hierarchyNodes, setHierarchyNodes] = useState([]);
  const [contentHierarchy, setContentHierarchy] = useState([]);
  const [streamSelection, setStreamSelection] = useState([]);
  const [streamDropdowns, setStreamDropdowns] = useState([]);
  const [rowChart, setRowChart] = useState(null);
  const [rowLevels, setRowLevels] = useState([]);
  const [selectedRowLevel, setSelectedRowLevel] = useState(null);
  const [colChart, setColChart] = useState(null);
  const [colLevels, setColLevels] = useState([]);
  const [selectedColLevel, setSelectedColLevel] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [manualData, setManualData] = useState([]);
  const [loadingManualTable, setLoadingManualTable] = useState(false);
  const [allVolumeEntries, setAllVolumeEntries] = useState([]);

  // Bulk Multi-Month Entry (add-on) state
  const [bulkGrid, setBulkGrid] = useState({}); // { [monthId]: { [company]: value } }
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [activeTab, setActiveTab] = useState('excel'); // gate heavy bulk work to its tab

  const canShowTabs = rowChart && selectedRowLevel && colChart && selectedColLevel && streamSelection.length;

  useEffect(() => {
    fetch('/api/formatHierarchy', {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
    })
      .then(res => res.json())
      .then(data => {
        setHierarchyNodes(data);
        const roots = data.filter(n => n.parent_id === null);
        setFormatCharts(roots);
      })
      .catch(err => {
        console.error(err);
        message.error('Cannot load format hierarchy');
      });

    fetch('/api/contentHierarchy', {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
    })
      .then(res => res.json())
      .then(data => {
        setContentHierarchy(data);
        const roots = data.filter(n => n.parent_id === null);
        setStreamDropdowns([{ level: 0, options: roots, selected: null }]);
      })
      .catch(err => {
        console.error(err);
        message.error('Cannot load content hierarchy');
      });
  }, []);

  useEffect(() => {
    if (!canShowTabs) return;
    fetch('/api/volumeData', {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
    })
      .then(res => res.json())
      .then(data => setAllVolumeEntries(data))
      .catch(err => {
        console.error(err);
        message.error('Failed to fetch volume data');
      });
  }, [canShowTabs]);

  const updateStreamDropdown = (selectedId, levelIndex) => {
    const updated = [...streamDropdowns];
    updated[levelIndex].selected = selectedId;
    updated.splice(levelIndex + 1);

    const children = contentHierarchy.filter(n => n.parent_id === parseInt(selectedId));
    if (children.length > 0) {
      updated.push({ level: levelIndex + 1, options: children, selected: null });
    }

    setStreamDropdowns(updated);
    setStreamSelection(updated.map(d => d.selected).filter(Boolean));
  };

  const getLevelOptions = (chartId) => {
    const levels = {};
    const traverse = (nodeId, level = 1) => {
      const children = hierarchyNodes.filter(n => n.parent_id === nodeId && n.chart_id === chartId);
      if (children.length > 0) {
        if (!levels[level]) levels[level] = [];
        children.forEach(child => {
          levels[level].push(child);
          traverse(child.id, level + 1);
        });
      }
    };

    hierarchyNodes.filter(n => n.chart_id === chartId && n.parent_id === null).forEach(root => {
      if (!levels[1]) levels[1] = [];
      levels[1].push(root);
      traverse(root.id, 2);
    });

    return Object.entries(levels).map(([lvl, nodes]) => ({
      label: `Level ${lvl}: ${nodes.map(n => n.name).join(', ')}`,
      value: `level-${lvl}`,
      level: parseInt(lvl),
      nodeIds: nodes.map(n => n.id),
      nodeLabels: nodes.map(n => n.name),
    }));
  };

  const handleRowChartSelect = (id) => {
    setRowChart(id);
    setSelectedRowLevel(null);
    setRowLevels(getLevelOptions(id));
    setManualData([]);
  };

  const handleColChartSelect = (id) => {
    setColChart(id);
    setSelectedColLevel(null);
    setColLevels(getLevelOptions(id));
    setManualData([]);
  };

  const handleTemplateDownload = async () => {
    if (!rowChart || !selectedRowLevel || !colChart || !selectedColLevel) {
      return message.error('Please select row & column chart + level first.');
    }
    try {
      setTemplateDownloading(true);
      const res = await fetch('/api/generateExcelTemplate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({
          rowChartId: rowChart,
          rowLevelNodes: selectedRowLevel.nodeIds,
          colChartId: colChart,
          colLevelNodes: selectedColLevel.nodeIds,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).message || 'Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'volume_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      message.error(err.message);
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!fileList.length || !canShowTabs) {
      return message.error('Complete selections & choose a file.');
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('rowChartId', rowChart);
    formData.append('rowLevelNodes', selectedRowLevel.nodeIds.join(','));
    formData.append('colChartId', colChart);
    formData.append('colLevelNodes', selectedColLevel.nodeIds.join(','));
    formData.append('streamPath', streamSelection.join(','));

    try {
      const res = await fetch('/api/uploadVolumeData', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      message.success('Upload successful!');
      setFileList([]);
    } catch (e) {
      message.error('Upload failed: ' + e.message);
    }
  };

  useEffect(() => {
    if (!canShowTabs) return;
    setLoadingManualTable(true);

    const streamKey = streamSelection.join(',');
    const matchingEntry = allVolumeEntries.find(
      entry => entry.formatChartId === rowChart && entry.stream === streamKey
    );
    const data = matchingEntry?.data ?? {};

    const rows = selectedRowLevel.nodeIds.map((rid, idx) => {
      const rowLabel = selectedRowLevel.nodeLabels[idx];
      return {
        key: rid.toString(),
        rowId: rid,
        rowLabel,
        ...selectedColLevel.nodeIds.reduce((acc, cid, cidx) => {
          const colLabel = selectedColLevel.nodeLabels[cidx];
          acc[cid] = data?.[rowLabel]?.[colLabel] ?? null;
          return acc;
        }, {}),
      };
    });

    setManualData(rows);
    setLoadingManualTable(false);
  }, [selectedRowLevel, selectedColLevel, rowChart, colChart, streamSelection, allVolumeEntries]);

  const onManualCellChange = (rowId, colId, newValue) => {
    setManualData(prev => prev.map(r => r.rowId === rowId ? { ...r, [colId]: newValue } : r));
  };

  const handleManualSubmit = async () => {
    if (!canShowTabs) return message.error('Please complete all selections first.');

    const matrix = {};
    manualData.forEach(rowObj => {
      const rLabel = rowObj.rowLabel;
      matrix[rLabel] = {};
      selectedColLevel.nodeIds.forEach((cid, idx) => {
        const cLabel = selectedColLevel.nodeLabels[idx];
        matrix[rLabel][cLabel] = rowObj[cid];
      });
    });

    try {
      const res = await fetch('/api/uploadVolumeData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({
          rowChartId: rowChart,
          rowLevelNodes: selectedRowLevel.nodeIds.join(','),
          colChartId: colChart,
          colLevelNodes: selectedColLevel.nodeIds.join(','),
          streamPath: streamSelection.join(','),
          data: matrix,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Manual submit failed');
      message.success('Manual data submitted successfully!');
    } catch (e) {
      message.error(e.message);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // BULK MULTI-MONTH ENTRY (add-on)
  // Enter many months at once: rows = months under the selected type/year,
  // columns = the same companies as Manual Entry. Saving replays the EXISTING
  // per-month /api/uploadVolumeData call once per month — no backend change,
  // identical storage/merge behaviour. Existing tabs are not affected.
  // ═════════════════════════════════════════════════════════════════════════
  const bulkRowLabel = selectedRowLevel?.nodeLabels?.[0] ?? null; // e.g. "data"
  const bulkCompanies = selectedColLevel?.nodeLabels ?? [];
  const deepestSelectedId = streamSelection.length
    ? Number(streamSelection[streamSelection.length - 1])
    : null;
  const deepestSelectedNode =
    contentHierarchy.find((n) => n.id === deepestSelectedId) || null;
  const deepestIsYear = /^\d{4}$/.test(
    String(deepestSelectedNode?.name || '').trim(),
  );

  // Every leaf (month) node under the deepest selected stream node, chronologically.
  // Only computed while the Bulk tab is active, using O(1) indexed lookups — so
  // it never slows the rest of the CMS or the other Upload sub-tabs.
  const bulkMonths = useMemo(() => {
    if (activeTab !== 'bulk') return [];
    if (!deepestSelectedId || !contentHierarchy.length) return [];

    // Index the tree once (it can be large) for O(1) parent/child lookups.
    const byId = new Map();
    const byParent = new Map();
    for (const n of contentHierarchy) {
      byId.set(n.id, n);
      const a = byParent.get(n.parent_id);
      if (a) a.push(n); else byParent.set(n.parent_id, [n]);
    }
    const childrenOf = (pid) => byParent.get(pid) || [];

    const leaves = [];
    const walk = (pid) => {
      for (const k of childrenOf(pid)) {
        if (childrenOf(k.id).length === 0) leaves.push(k);
        else walk(k.id);
      }
    };
    walk(deepestSelectedId);

    const buildPath = (nodeId) => {
      const path = [];
      let cur = byId.get(nodeId);
      while (cur) {
        path.unshift(cur.id);
        cur = cur.parent_id != null ? byId.get(cur.parent_id) : null;
      }
      return path.join(',');
    };

    // Streams that already carry data for this row-format (de-dupe preference).
    const dataStreams = new Set(
      allVolumeEntries
        .filter((e) => e.formatChartId === rowChart)
        .map((e) => String(e.stream)),
    );
    const MONTH_IDX = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

    // Defensive de-dupe: the tree can contain duplicate month nodes. Keep the
    // one that already has data for this format, so edits land on the live row.
    const seen = new Map();
    for (const leaf of leaves) {
      const parent = byId.get(leaf.parent_id);
      const yearName = String(parent?.name ?? '').trim();
      const monthName = String(leaf.name ?? '').trim();
      const streamPath = buildPath(leaf.id);
      const r = {
        monthId: leaf.id,
        streamPath,
        label: `${yearName} · ${monthName}`,
        shortLabel: `${monthName} '${yearName.slice(-2)}`,
        sortKey: (Number(yearName) || 0) * 100 + (MONTH_IDX[monthName.toLowerCase()] ?? 99),
        hasData: dataStreams.has(streamPath),
      };
      const key = `${yearName.toLowerCase()}|${monthName.toLowerCase()}`;
      const prev = seen.get(key);
      if (!prev || (r.hasData && !prev.hasData)) seen.set(key, r);
    }
    return Array.from(seen.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [activeTab, deepestSelectedId, contentHierarchy, allVolumeEntries, rowChart]);

  // Prefill the grid from existing volume_data (string values for the inputs).
  useEffect(() => {
    if (activeTab !== 'bulk' || !bulkMonths.length || !bulkRowLabel || !bulkCompanies.length) {
      return;
    }
    const byStream = new Map();
    for (const e of allVolumeEntries) {
      if (e.formatChartId === rowChart) byStream.set(String(e.stream), e);
    }
    const grid = {};
    for (const m of bulkMonths) {
      const rowData = byStream.get(m.streamPath)?.data?.[bulkRowLabel] ?? {};
      grid[m.monthId] = {};
      bulkCompanies.forEach((c) => {
        const v = rowData?.[c];
        grid[m.monthId][c] = v === null || v === undefined ? '' : String(v);
      });
    }
    setBulkGrid(grid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bulkMonths, allVolumeEntries, rowChart, bulkRowLabel]);

  // Store the raw typed string (so decimals can be typed); parsed on save.
  const onBulkCell = (monthId, company, raw) => {
    setBulkGrid((prev) => ({
      ...prev,
      [monthId]: { ...(prev[monthId] || {}), [company]: raw },
    }));
  };

  // Paste a block copied from Excel. Grid is transposed (rows = companies,
  // columns = months), so pasted rows map to companies and columns to months.
  // % / commas are stripped (never blocks the paste). Handles single + block.
  const onBulkPaste = (e, startCompanyIdx, startMonthIdx) => {
    const text = e.clipboardData?.getData('text') ?? '';
    if (!text) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
    setBulkGrid((prev) => {
      const next = { ...prev };
      lines.forEach((line, rOff) => {
        const company = bulkCompanies[startCompanyIdx + rOff];
        if (!company) return;
        line.split('\t').forEach((cell, cOff) => {
          const mr = bulkMonths[startMonthIdx + cOff];
          if (!mr) return;
          next[mr.monthId] = { ...(next[mr.monthId] || {}) };
          next[mr.monthId][company] = cleanCell(cell);
        });
      });
      return next;
    });
  };

  const refreshVolume = () =>
    fetch('/api/volumeData', {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
    })
      .then((r) => r.json())
      .then(setAllVolumeEntries)
      .catch(() => {});

  const handleBulkSave = async () => {
    if (!canShowTabs) return message.error('Complete the selections first.');
    if (!bulkRowLabel) return message.error('Pick a single-row Row format (e.g. "data").');

    const toSave = bulkMonths.filter((m) => {
      const v = bulkGrid[m.monthId];
      return v && Object.values(v).some((x) => parseNum(x) !== null);
    });
    if (!toSave.length) return message.warning('No months have values to save.');

    setBulkSaving(true);
    setBulkProgress({ done: 0, total: toSave.length });
    const failed = [];

    for (let i = 0; i < toSave.length; i++) {
      const m = toSave[i];
      const vals = bulkGrid[m.monthId] || {};
      const matrix = { [bulkRowLabel]: {} };
      bulkCompanies.forEach((c) => { matrix[bulkRowLabel][c] = parseNum(vals[c]); });

      try {
        const res = await fetch('/api/uploadVolumeData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          body: JSON.stringify({
            rowChartId: rowChart,
            colChartId: colChart,
            rowLevelNodes: selectedRowLevel.nodeIds.join(','),
            colLevelNodes: selectedColLevel.nodeIds.join(','),
            streamPath: m.streamPath,
            data: matrix,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || j.message || `HTTP ${res.status}`);
        }
      } catch (err) {
        console.error('Bulk save failed for', m.label, err);
        failed.push(m.label);
      }
      setBulkProgress({ done: i + 1, total: toSave.length });
    }

    setBulkSaving(false);
    await refreshVolume();
    if (failed.length) {
      message.warning(
        `Saved ${toSave.length - failed.length}/${toSave.length} months. Failed: ${failed.join(', ')}`,
      );
    } else {
      message.success(`Saved all ${toSave.length} month(s) successfully.`);
    }
  };

  // One-click: create any missing jan–dec under the selected YEAR node.
  const handleGenerateMonths = async () => {
    if (!deepestIsYear || !deepestSelectedId) {
      return message.info('Select the stream down to a specific YEAR to add its months.');
    }
    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const existing = contentHierarchy
      .filter((n) => n.parent_id === deepestSelectedId)
      .map((n) => String(n.name).trim().toLowerCase());
    const missing = MONTHS.filter((m) => !existing.includes(m));
    if (!missing.length) return message.info('All 12 months already exist for this year.');
    try {
      for (const m of missing) {
        await fetch('/api/contentHierarchy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          body: JSON.stringify({ parent_id: deepestSelectedId, name: m }),
        });
      }
      const data = await fetch('/api/contentHierarchy', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
      }).then((r) => r.json());
      setContentHierarchy(data);
      message.success(`Added ${missing.length} month(s) to the selected year.`);
    } catch (e) {
      message.error('Failed to add months: ' + e.message);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>Upload Volume Data with Format Validation</h3>

      {/* ─── Row Chart / Level Selection ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <strong>Row Flow Chart:</strong>
        <Select
          placeholder="Select Row Chart"
          value={rowChart}
          onChange={handleRowChartSelect}
          options={formatCharts.map((c) => ({ label: c.name, value: c.id }))}
          style={{ width: 250, marginLeft: 8 }}
          allowClear
        />
        {rowLevels.length > 0 && (
          <Select
            placeholder="Select Row Level"
            value={selectedRowLevel?.value}
            onChange={(val) => {
              const lvl = rowLevels.find((l) => l.value === val);
              setSelectedRowLevel(lvl);
            }}
            options={rowLevels.map((l) => ({ label: l.label, value: l.value }))}
            style={{ width: 400, marginLeft: 16 }}
            allowClear
          />
        )}
      </div>

      {/* ─── Column Chart / Level Selection ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <strong>Column Flow Chart:</strong>
        <Select
          placeholder="Select Column Chart"
          value={colChart}
          onChange={handleColChartSelect}
          options={formatCharts.map((c) => ({ label: c.name, value: c.id }))}
          style={{ width: 250, marginLeft: 8 }}
          allowClear
        />
        {colLevels.length > 0 && (
          <Select
            placeholder="Select Column Level"
            value={selectedColLevel?.value}
            onChange={(val) => {
              const lvl = colLevels.find((l) => l.value === val);
              setSelectedColLevel(lvl);
            }}
            options={colLevels.map((l) => ({ label: l.label, value: l.value }))}
            style={{ width: 400, marginLeft: 16 }}
            allowClear
          />
        )}
      </div>

      {/* ─── Stream Selection ───────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <strong>Stream Selection:</strong>
        {streamDropdowns.map((dd, i) => (
          <Select
            key={i}
            placeholder={`Level ${i + 1}`}
            value={dd.selected}
            onChange={(val) => updateStreamDropdown(val, i)}
            options={dd.options.map((o) => ({
              label: o.name,
              value: o.id.toString(),
            }))}
            style={{ width: 250, marginRight: 8, marginBottom: 8 }}
            allowClear
          />
        ))}
        {streamSelection.length > 0 && (
          <div style={{ marginTop: 8, fontStyle: 'italic' }}>
            <strong>Selected Stream:</strong>{' '}
            {streamSelection
              .map(
                (id) =>
                  contentHierarchy.find((n) => n.id.toString() === id)?.name
              )
              .filter(Boolean)
              .join(' > ')}
          </div>
        )}
      </div>

      {/* If we have all four selections, show the two tabs: */}
      {canShowTabs ? (
        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 16 }}>
          {/* ─── TAB 1: Upload Excel ──────────────────────────────────────────────── */}
          <TabPane tab="Upload Excel" key="excel">
            <div style={{ marginBottom: 16 }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleTemplateDownload}
                loading={templateDownloading}
              >
                Download Template
              </Button>
            </div>

            <Upload
              beforeUpload={(file) => {
                setFileList([file]);
                return false; // prevent direct upload
              }}
              fileList={fileList}
              onRemove={() => setFileList([])}
            >
              <Button icon={<UploadOutlined />}>
                Select Excel File
              </Button>
            </Upload>

            <Button
              type="primary"
              onClick={handleUpload}
              style={{ marginTop: 16 }}
            >
              Upload Volume Data
            </Button>
          </TabPane>

          {/* ─── TAB 2: Manual Entry ──────────────────────────────────────────────── */}
          <TabPane tab="Manual Entry" key="manual">
            {loadingManualTable ? (
              <Spin tip="Building table..." style={{ marginTop: 20 }} />
            ) : manualData.length === 0 ? (
              <Empty description="No manual table data." />
            ) : (
              <>
                <Table
                  dataSource={manualData}
                  pagination={false}
                  bordered
                  scroll={{ x: 'max-content' }}
                  rowKey="rowId"
                  style={{ marginBottom: 16 }}
                >
                  {/* First column: Row Label */}
                  <Table.Column
                    title="Row Label"
                    dataIndex="rowLabel"
                    key="rowLabel"
                    fixed="left"
                    width={200}
                  />

                  {selectedColLevel.nodeIds.map((cid, idx) => (
                    <Table.Column
                      key={cid}
                      title={selectedColLevel.nodeLabels[idx]}
                      dataIndex={cid}
                      width={120}
                      render={(_, record) => (
                        <InputNumber
                          min={0}
                          style={{ width: '100%' }}
                          value={record[cid]}
                          onChange={(val) =>
                            onManualCellChange(record.rowId, cid, val)
                          }
                        />
                      )}
                    />
                  ))}
                </Table>

                <Button type="primary" onClick={handleManualSubmit}>
                  Submit Manual Data
                </Button>
              </>
            )}
          </TabPane>

          {/* ─── TAB 3: Bulk Multi-Month Entry (ADD-ON — existing tabs untouched) ─── */}
          <TabPane tab="Bulk Multi-Month Entry" key="bulk">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Enter many months at once"
              description={
                <span>
                  Select the stream down to the <b>type</b> (e.g. “market share”) or a{' '}
                  <b>year</b> — <i>not</i> a single month. The grid shows{' '}
                  <b>companies as rows and months as columns</b>. Type values, or{' '}
                  <b>copy a block from Excel and paste (Ctrl+V)</b> starting at any cell —{' '}
                  <b>%, commas and spaces are stripped automatically</b>. Then “Save All Months”.
                  This reuses the same per-month save — nothing else changes.
                </span>
              }
            />

            {deepestIsYear && (
              <Button
                size="small"
                onClick={handleGenerateMonths}
                style={{ marginBottom: 12 }}
              >
                + Add missing Jan–Dec to “{deepestSelectedNode?.name}”
              </Button>
            )}

            {!bulkRowLabel || !bulkCompanies.length ? (
              <Empty description="Pick Row format, Column format and a stream (down to type/year) to build the grid." />
            ) : bulkMonths.length === 0 ? (
              <Empty description="No month nodes found under the selected stream. Select down to a type/year that has months (or add months above)." />
            ) : (
              <>
                <div
                  style={{
                    overflow: 'auto',
                    maxHeight: 520,
                    border: '1px solid #f0f0f0',
                    borderRadius: 6,
                  }}
                >
                  <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
                    <thead>
                      <tr>
                        <th style={bulkTh(true)}>Company</th>
                        {bulkMonths.map((m) => (
                          <th key={m.monthId} style={bulkTh(false)} title={m.label}>
                            <div
                              style={{
                                maxWidth: 90,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {m.shortLabel}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkCompanies.map((c, compIdx) => (
                        <tr key={c}>
                          <td style={bulkTdLabel} title={c}>
                            <div
                              style={{
                                maxWidth: 200,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c}
                            </div>
                          </td>
                          {bulkMonths.map((m, monthIdx) => (
                            <td key={m.monthId} style={bulkTd}>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={bulkGrid[m.monthId]?.[c] ?? ''}
                                onChange={(e) => onBulkCell(m.monthId, c, e.target.value)}
                                onPaste={(e) => onBulkPaste(e, compIdx, monthIdx)}
                                style={{
                                  width: 84,
                                  border: '1px solid #eee',
                                  borderRadius: 4,
                                  padding: '4px 6px',
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {bulkSaving && (
                  <Progress
                    style={{ marginTop: 12, maxWidth: 420 }}
                    percent={
                      bulkProgress.total
                        ? Math.round((bulkProgress.done / bulkProgress.total) * 100)
                        : 0
                    }
                    format={() => `${bulkProgress.done}/${bulkProgress.total} months`}
                  />
                )}

                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Button type="primary" onClick={handleBulkSave} loading={bulkSaving}>
                    Save All Months
                  </Button>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    {bulkCompanies.length} companies × {bulkMonths.length} months
                  </span>
                </div>
              </>
            )}
          </TabPane>
        </Tabs>
      ) : (
        <div style={{ marginTop: 16, fontStyle: 'italic' }}>
          Please select row‐chart, row‐level, column‐chart, column‐level, and stream to proceed.
        </div>
      )}
    </div>
  );
}


// 'use client';
// import { useState, useEffect, useMemo } from 'react';
// import {
//   Button,
//   Select,
//   Upload,
//   message,
//   Tabs,
//   Table,
//   InputNumber,
//   Spin,
//   Empty,
// } from 'antd';
// import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

// const { TabPane } = Tabs;
// const { Option } = Select;

// export default function UploadVolumeData() {
//   //
//   // ─── STATE ────────────────────────────────────────────────────────────────────
//   //
//   const [formatCharts, setFormatCharts] = useState([]);       // all formatHierarchy roots
//   const [hierarchyNodes, setHierarchyNodes] = useState([]);   // raw nodes from /api/formatHierarchy
//   const [contentHierarchy, setContentHierarchy] = useState([]);// raw nodes from /api/contentHierarchy

//   // Stream dropdown machinery
//   const [streamSelection, setStreamSelection] = useState([]);
//   const [streamDropdowns, setStreamDropdowns] = useState([]);

//   // Row‐chart → available row levels → picked level
//   const [rowChart, setRowChart] = useState(null);
//   const [rowLevels, setRowLevels] = useState([]);
//   const [selectedRowLevel, setSelectedRowLevel] = useState(null);

//   // Col‐chart → available col levels → picked level
//   const [colChart, setColChart] = useState(null);
//   const [colLevels, setColLevels] = useState([]);
//   const [selectedColLevel, setSelectedColLevel] = useState(null);

//   // Excel Upload state
//   const [fileList, setFileList] = useState([]);
//   const [templateDownloading, setTemplateDownloading] = useState(false);

//   // Manual‐entry state
//   const [manualData, setManualData] = useState([]); // array of { rowId, rowLabel, [colId]: value, ... }
//   const [loadingManualTable, setLoadingManualTable] = useState(false);

//   // Whether a valid “mode” is chosen; only show tabs when all four picks exist
//   const canShowTabs = rowChart && selectedRowLevel && colChart && selectedColLevel && streamSelection.length;

//   //
//   // ─── FETCH INITIAL → formatCharts & contentHierarchy ────────────────────────────
//   //
//   useEffect(() => {
//     // 1) Load formatHierarchy (for formatCharts + hierarchyNodes)
//     fetch('/api/formatHierarchy', {
//       headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         setHierarchyNodes(data);
//         const roots = data.filter((n) => n.parent_id === null);
//         setFormatCharts(roots);
//       })
//       .catch((err) => {
//         console.error(err);
//         message.error('Cannot load format hierarchy');
//       });

//     // 2) Load contentHierarchy (for stream dropdowns)
//     fetch('/api/contentHierarchy', {
//       headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}` },
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         setContentHierarchy(data);
//         const roots = data.filter((n) => n.parent_id === null);
//         setStreamDropdowns([{ level: 0, options: roots, selected: null }]);
//       })
//       .catch((err) => {
//         console.error(err);
//         message.error('Cannot load content hierarchy');
//       });
//   }, []);

//   //
//   // ─── STREAM DROPDOWN HANDLER ────────────────────────────────────────────────────
//   //
//   const updateStreamDropdown = (selectedId, levelIndex) => {
//     const updated = [...streamDropdowns];
//     updated[levelIndex].selected = selectedId;
//     updated.splice(levelIndex + 1); // remove deeper levels

//     const children = contentHierarchy.filter(
//       (n) => n.parent_id === parseInt(selectedId)
//     );
//     if (children.length > 0) {
//       updated.push({ level: levelIndex + 1, options: children, selected: null });
//     }

//     setStreamDropdowns(updated);
//     setStreamSelection(updated.map((d) => d.selected).filter(Boolean));
//   };

//   //
//   // ─── LEVEL OPTIONS HELPER ──────────────────────────────────────────────────────
//   // Given a chartId, returns an array of { label, value, level, nodeIds } for each
//   // level in that chart’s hierarchy. We reuse code from your existing getLevelOptions.
//   //
//   const getLevelOptions = (chartId) => {
//     const levels = {};

//     // depth‐first traversal to group by “distance from root”
//     const traverse = (nodeId, level = 1) => {
//       const children = hierarchyNodes.filter(
//         (n) => n.parent_id === nodeId && n.chart_id === chartId
//       );
//       if (children.length > 0) {
//         if (!levels[level]) levels[level] = [];
//         children.forEach((child) => {
//           levels[level].push(child);
//           traverse(child.id, level + 1);
//         });
//       }
//     };

//     hierarchyNodes
//       .filter((n) => n.chart_id === chartId && n.parent_id === null)
//       .forEach((root) => {
//         if (!levels[1]) levels[1] = [];
//         levels[1].push(root);
//         traverse(root.id, 2);
//       });

//     return Object.entries(levels).map(([lvl, nodes]) => ({
//       label: `Level ${lvl}: ${nodes.map((n) => n.name).join(', ')}`,
//       value: `level-${lvl}`,
//       level: parseInt(lvl),
//       nodeIds: nodes.map((n) => n.id),
//       nodeLabels:    nodes.map((n) => n.name),
//     }));
//   };

//   //
//   // ─── ROW / COL SELECTION HANDLERS ──────────────────────────────────────────────
//   //
//   const handleRowChartSelect = (id) => {
//     setRowChart(id);
//     setSelectedRowLevel(null);
//     const levels = getLevelOptions(id);
//     setRowLevels(levels);
//     setManualData([]); // clear manual form if switching
//   };

//   const handleColChartSelect = (id) => {
//     setColChart(id);
//     setSelectedColLevel(null);
//     const levels = getLevelOptions(id);
//     setColLevels(levels);
//     setManualData([]);
//   };

//   //
//   // ─── TEMPLATE DOWNLOAD (EXCEL) ─────────────────────────────────────────────────
//   //
//   const handleTemplateDownload = async () => {
//     if (!rowChart || !selectedRowLevel || !colChart || !selectedColLevel) {
//       return message.error('Please select row & column chart + level first.');
//     }
//     try {
//       setTemplateDownloading(true);
//       const res = await fetch('/api/generateExcelTemplate', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
//         },
//         body: JSON.stringify({
//           rowChartId: rowChart,
//           rowLevelNodes: selectedRowLevel.nodeIds,
//           colChartId: colChart,
//           colLevelNodes: selectedColLevel.nodeIds,
//         }),
//       });

//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.message || 'Template download failed');
//       }

//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = 'volume_template.xlsx';
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//     } catch (err) {
//       message.error(err.message);
//     } finally {
//       setTemplateDownloading(false);
//     }
//   };

//   //
//   // ─── EXCEL UPLOAD HANDLER ───────────────────────────────────────────────────────
//   //
//   const handleUpload = async () => {
//     if (
//       !fileList.length ||
//       !rowChart ||
//       !selectedRowLevel ||
//       !colChart ||
//       !selectedColLevel ||
//       !streamSelection.length
//     ) {
//       return message.error('Please complete all selections & choose a file.');
//     }

//     const formData = new FormData();
//     formData.append('file', fileList[0]);
//     formData.append('rowChartId', rowChart);
//     formData.append('rowLevelNodes', selectedRowLevel.nodeIds.join(','));
//     formData.append('colChartId', colChart);
//     formData.append('colLevelNodes', selectedColLevel.nodeIds.join(','));
//     formData.append('streamPath', streamSelection.join(','));

//     try {
//       const res = await fetch('/api/uploadVolumeData', {
//         method: 'POST',
//         body: formData,
//         headers: {
//           Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
//         },
//       });
//       if (res.ok) {
//         message.success('Upload successful!');
//         setFileList([]);
//       } else {
//         const error = await res.json();
//         if (error.details) {
//           const messages = [];
//           if (error.details.missingRowLabels?.length) {
//             messages.push(
//               `Missing row labels: ${error.details.missingRowLabels.join(', ')}`
//             );
//           }
//           if (error.details.missingColumnLabels?.length) {
//             messages.push(
//               `Missing column labels: ${error.details.missingColumnLabels.join(', ')}`
//             );
//           }
//           message.error(messages.join('\n'));
//         } else {
//           message.error(error.message || 'Upload failed');
//         }
//       }
//     } catch (e) {
//       message.error('Upload failed: ' + e.message);
//     }
//   };

//   //
//   // ─── MANUAL ENTRY: BUILD AN “EXCEL-LIKE” TABLE ─────────────────────────────────
//   //
//   // Whenever row/col levels change, rebuild an empty 2D table in state:
//   useEffect(() => {
//     if (selectedRowLevel && selectedColLevel) {
//       setLoadingManualTable(true);

//       // Build initial rows: one per rowLabel
//       const rows = selectedRowLevel.nodeIds.map((rid, idx) => ({
//         key: rid.toString(),
//         rowId: rid,
//         rowLabel: selectedRowLevel.nodeLabels[idx],
//         // initialize each column to null:
//         ...selectedColLevel.nodeIds.reduce((acc, cid) => {
//           acc[cid] = null;
//           return acc;
//         }, {}),
//       }));

//       setManualData(rows);
//       setLoadingManualTable(false);
//     }
//   }, [selectedRowLevel, selectedColLevel]);

//   // Handler when a manual cell changes:
//   const onManualCellChange = (rowId, colId, newValue) => {
//     setManualData((prev) =>
//       prev.map((r) =>
//         r.rowId === rowId ? { ...r, [colId]: newValue } : r
//       )
//     );
//   };

//   // Submit manual data exactly like Excel: POST JSON instead of file
//   const handleManualSubmit = async () => {
//     if (
//       !rowChart ||
//       !selectedRowLevel ||
//       !colChart ||
//       !selectedColLevel ||
//       !streamSelection.length
//     ) {
//       return message.error('Please complete all selections first.');
//     }

//     // Convert manualData (array of { rowId, rowLabel, [colId]: val, ... })
//     // into a “matrix” object keyed by rowLabel → {colLabel: value}
//     const matrix = {};
//     manualData.forEach((rowObj) => {
//       const rLabel = rowObj.rowLabel;
//       matrix[rLabel] = {};
//       selectedColLevel.nodeIds.forEach((cid, idx) => {
//         const cLabel = selectedColLevel.nodeLabels[idx];
//         matrix[rLabel][cLabel] = rowObj[cid];
//       });
//     });

//     try {
//       const payload = {
//         rowChartId: rowChart,
//         rowLevelNodes: selectedRowLevel.nodeIds.join(','),
//         colChartId: colChart,
//         colLevelNodes: selectedColLevel.nodeIds.join(','),
//         streamPath: streamSelection.join(','),
//         data: matrix,
//       };
//       const res = await fetch('/api/uploadVolumeData', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
//         },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.message || 'Manual submit failed');
//       }
//       message.success('Manual data submitted successfully!');
//       // Clear the table
//       setManualData((prev) =>
//         prev.map((r) => {
//           const copy = { ...r };
//           selectedColLevel.nodeIds.forEach((cid) => {
//             copy[cid] = null;
//           });
//           return copy;
//         })
//       );
//     } catch (e) {
//       message.error(e.message);
//     }
//   };

//   //
//   // ─── RENDER ─────────────────────────────────────────────────────────────────────
//   //
//   return (
//     <div style={{ padding: 16 }}>
//       <h3>Upload Volume Data with Format Validation</h3>

//       {/* ─── Row Chart / Level Selection ───────────────────────────────────────────────── */}
//       <div style={{ marginBottom: 16 }}>
//         <strong>Row Flow Chart:</strong>
//         <Select
//           placeholder="Select Row Chart"
//           value={rowChart}
//           onChange={handleRowChartSelect}
//           options={formatCharts.map((c) => ({ label: c.name, value: c.id }))}
//           style={{ width: 250, marginLeft: 8 }}
//           allowClear
//         />
//         {rowLevels.length > 0 && (
//           <Select
//             placeholder="Select Row Level"
//             value={selectedRowLevel?.value}
//             onChange={(val) => {
//               const lvl = rowLevels.find((l) => l.value === val);
//               setSelectedRowLevel(lvl);
//             }}
//             options={rowLevels.map((l) => ({ label: l.label, value: l.value }))}
//             style={{ width: 400, marginLeft: 16 }}
//             allowClear
//           />
//         )}
//       </div>

//       {/* ─── Column Chart / Level Selection ─────────────────────────────────────────────── */}
//       <div style={{ marginBottom: 16 }}>
//         <strong>Column Flow Chart:</strong>
//         <Select
//           placeholder="Select Column Chart"
//           value={colChart}
//           onChange={handleColChartSelect}
//           options={formatCharts.map((c) => ({ label: c.name, value: c.id }))}
//           style={{ width: 250, marginLeft: 8 }}
//           allowClear
//         />
//         {colLevels.length > 0 && (
//           <Select
//             placeholder="Select Column Level"
//             value={selectedColLevel?.value}
//             onChange={(val) => {
//               const lvl = colLevels.find((l) => l.value === val);
//               setSelectedColLevel(lvl);
//             }}
//             options={colLevels.map((l) => ({ label: l.label, value: l.value }))}
//             style={{ width: 400, marginLeft: 16 }}
//             allowClear
//           />
//         )}
//       </div>

//       {/* ─── Stream Selection ───────────────────────────────────────────────────────────── */}
//       <div style={{ marginBottom: 16 }}>
//         <strong>Stream Selection:</strong>
//         {streamDropdowns.map((dd, i) => (
//           <Select
//             key={i}
//             placeholder={`Level ${i + 1}`}
//             value={dd.selected}
//             onChange={(val) => updateStreamDropdown(val, i)}
//             options={dd.options.map((o) => ({
//               label: o.name,
//               value: o.id.toString(),
//             }))}
//             style={{ width: 250, marginRight: 8, marginBottom: 8 }}
//             allowClear
//           />
//         ))}
//         {streamSelection.length > 0 && (
//           <div style={{ marginTop: 8, fontStyle: 'italic' }}>
//             <strong>Selected Stream:</strong>{' '}
//             {streamSelection
//               .map(
//                 (id) =>
//                   contentHierarchy.find((n) => n.id.toString() === id)?.name
//               )
//               .filter(Boolean)
//               .join(' > ')}
//           </div>
//         )}
//       </div>

//       {/* If we have all four selections, show the two tabs: */}
//       {canShowTabs ? (
//         <Tabs defaultActiveKey="excel" style={{ marginTop: 16 }}>
//           {/* ─── TAB 1: Upload Excel ──────────────────────────────────────────────── */}
//           <TabPane tab="Upload Excel" key="excel">
//             <div style={{ marginBottom: 16 }}>
//               <Button
//                 icon={<DownloadOutlined />}
//                 onClick={handleTemplateDownload}
//                 loading={templateDownloading}
//               >
//                 Download Template
//               </Button>
//             </div>

//             <Upload
//               beforeUpload={(file) => {
//                 setFileList([file]);
//                 return false; // prevent direct upload
//               }}
//               fileList={fileList}
//               onRemove={() => setFileList([])}
//             >
//               <Button icon={<UploadOutlined />}>
//                 Select Excel File
//               </Button>
//             </Upload>

//             <Button
//               type="primary"
//               onClick={handleUpload}
//               style={{ marginTop: 16 }}
//             >
//               Upload Volume Data
//             </Button>
//           </TabPane>

//           {/* ─── TAB 2: Manual Entry ──────────────────────────────────────────────── */}
//           <TabPane tab="Manual Entry" key="manual">
//             {loadingManualTable ? (
//               <Spin tip="Building table..." style={{ marginTop: 20 }} />
//             ) : manualData.length === 0 ? (
//               <Empty description="No manual table data." />
//             ) : (
//               <>
//                 <Table
//                   dataSource={manualData}
//                   pagination={false}
//                   bordered
//                   scroll={{ x: 'max-content' }}
//                   rowKey="rowId"
//                   style={{ marginBottom: 16 }}
//                 >
//                   {/* First column: Row Label */}
//                   <Table.Column
//                     title="Row Label"
//                     dataIndex="rowLabel"
//                     key="rowLabel"
//                     fixed="left"
//                     width={200}
//                   />

//                   {selectedColLevel.nodeIds.map((cid, idx) => (
//                     <Table.Column
//                       key={cid}
//                       title={selectedColLevel.nodeLabels[idx]}
//                       dataIndex={cid}
//                       width={120}
//                       render={(_, record) => (
//                         <InputNumber
//                           min={0}
//                           style={{ width: '100%' }}
//                           value={record[cid]}
//                           onChange={(val) =>
//                             onManualCellChange(record.rowId, cid, val)
//                           }
//                         />
//                       )}
//                     />
//                   ))}
//                 </Table>

//                 <Button type="primary" onClick={handleManualSubmit}>
//                   Submit Manual Data
//                 </Button>
//               </>
//             )}
//           </TabPane>
//         </Tabs>
//       ) : (
//         <div style={{ marginTop: 16, fontStyle: 'italic' }}>
//           Please select row‐chart, row‐level, column‐chart, column‐level, and stream to proceed.
//         </div>
//       )}
//     </div>
//   );
// }






