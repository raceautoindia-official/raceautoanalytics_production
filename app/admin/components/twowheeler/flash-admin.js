"use client";

import { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from "react-toastify";

import OverallPie from "./Overallpie";
import ThreeWheeler from "../threewheeler/Threew";
import Tractoroverall from "../tractoroverall/Tractor-overall";
import Passenger from "../passenger/Passenger";
import Commercialoverall from "../commercial-overall/Commercialoverall";
import Truckoverall from "../truck-overall/Truckoverall";
import Bus from "../bus/Bus";
import Overall from "../overallchart-1/Overall";
import Overallbar from "../overallchart-2/Overallbar";
const FlashReportsCharts = () => {
  const [activeTab, setActiveTab] = useState("twowheeler");

  const renderTabContent = () => {
    switch (activeTab) {
      case "twowheeler": return <OverallPie />;
      case "threewheeler": return <ThreeWheeler />;
      case "tractor": return <Tractoroverall />;
      case "passenger": return <Passenger />;
      case "commercial": return <Commercialoverall />;
      case "truck": return <Truckoverall />;
      case "bus": return <Bus />;
       case "line": return <Overall />;
         case "bar": return <Overallbar />;
      default: return null;
    }
  };

  return (
    <div className="container mt-5">
      <ToastContainer position="top-right" autoClose={3000} />

      <ul className="nav nav-tabs mb-3" role="tablist">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "twowheeler" ? "active" : ""}`} onClick={() => setActiveTab("twowheeler")}>
            Two Wheeler
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "threewheeler" ? "active" : ""}`} onClick={() => setActiveTab("threewheeler")}>
            Three Wheeler
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "tractor" ? "active" : ""}`} onClick={() => setActiveTab("tractor")}>
            Tractor
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "passenger" ? "active" : ""}`} onClick={() => setActiveTab("passenger")}>
            Passenger
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "commercial" ? "active" : ""}`} onClick={() => setActiveTab("commercial")}>
            Commercial
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "truck" ? "active" : ""}`} onClick={() => setActiveTab("truck")}>
            Truck
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "bus" ? "active" : ""}`} onClick={() => setActiveTab("bus")}>
            Bus
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "bus" ? "active" : ""}`} onClick={() => setActiveTab("line")}>
            OverAll
          </button>
        </li>
         <li className="nav-item">
          <button className={`nav-link ${activeTab === "bar" ? "active" : ""}`} onClick={() => setActiveTab("bar")}>
            Bar
          </button>
        </li>
      </ul>

      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default FlashReportsCharts;
