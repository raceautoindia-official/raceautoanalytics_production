"use client";
import "./home.css";
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  AreaChart,
  ReferenceLine,
  Legend,
  Line,
  Area,
} from "recharts";

const data = [
  { name: "ASEAN", value: 40000000000 },
  { name: "AUSTRALIA", value: 20000000000 },
  { name: "CHINA", value: 248000000000 },
  { name: "INDIA", value: 48000000000 },
  { name: "INDONESIA", value: 12000000000 },
];

const pieData = [
  { name: "Europe", value: 15, color: "#001F6E" },
  { name: "Asia/Oceania/Middle East", value: 45, color: "#E27312" },
  { name: "America", value: 35, color: "#2EA39A" },
  { name: "Africa", value: 5, color: "#EEEB28" },
];

const chartData = [
  { year: "FY 2019", volume: 20000, low: null, medium: null, high: null },

  { year: "FY 2020", volume: 80000, low: null, medium: null, high: null },

  { year: "FY 2021", volume: 30000, low: null, medium: null, high: null },

  { year: "FY 2022", volume: 60000, low: null, medium: null, high: null },

  { year: "FY 2023", volume: 40000, low: null, medium: null, high: null },

  { year: "FY 2024", volume: 30000, low: null, medium: null, high: null },

  { year: "FY 2025", volume: null, low: 30000, medium: 50000, high: 70000 },

  { year: "FY 2026", volume: null, low: 35000, medium: 60000, high: 85000 },

  { year: "FY 2027", volume: null, low: 40000, medium: 70000, high: 100000 },

  { year: "FY 2028", volume: null, low: 45000, medium: 80000, high: 120000 },

  { year: "FY 2029", volume: null, low: 50000, medium: 90000, high: 140000 },
];

function Chart() {
  return (
    <>
      <div className="container-fluid desktop">
        <div className="row d-flex align-items-center">
          <div className="col-12 col-md-6">
            <div className="p-3 bg-white rounded">
              <h4 className="text-center font-weight-bold mb-3">
                Commercial Vehicles - 2024
              </h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  layout="vertical"
                  data={data}
                  margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={120}
                    interval={0}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fontSize="16"
                          textAnchor="end"
                          fill="#333"
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />

                  <Tooltip />
                  <Bar dataKey="value" fill="#001F6E" radius={[0, 20, 20, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#001F6E" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart Section */}
          <div className="col-12 col-md-6 mt-5">
            <div className="p-4 bg-white rounded ">
              <h4 className="text-center font-weight-bold">REGION</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="d-flex flex-wrap justify-content-center mt-3">
                {pieData.map((item, index) => (
                  <div key={index} className="d-flex align-items-center mx-2">
                    <span
                      className="d-inline-block rounded-circle me-2"
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: item.color,
                      }}
                    ></span>
                    <span style={{ fontSize: "14px" }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* <div className="row">
          <div className="col-12">
            <div className="ms-5 mb-3">
              <h2 className="fw-bold">COMMERCIAL VEHICLES</h2>
            </div>
            <div className="bg-white rounded p-3 w-100">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 80, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="green" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="green" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorMedium"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="red" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="red" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => value.toLocaleString()} />
                  <Tooltip formatter={() => "Subscribe to view"} />

                  <Legend />
                  <ReferenceLine
                    x="FY 2024"
                    stroke="blue"
                    label={{
                      position: "top",
                      value: "Forecast",
                      fill: "black",
                    }}
                  />
                  
                  <Area
                    type="monotone"
                    dataKey="low"
                    stroke="none"
                    fill="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    stroke="none"
                    fill="url(#colorMedium)"
                    stackId="1"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    stroke="none"
                    fill="url(#colorHigh)"
                    stackId="1"
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="blue"
                    dot={false}
                    connectNulls={true}
                  />
                  <text
                    x="95%"
                    y="16%"
                    fill="black"
                    fontSize="14px"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    High
                  </text>
                  <text
                    x="95%"
                    y="50%"
                    fill="black"
                    fontSize="14px"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    Medium
                  </text>
                  <text
                    x="95%"
                    y="80%"
                    fill="black"
                    fontSize="14px"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    Low
                  </text>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div> */}
      </div>

      {/* mobile */}
      <div className="container-fluid mobile">
        <div className="row d-flex align-items-center">
          {/* Pie Chart Section */}
          <div className="col-12 col-md-6 mt-5">
            <div className="p-4 bg-white rounded ">
              <h4 className="text-center font-weight-bold">REGION</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="d-flex flex-wrap justify-content-center mt-3">
                {pieData.map((item, index) => (
                  <div key={index} className="d-flex align-items-center mx-2">
                    <span
                      className="d-inline-block rounded-circle me-2"
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: item.color,
                      }}
                    ></span>
                    <span style={{ fontSize: "14px" }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="p-3 bg-white rounded">
              <h4 className="text-center font-weight-bold mb-3">
                Commercial Vehicles
              </h4>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart
                  layout="vertical"
                  data={data}
                  margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={120}
                    interval={0} // Ensures all country names are displayed
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fontSize="12"
                          textAnchor="end"
                          fill="#333"
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />

                  <Tooltip />
                  <Bar dataKey="value" fill="#001F6E" radius={[0, 20, 20, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#001F6E" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {/* <div className="chart-container">
          <h2 className="chart-title">COMMERCIAL VEHICLES</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" aspect={1.5}>
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 5, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="green" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="green" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="red" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="red" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={(value) => value.toLocaleString()}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={() => "Subscribe to view"} />
                <ReferenceLine
                  x="FY 2024"
                  stroke="black"
                  label={{
                    position: "top",
                    value: "Forecast",
                    fill: "black",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="blue"
                  dot={false}
                  connectNulls={true}
                />
                <Area type="monotone" dataKey="low" stroke="none" fill="none" />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stroke="none"
                  fill="url(#colorMedium)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="none"
                  fill="url(#colorHigh)"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div> */}
      </div>
      {/* tab */}
      <div className="container-fluid tab">
        <div className="row d-flex align-items-center">
          {/* Pie Chart Section */}
          <div className="col-12 col-md-6 mt-5">
            <div className="p-4 bg-white rounded ">
              <h4 className="text-center font-weight-bold">REGION</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="d-flex flex-wrap justify-content-center mt-3">
                {pieData.map((item, index) => (
                  <div key={index} className="d-flex align-items-center mx-2">
                    <span
                      className="d-inline-block rounded-circle me-2"
                      style={{
                        width: "12px",
                        height: "12px",
                        backgroundColor: item.color,
                      }}
                    ></span>
                    <span style={{ fontSize: "14px" }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="p-3 bg-white rounded">
              <h4 className="text-center font-weight-bold mb-3">
                Commercial Vehicles
              </h4>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  layout="vertical"
                  data={data}
                  margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={120}
                    interval={0} // Ensures all country names are displayed
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fontSize="12"
                          textAnchor="end"
                          fill="#333"
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />

                  <Tooltip />
                  <Bar dataKey="value" fill="#001F6E" radius={[0, 20, 20, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#001F6E" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        {/* <div className="chart-container">
          <h2 className="chart-title">COMMERCIAL VEHICLES</h2>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" aspect={1.5}>
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 5, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="green" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="green" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="red" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="red" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={(value) => value.toLocaleString()}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip formatter={() => "Subscribe to view"} />
                <ReferenceLine
                  x="FY 2024"
                  stroke="black"
                  label={{
                    position: "top",
                    value: "Forecast",
                    fill: "black",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke="blue"
                  dot={false}
                  connectNulls={true}
                />
                <Area type="monotone" dataKey="low" stroke="none" fill="none" />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stroke="none"
                  fill="url(#colorMedium)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="none"
                  fill="url(#colorHigh)"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div> */}
      </div>
    </>
  );
}

export default Chart;
