// File: app/components/SubmissionYearlyScores.jsx
'use client';
import React, { useMemo } from 'react';
import { Table } from 'antd';
// adjust path if needed:
import { useYearlyScores } from '../../hooks/YearlyScores';

export default function SubmissionYearlyScores({ submission }) {
  const {
    posAttributes = [],
    negAttributes = [],
    posScores     = {},
    negScores     = {},
    weights       = {},
    yearNames     = [],
  } = submission;

  // compute [{ year, score }, ...]
  const data = useYearlyScores(
    posAttributes,
    negAttributes,
    posScores,
    negScores,
    weights,
    yearNames
  );

  // build columns & a single-row dataSource
  const columns = useMemo(
    () =>
      data.map(({ year }) => ({
        title: year,
        dataIndex: year,
        key: year,
        align: 'center',
      })),
    [data]
  );

  const dataSource = useMemo(() => {
    if (data.length === 0) return [];
    const row = data.reduce((acc, { year, score }) => {
      acc[year] = score.toFixed(2);
      return acc;
    }, {});
    // AntD needs a unique key
    return [{ key: submission.id || 'row', ...row }];
  }, [data, submission.id]);

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      bordered
      size="small"
    />
  );
}
