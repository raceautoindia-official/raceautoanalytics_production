// File: app/admin/cms/MLScoreRange.jsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  Space,
  message,
  Table,
  Tag,
  Modal,
  Typography,
  Select,
  Tooltip,
} from 'antd';

const { Text, Paragraph } = Typography;

const STATUS_COLORS = {
  success: 'green',
  error: 'red',
  timeout: 'orange',
  started: 'blue',
};

const PAGE_SIZE_DEFAULT = 20;

export default function MLScoreRange() {
  const [form] = Form.useForm();

  // Controls
  const [graphId, setGraphId] = useState();
  const [clusters, setClusters] = useState();
  const [loadingRun, setLoadingRun] = useState(false);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(['success', 'error', 'timeout', 'started']);

  // Latest result modal
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [latestResult, setLatestResult] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  const fetchLogs = useCallback(async (opts = {}) => {
    const {
      page: p = page,
      pageSize: ps = pageSize,
      graphId: g = graphId,
      statuses = statusFilter,
    } = opts;

    const params = new URLSearchParams();
    params.set('page', String(p));
    params.set('pageSize', String(ps));
    if (g) params.set('graphId', String(g));
    if (statuses?.length) params.set('status', statuses.join(','));

    setLogsLoading(true);
    try {
      const res = await fetch(`/api/ml/logs?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Logs error ${res.status}`);
      const data = await res.json();
      setLogs(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
      setPageSize(data.pageSize || ps);
    } catch (e) {
      console.error(e);
      message.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, [page, pageSize, graphId, statusFilter]);

  useEffect(() => {
    fetchLogs({ page: 1 }); // initial load
  }, []); // eslint-disable-line

  const onRun = async () => {
    try {
      const values = await form.validateFields();
      const body = {
        graphId: values.graphId,
        source: 'manual',
      };
      if (values.clusters != null) body.clusters = values.clusters;

      setLoadingRun(true);
      const res = await fetch('/api/ml/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        message.error('Unauthorized: /api/ml/recompute requires server-side token (we can add a proxy later).');
        setLoadingRun(false);
        return;
      }
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data?.error || `Recompute failed (${res.status})`);
      }
      message.success(`Recompute started: requestId ${data.requestId || '—'}`);
      // refresh logs (will show a 'started' row)
      fetchLogs({ page: 1 });
    } catch (e) {
      console.error(e);
      message.error(e.message || 'Failed to run ML');
    } finally {
      setLoadingRun(false);
    }
  };

  const onViewLatest = async () => {
    const g = form.getFieldValue('graphId') || graphId;
    if (!g) {
      message.warning('Enter a Graph ID first');
      return;
    }
    setResultLoading(true);
    try {
      const res = await fetch(`/api/ml/results?graphId=${encodeURIComponent(g)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Fetch result failed ${res.status}`);
      const data = await res.json();
      if (!data.exists) {
        message.info('No ML result exists for this graph yet.');
        setLatestResult(null);
      } else {
        setLatestResult(data);
        setResultModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      message.error('Failed to load latest result');
    } finally {
      setResultLoading(false);
    }
  };

  const columns = useMemo(() => ([
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{new Date(v).toLocaleString()}</span>,
    },
    {
      title: 'Finished',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      render: (v) => v ? <span style={{ whiteSpace: 'nowrap' }}>{new Date(v).toLocaleString()}</span> : <em>—</em>,
    },
    {
      title: 'Duration (ms)',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 120,
      render: (v) => v ?? <em>—</em>,
    },
    {
      title: 'Graph',
      dataIndex: 'graphId',
      key: 'graphId',
      width: 90,
    },
    {
      title: 'Clusters',
      dataIndex: 'clusters',
      key: 'clusters',
      width: 90,
    },
    {
      title: 'Model',
      dataIndex: 'modelVersion',
      key: 'modelVersion',
      width: 130,
      render: (v) => v || <em>—</em>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Py Status',
      dataIndex: 'pythonStatusCode',
      key: 'pythonStatusCode',
      width: 110,
      render: (v) => v ?? <em>—</em>,
    },
    {
      title: 'Groups',
      dataIndex: 'outputCountGroups',
      key: 'outputCountGroups',
      width: 100,
      render: (v) => v ?? <em>—</em>,
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 110,
    },
    {
      title: 'Request ID',
      dataIndex: 'requestId',
      key: 'requestId',
      render: (v) => <code style={{ fontSize: 12 }}>{v}</code>,
    },
    {
      title: 'Error',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      ellipsis: true,
      render: (v) =>
        v ? (
          <Tooltip title={v}>
            <span style={{ maxWidth: 240, display: 'inline-block' }}>{String(v)}</span>
          </Tooltip>
        ) : (
          <em>—</em>
        ),
    },
  ]), []);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Run ML (Score Ranges)">
        <Form
          form={form}
          layout="inline"
          onValuesChange={(_, all) => {
            setGraphId(all.graphId);
            setClusters(all.clusters);
          }}
        >
          <Form.Item
            name="graphId"
            label="Graph ID"
            rules={[{ required: true, message: 'Graph ID is required' }]}
          >
            <InputNumber min={1} placeholder="e.g. 123" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="clusters" label="Clusters">
            <InputNumber min={1} max={20} placeholder="server default" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onRun} loading={loadingRun}>
                Run
              </Button>
              <Button onClick={onViewLatest} loading={resultLoading}>
                View Latest Result
              </Button>
              <Button onClick={() => fetchLogs({ page: 1 })} loading={logsLoading}>
                Refresh Logs
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space align="center">
            <Text strong>Logs</Text>
          </Space>
        }
        extra={
          <Space>
            <InputNumber
              min={1}
              placeholder="Filter: Graph ID"
              value={graphId}
              onChange={(v) => { setGraphId(v); setPage(1); }}
              style={{ width: 160 }}
            />
            <Select
              mode="multiple"
              allowClear
              style={{ width: 260 }}
              placeholder="Filter: Status"
              value={statusFilter}
              onChange={(vals) => { setStatusFilter(vals); setPage(1); }}
              options={[
                { value: 'success', label: 'success' },
                { value: 'error', label: 'error' },
                { value: 'timeout', label: 'timeout' },
                { value: 'started', label: 'started' },
              ]}
            />
            <Button onClick={() => fetchLogs({ page: 1 })} loading={logsLoading}>
              Apply
            </Button>
          </Space>
        }
      >
        <Table
          rowKey={(r) => r.id}
          dataSource={logs}
          columns={columns}
          loading={logsLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p); setPageSize(ps);
              fetchLogs({ page: p, pageSize: ps });
            },
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={`Latest ML Result — Graph ${form.getFieldValue('graphId') || graphId || ''}`}
        open={resultModalOpen}
        onCancel={() => setResultModalOpen(false)}
        footer={<Button onClick={() => setResultModalOpen(false)}>Close</Button>}
        width={900}
      >
        {!latestResult ? (
          <Text type="secondary">No data.</Text>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(latestResult, null, 2)}
          </pre>
        )}
      </Modal>
    </Space>
  );
}
