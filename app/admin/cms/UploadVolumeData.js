'use client';
import { useState, useEffect } from 'react';
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
} from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

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
        <Tabs defaultActiveKey="excel" style={{ marginTop: 16 }}>
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






