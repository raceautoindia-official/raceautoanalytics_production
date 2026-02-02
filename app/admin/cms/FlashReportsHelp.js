"use client";

import React from "react";
import { Card, Typography, Divider, Steps, Alert } from "antd";

const { Title, Paragraph, Text } = Typography;

export default function FlashReportsHelp() {
  return (
    <Card style={{ maxWidth: 980 }}>
      <Title level={4} style={{ marginBottom: 8 }}>
        Flash Reports — Admin Instructions
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        This section controls what users see on Flash Reports charts (monthly).
        Historical volumes come from the Flash monthly stream; forecast overlays
        come from Flash graphs + submissions + AI/Race month JSON.
      </Paragraph>

      <Alert
        type="info"
        showIcon
        message="Important rule"
        description={
          <span>
            Forecast overlays appear only when users view the{" "}
            <b>latest month</b>
            (switches on the 5th of each month in Asia/Kolkata). Older months
            show only historical values.
          </span>
        }
        style={{ marginBottom: 16 }}
      />

      <Steps
        direction="vertical"
        size="small"
        items={[
          {
            title: "Create Flash graphs (one per segment)",
            description: (
              <span>
                Go to <Text strong>Flash Graphs</Text>. Create graphs for:
                Overall, PV, CV, 2W, 3W, Tractor, Truck, Bus. Keep{" "}
                <Text code>context=flash</Text>
                and <Text code>score_settings_key=flashScoreSettings</Text>.
              </span>
            ),
          },
          {
            title: "Map segments → graph IDs",
            description: (
              <span>
                Go to <Text strong>Graph → Segment Mapping</Text> and select the
                correct graph for each segment. If a graph doesn’t exist yet,
                leave it empty.
              </span>
            ),
          },
          {
            title: "Add questions for each Flash graph",
            description: (
              <span>
                Go to <Text strong>Flash Questions</Text>. Add positive/negative
                questions with weights. These power Survey Avg + BYOF lines.
              </span>
            ),
          },
          {
            title: "Configure Flash score settings",
            description: (
              <span>
                Go to <Text strong>Flash Score Settings</Text> (key:{" "}
                <Text code>flashScoreSettings</Text>) and set the
                dropdown/period labels used in Flash scoring.
              </span>
            ),
          },
          {
            title: "Generate AI forecasts (Flash)",
            description: (
              <span>
                Use the Flash AI generator (if enabled) to automatically write
                month-keyed values into <Text code>graphs.ai_forecast</Text> as
                <Text code>{`{ "YYYY-MM": volume }`}</Text>.
              </span>
            ),
          },
        ]}
      />

      <Divider />

      <Title level={5} style={{ marginBottom: 6 }}>
        Quick checklist
      </Title>
      <Paragraph style={{ marginBottom: 0 }}>
        <ul style={{ marginLeft: 18 }}>
          <li>Flash graphs exist for all segments you want to show.</li>
          <li>Segment mapping points to real Flash graph IDs.</li>
          <li>Questions exist + have weights.</li>
          <li>
            AI/Race forecasts (if used) are stored with month keys like{" "}
            <Text code>2026-01</Text>.
          </li>
        </ul>
      </Paragraph>
    </Card>
  );
}
