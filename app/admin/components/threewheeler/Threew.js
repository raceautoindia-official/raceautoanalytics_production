"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";

function ThreeWheelerChartUpload() {
  const [oemData, setOemData] = useState([]);
  const [oemFileName, setOemFileName] = useState("");
  const [evData, setEvData] = useState([]);
  const [evFileName, setEvFileName] = useState("");
  const [appData, setAppData] = useState([]);
  const [appFileName, setAppFileName] = useState("");

  const [toast, setToast] = useState({ message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  const parseExcel = (file, setData, setFileName) => {
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

  const handleFileUpload = (e) =>
    parseExcel(e.target.files[0], setOemData, setOemFileName);
  const evHandleFileUpload = (e) =>
    parseExcel(e.target.files[0], setEvData, setEvFileName);
  const appHandleFileUpload = (e) =>
    parseExcel(e.target.files[0], setAppData, setAppFileName);

  const uploadData = async (data, url) => {
    if (!data || data.length === 0) {
      showToast("Please upload a file first.", "error");
      return;
    }

    try {
      const response = await axios.post(url, { data });
      showToast(response.data.message || "Data uploaded successfully!");
    } catch (err) {
      const backendMessage = err.response?.data?.message || "Upload failed.";
      showToast(backendMessage, "error");
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

  const Section = ({ title, fileName, data, onUpload, onSubmit }) => (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>{title}</h2>
        <input type="file" accept=".xlsx, .xls" onChange={onUpload} />
        {fileName && (
          <p style={{ marginTop: "10px", fontStyle: "italic" }}>
            Loaded: {fileName}
          </p>
        )}
        {data.length > 0 && renderTable(data)}
        <button
          onClick={onSubmit}
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
    </div>
  );

  return (
    <>
      {toast.message && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            backgroundColor: toast.type === "error" ? "#dc3545" : "#28a745",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            zIndex: 1000,
          }}
        >
          {toast.message}
        </div>
      )}

      <Section
        title="3-Wheeler OverAll OEM Market Share Chart"
        fileName={oemFileName}
        data={oemData}
        onUpload={handleFileUpload}
        onSubmit={() => uploadData(oemData, "/api/3w-overall")}
      />
      <Section
        title="3-Wheeler EV Electric Share Chart"
        fileName={evFileName}
        data={evData}
        onUpload={evHandleFileUpload}
        onSubmit={() => uploadData(evData, "/api/3w-ev")}
      />
      <Section
        title="Application Segment Chart"
        fileName={appFileName}
        data={appData}
        onUpload={appHandleFileUpload}
        onSubmit={() => uploadData(appData, "/api/3w-app")}
      />
    </>
  );
}

export default ThreeWheelerChartUpload;
