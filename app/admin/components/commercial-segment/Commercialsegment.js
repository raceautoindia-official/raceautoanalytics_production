"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Commercialsegment() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState("");

  // Pivot function to convert category-based to month-based
  const pivotData = (categoryData) => {
    if (!categoryData.length) return [];

    const months = Object.keys(categoryData[0]).filter((k) => k !== "category");

    const result = months.map((month) => {
      const record = { month };

      categoryData.forEach(({ category, ...rest }) => {
        let key = category;
        if (key === "two_wheeler") key = "2-wheeler";
        else if (key === "three_wheeler") key = "3-wheeler";
        record[key] = rest[month] || null;
      });

      return record;
    });

    return result;
  };

  const parseExcel = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      setData(json);
    };
    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    parseExcel(file);
  };

  const uploadData = async () => {
    if (!data.length) {
      toast.error("Please upload a file first.");
      return;
    }

    const pivotedData = pivotData(data);

    try {
      const response = await axios.post("/api/commercial-segment", { data: pivotedData });
      toast.success(response.data.message || "Data uploaded successfully!");
    } catch (err) {
      const backendMessage = err.response?.data?.message || "Upload failed.";
      toast.error(backendMessage, { autoClose: false });
    }
  };

  const renderTable = (data) => (
    <>
      <h4 style={{ marginTop: "30px" }}>Preview</h4>
      <div style={{ overflowX: "auto", marginTop: "10px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              {Object.keys(data[0]).map((key) => (
                <th
                  key={key}
                  style={{
                    padding: "10px",
                    border: "1px solid #ccc",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                  }}
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {Object.keys(data[0]).map((key) => (
                  <td
                    key={key}
                    style={{
                      padding: "8px",
                      border: "1px solid #eee",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Commercial Segment Upload</h2>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        {fileName && <p style={{ marginTop: "10px", fontStyle: "italic" }}>Loaded: {fileName}</p>}
        {data.length > 0 && renderTable(data)}
        <button
          onClick={uploadData}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default Commercialsegment;
