// File: app/components/YearDropdownSettings.js
"use client";

import { useState, useEffect } from "react";
import { Button, Input, Space, Typography, Row, Col, message } from "antd";
const { Title } = Typography;

export default function YearDropdownSettings({
  settingsKey = "scoreSettings",
  title,
} = {}) {
  const [yearNames, setYearNames] = useState([]);
  const [scoreLabels, setScoreLabels] = useState([]);

  // Fetch persisted settings (refetch if settingsKey changes)
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          `/api/scoreSettings?key=${encodeURIComponent(settingsKey)}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
            },
          }
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setYearNames(Array.isArray(data.yearNames) ? data.yearNames : []);
        setScoreLabels(Array.isArray(data.scoreLabels) ? data.scoreLabels : []);
      } catch (err) {
        message.error("Failed to load settings: " + err.message);
      }
    }
    fetchSettings();
  }, [settingsKey]);

  // Handlers for year names
  const handleYearNameChange = (index, newName) => {
    const updated = [...yearNames];
    updated[index] = newName;
    setYearNames(updated);
  };
  const addYear = () =>
    setYearNames((prev) => [...prev, `Year ${prev.length + 1}`]);
  const removeYear = (index) =>
    setYearNames((prev) => prev.filter((_, i) => i !== index));

  // Handlers for score labels
  const handleScoreLabelChange = (index, newLabel) => {
    const updated = [...scoreLabels];
    updated[index] = newLabel;
    setScoreLabels(updated);
  };
  const addLabel = () =>
    setScoreLabels((prev) => [...prev, `Label ${prev.length}`]);
  const removeLabel = (index) =>
    setScoreLabels((prev) => prev.filter((_, i) => i !== index));

  // Persist settings
  const saveSettings = async () => {
    try {
      const res = await fetch(
        `/api/scoreSettings?key=${encodeURIComponent(settingsKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
          },
          body: JSON.stringify({ key: settingsKey, yearNames, scoreLabels }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `${res.status}`);
      message.success("Settings saved");
    } catch (err) {
      message.error("Failed to save settings: " + err.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <Title level={3}>{title || "Year & Dropdown Settings"}</Title>
      <Row gutter={32}>
        <Col span={12}>
          <Title level={4}>Edit Year Names</Title>
          <Space direction="vertical" style={{ width: "100%" }}>
            {yearNames.map((name, idx) => (
              <Space key={idx} align="center">
                <Input
                  style={{ width: 200 }}
                  value={name}
                  onChange={(e) => handleYearNameChange(idx, e.target.value)}
                />
                <Button danger onClick={() => removeYear(idx)}>
                  Remove
                </Button>
              </Space>
            ))}
          </Space>
          <Button type="dashed" onClick={addYear} style={{ marginTop: "10px" }}>
            + Add Year
          </Button>
        </Col>

        <Col span={12}>
          <Title level={4}>Edit Score Dropdown Labels</Title>
          <Space direction="vertical" style={{ width: "100%" }}>
            {scoreLabels.map((label, idx) => (
              <Space key={idx} align="center">
                <Input
                  style={{ width: 200 }}
                  value={label}
                  onChange={(e) => handleScoreLabelChange(idx, e.target.value)}
                />
                <Button danger onClick={() => removeLabel(idx)}>
                  Remove
                </Button>
              </Space>
            ))}
          </Space>
          <Button
            type="dashed"
            onClick={addLabel}
            style={{ marginTop: "10px" }}
          >
            + Add Label
          </Button>
        </Col>
      </Row>

      <Button
        type="primary"
        onClick={saveSettings}
        style={{ marginTop: "20px" }}
      >
        Save Settings
      </Button>
    </div>
  );
}

// // File: app/components/YearDropdownSettings.js
// "use client";

// import { useState, useEffect } from "react";
// import { Button, Input, Space, Typography, Row, Col, message } from "antd";
// const { Title } = Typography;

// export default function YearDropdownSettings({
//   settingsKey = "scoreSettings",
//   title,
// } = {}) {
//   const [yearNames, setYearNames] = useState([]);
//   const [scoreLabels, setScoreLabels] = useState([]);

//   // Fetch persisted settings
//   useEffect(() => {
//     async function fetchSettings() {
//       try {
//         const res = await fetch(
//           `/api/scoreSettings?key=${encodeURIComponent(settingsKey)}`,
//           {
//             headers: {
//               Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
//             },
//           }
//         );
//         if (!res.ok) throw new Error(`${res.status}`);
//         const data = await res.json();
//         setYearNames(Array.isArray(data.yearNames) ? data.yearNames : []);
//         setScoreLabels(Array.isArray(data.scoreLabels) ? data.scoreLabels : []);
//       } catch (err) {
//         message.error("Failed to load settings: " + err.message);
//       }
//     }
//     fetchSettings();
//   }, []);

//   // Handlers for year names
//   const handleYearNameChange = (index, newName) => {
//     const updated = [...yearNames];
//     updated[index] = newName;
//     setYearNames(updated);
//   };
//   const addYear = () => {
//     setYearNames((prev) => [...prev, `Year ${prev.length + 1}`]);
//   };
//   const removeYear = (index) => {
//     setYearNames((prev) => prev.filter((_, i) => i !== index));
//   };

//   // Handlers for score labels
//   const handleScoreLabelChange = (index, newLabel) => {
//     const updated = [...scoreLabels];
//     updated[index] = newLabel;
//     setScoreLabels(updated);
//   };
//   const addLabel = () => {
//     setScoreLabels((prev) => [...prev, `Label ${prev.length}`]);
//   };
//   const removeLabel = (index) => {
//     setScoreLabels((prev) => prev.filter((_, i) => i !== index));
//   };

//   // Persist settings
//   const saveSettings = async () => {
//     try {
//       const res = await fetch(
//         `/api/scoreSettings?key=${encodeURIComponent(settingsKey)}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
//           },
//           body: JSON.stringify({ key: settingsKey, yearNames, scoreLabels }),
//         }
//       );
//       if (!res.ok) throw new Error(`${res.status}`);
//       message.success("Settings saved");
//     } catch (err) {
//       message.error("Failed to save settings: " + err.message);
//     }
//   };

//   return (
//     <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
//       <Title level={3}>{title || "Year & Dropdown Settings"}</Title>
//       <Row gutter={32}>
//         <Col span={12}>
//           <Title level={4}>Edit Year Names</Title>
//           <Space direction="vertical" style={{ width: "100%" }}>
//             {yearNames.map((name, idx) => (
//               <Space key={idx} align="center">
//                 <Input
//                   style={{ width: 200 }}
//                   value={name}
//                   onChange={(e) => handleYearNameChange(idx, e.target.value)}
//                 />
//                 <Button danger onClick={() => removeYear(idx)}>
//                   Remove
//                 </Button>
//               </Space>
//             ))}
//           </Space>
//           <Button type="dashed" onClick={addYear} style={{ marginTop: "10px" }}>
//             + Add Year
//           </Button>
//         </Col>
//         <Col span={12}>
//           <Title level={4}>Edit Score Dropdown Labels</Title>
//           <Space direction="vertical" style={{ width: "100%" }}>
//             {scoreLabels.map((label, idx) => (
//               <Space key={idx} align="center">
//                 <Input
//                   style={{ width: 200 }}
//                   value={label}
//                   onChange={(e) => handleScoreLabelChange(idx, e.target.value)}
//                 />
//                 <Button danger onClick={() => removeLabel(idx)}>
//                   Remove
//                 </Button>
//               </Space>
//             ))}
//           </Space>
//           <Button
//             type="dashed"
//             onClick={addLabel}
//             style={{ marginTop: "10px" }}
//           >
//             + Add Label
//           </Button>
//         </Col>
//       </Row>
//       <Button
//         type="primary"
//         onClick={saveSettings}
//         style={{ marginTop: "20px" }}
//       >
//         Save Settings
//       </Button>
//     </div>
//   );
// }
