"use client";
import dynamic from "next/dynamic";
import { Tabs } from "antd";

// import TextEditor from "../components/TextEditor";
import FlashGraphMappingEditor from "./FlashGraphMappingEditor";
import FlashReportsHelp from "./FlashReportsHelp";

import CreateGraph from "./CreateGraph";
import GraphList from "./GraphList";
import ManageQuestions from "./ManageQuestions";
import YearDropdownSettings from "./YearDropdownSettings";
import FlashAIForecastGenerator from "./FlashAIForecastGenerator";

const TextEditor = dynamic(() => import("../components/TextEditor"), {
  ssr: false,
});

export default function FlashReportsTab() {
  const items = [
    {
      key: "help",
      label: "Instructions",
      children: <FlashReportsHelp />,
    },
    {
      key: "segment",
      label: "Flash Segment Editor",
      children: <TextEditor />,
    },
    {
      key: "mapping",
      label: "Graph → Segment Mapping",
      children: <FlashGraphMappingEditor />,
    },
    {
      key: "graphs",
      label: "Flash Graphs",
      children: (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CreateGraph context="flash" scoreSettingsKey="flashScoreSettings" />
          <GraphList context="flash" />
        </div>
      ),
    },
    {
      key: "questions",
      label: "Flash Questions",
      children: <ManageQuestions context="flash" />,
    },
    {
      key: "settings",
      label: "Flash Score Settings",
      children: (
        <YearDropdownSettings
          settingsKey="flashScoreSettings"
          title="Flash Month & Dropdown Settings"
        />
      ),
    },
    {
      key: "ai",
      label: "Flash AI Forecast Generator",
      children: <FlashAIForecastGenerator />,
    },
  ];

  return <Tabs defaultActiveKey="help" items={items} />;
}
