// File: app/admin/cms/page.js
"use client";

import { Tabs } from "antd";
import ContentHierarchyFlow from "./ContentHierarchyFlow";
import FormatHierarchyFlow from "./FormatHierarchyFlow";
import FilterData from "./FilterData";
import UploadVolumeData from "./UploadVolumeData";
import ManageQuestions from "./ManageQuestions";
// import VehicleSalesScoreApp from './VehicleSalesScoreApp';
import YearDropdownSettings from "./YearDropdownSettings";
import CreateGraph from "./CreateGraph";
import GraphList from "./GraphList";
import SubmittedScores from "./SubmittedScores";
import PreviewPage from "./PreviewPage";
import UserOverallScores from "./UserOverallScores";
import UserAuthorization from "./UserAuthorization";
import AIForecast from "./AIForecast";
import MLScoreRange from "./MLScoreRange";
import FlashReportsTab from "./FlashReportsTab";
import HomePageContentManager from "./HomePageContentManager";

export default function Home() {
  const historicalItems = [
    {
      key: "1",
      label: "Content Hierarchy",
      children: <ContentHierarchyFlow />,
    },
    { key: "2", label: "Format Hierarchy", children: <FormatHierarchyFlow /> },
    { key: "3", label: "Filter Data", children: <FilterData /> },
    { key: "4", label: "Upload Volume Data", children: <UploadVolumeData /> },
  ];

  const scoreSubtabs = [
    { key: "manage", label: "Manage Questions", children: <ManageQuestions /> },
    {
      key: "settings",
      label: "Year & Dropdown Settings",
      children: <YearDropdownSettings />,
    },
    // { key: 'calculator', label: 'Score Calculator', children: <VehicleSalesScoreApp /> },
    { key: "view", label: "Submitted Scores", children: <SubmittedScores /> },
    {
      key: "userScores",
      label: "User & Overall Scores",
      children: <UserOverallScores />,
    },
    {
      key: "mlScoreRange",
      label: "ML — Score Range",
      children: <MLScoreRange />,
    },
  ];

  const forecastSubtabs = [
    // Forecast CMS should only show Forecast graphs (not Flash graphs)
    {
      key: "create",
      label: "Create Graph",
      children: <CreateGraph context="forecast" />,
    },
    {
      key: "list",
      label: "All Graphs",
      children: <GraphList context="forecast" />,
    },
    { key: "preview", label: "Preview Page", children: <PreviewPage /> },
    {
      key: "user",
      label: "User Authorization",
      children: <UserAuthorization />,
    },
    { key: "ai", label: "AI Forecast", children: <AIForecast /> },
  ];

  const tabItems = [
    {
      key: "historical",
      label: "Historical Data",
      children: <Tabs defaultActiveKey="1" items={historicalItems} />,
    },
    {
      key: "score",
      label: "Score Analysis",
      children: <Tabs defaultActiveKey="manage" items={scoreSubtabs} />,
    },
    {
      key: "forecast",
      label: "Forecast",
      children: <Tabs defaultActiveKey="create" items={forecastSubtabs} />,
    },
    {
      key: "flashReports",
      label: "Flash Reports",
      children: <FlashReportsTab />,
    },
    {
      key: "home",
      label: "Home Page",
      children: <HomePageContentManager />,
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ padding: "2rem", backgroundColor: "white" }}
    >
      <h1 className="text-2xl font-bold text-black ">
        Raceautoanalytics Application CMS
      </h1>
      <Tabs defaultActiveKey="historical" items={tabItems} />
    </div>
  );
}
