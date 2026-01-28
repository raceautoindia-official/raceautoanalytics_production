import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawSegmentName = searchParams.get("segmentName") || "";
    const rawSelectedMonth = searchParams.get("selectedMonth") || "";
    const rawSegmentType = searchParams.get("segmentType") || "";

    const segmentName = rawSegmentName.toLowerCase().trim();
    const monthParam = rawSelectedMonth.toLowerCase().trim();
    const segmentType = rawSegmentType.toLowerCase().trim();

    console.log("[fetchMarketData] params:", {
      segmentName,
      monthParam,
      segmentType,
    });

    const token = "your-very-strong-random-string-here";

    const [hierarchyRes, volumeRes] = await Promise.all([
      fetch("https://raceautoanalytics.com/api/contentHierarchy", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }),
      fetch("https://raceautoanalytics.com/api/volumeData", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }),
    ]);

    const hierarchyData = await hierarchyRes.json();
    const volumeData = await volumeRes.json();

    const buildPath = (id: number | string) => {
      const path: Array<number | string> = [];
      let current = hierarchyData.find((n: any) => n.id === id);
      while (current) {
        path.unshift(current.id);
        current = hierarchyData.find((n: any) => n.id === current.parent_id);
      }
      return path.join(",");
    };

    const normalize = (s: string) =>
      (s || "").toLowerCase().replace(/[\s\-]+/g, "");

    // 🔹 1) Find segment node (overall / PV / CV / etc.)
    const segmentNode = hierarchyData.find((n: any) => {
      const nameNorm = normalize(n.name || "");
      const targetNorm = normalize(rawSegmentName);

      // special handling for "overall" so it can match
      // "Overall Automotive Industry", "Overall Industry", etc.
      if (targetNorm === "overall") {
        return (
          nameNorm.includes("overall") ||
          nameNorm.includes("totalindustry") ||
          nameNorm.includes("allsegments")
        );
      }

      return nameNorm === targetNorm;
    });

    if (!segmentNode) {
      console.warn("[fetchMarketData] No segmentNode for", rawSegmentName);
      // no hard error; just "no data"
      return NextResponse.json([], { status: 200 });
    }

    // 🔹 2) Find the "market share" node under that segment
    const marketShareNode = hierarchyData.find(
      (n: any) =>
        n.parent_id === segmentNode.id &&
        normalize(n.name || "").includes(
          segmentType ? normalize(segmentType) : "marketshare"
        )
    );

    if (!marketShareNode) {
      console.warn("[fetchMarketData] No marketShareNode for", {
        segmentName: rawSegmentName,
        segmentType: rawSegmentType,
      });
      return NextResponse.json([], { status: 200 });
    }

    const monthsList = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ] as const;

    const now = new Date();
    const nowMonthIndex = now.getMonth(); // 0..11
    const nowYear = now.getFullYear();

    let monthIndex: number;

    // 1) Decide monthIndex
    if (monthParam) {
      monthIndex = monthsList.indexOf(monthParam as any);
      if (monthIndex === -1) {
        console.warn("[fetchMarketData] Invalid monthParam:", monthParam);
        return NextResponse.json([], { status: 200 });
      }
    } else {
      // default to previous month
      monthIndex = (nowMonthIndex + 11) % 12; // safe previous month
    }

    // 2) Decide year that corresponds to that month
    let baseYear = nowYear;

    if (!monthParam) {
      // previous month default: if current month is Jan, previous month is Dec of last year
      if (nowMonthIndex === 0) baseYear = nowYear - 1;
    } else {
      // month explicitly provided: assume user means the most recent occurrence of that month
      // Example: now = Jan 2026 (0), selectedMonth=dec (11) => 11 > 0 => Dec 2025
      if (monthIndex > nowMonthIndex) baseYear = nowYear - 1;
    }

    const month = monthsList[monthIndex];

    const currentYear = baseYear;
    const lastYear = currentYear - 1;
    console.log("currentyear:",currentYear,"last year :",lastYear,"month: " , month)

    const currentYearNode = hierarchyData.find(
      (n: any) =>
        (n.name || "").trim() === String(currentYear) &&
        n.parent_id === marketShareNode.id
    );
    const previousYearNode = hierarchyData.find(
      (n: any) =>
        (n.name || "").trim() === String(lastYear) &&
        n.parent_id === marketShareNode.id
    );

    if (!currentYearNode || !previousYearNode) {
      console.warn("[fetchMarketData] Missing year nodes", {
        currentYear,
        lastYear,
      });
      return NextResponse.json([], { status: 200 });
    }

    const currentYearMonths = hierarchyData.filter(
      (n: any) => n.parent_id === currentYearNode.id
    );
    const previousYearMonths = hierarchyData.filter(
      (n: any) => n.parent_id === previousYearNode.id
    );

    const currentMonthNode = currentYearMonths.find(
      (n: any) => (n.name || "").toLowerCase().trim() === month
    );

    const prevMonthIndex = monthsList.indexOf(month) - 1;
    const previousMonthName =
      prevMonthIndex >= 0 ? monthsList[prevMonthIndex] : null;

    const previousMonthNode = previousMonthName
      ? currentYearMonths.find(
          (n: any) => (n.name || "").toLowerCase().trim() === previousMonthName
        )
      : null;

    const lastYearSameMonthNode = previousYearMonths.find(
      (n: any) => (n.name || "").toLowerCase().trim() === month
    );

    const nodes = [previousMonthNode, currentMonthNode, lastYearSameMonthNode];

    const merged: Record<string, any> = {};

    for (const node of nodes) {
      if (!node) continue;
      const stream = buildPath(node.id);
      const volumeEntry = volumeData.find((v: any) => v.stream === stream);
      if (!volumeEntry) continue;

      const nodeYear = hierarchyData.find(
        (n: any) => n.id === node.parent_id
      )?.name;
      const label = `${node.name} ${nodeYear}`;

      for (const [name, value] of Object.entries(volumeEntry.data.data)) {
        if (!merged[name]) merged[name] = { name };
        merged[name][label] = value;
      }
    }

    return NextResponse.json(Object.values(merged));
  } catch (err) {
    console.error("Server API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from 'next/server';

// // ⬇️ Add this
// export const dynamic = "force-dynamic";

// export async function GET(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const segmentName = searchParams.get('segmentName');
//     const selectedMonth = searchParams.get('selectedMonth');
//     const segmentType = searchParams.get('segmentType')

//     const token = 'your-very-strong-random-string-here';

//     const [hierarchyRes, volumeRes] = await Promise.all([
//       fetch('https://raceautoanalytics.com/api/contentHierarchy', {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         cache: 'no-store',
//       }),
//       fetch('https://raceautoanalytics.com/api/volumeData', {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         cache: 'no-store',
//       }),
//     ]);

//     const hierarchyData = await hierarchyRes.json();
//     const volumeData = await volumeRes.json();

//     const buildPath = (id) => {
//       const path = [];
//       let current = hierarchyData.find((n) => n.id === id);
//       while (current) {
//         path.unshift(current.id);
//         current = hierarchyData.find((n) => n.id === current.parent_id);
//       }
//       return path.join(',');
//     };

//     const segmentNode = hierarchyData.find(
//       (n) => n.name.toLowerCase().trim() === segmentName.toLowerCase()
//     );
//     if (!segmentNode) return NextResponse.json([], { status: 404 });

//     const marketShareNode = hierarchyData.find(
//       (n) =>
//         n.name.toLowerCase().trim() === segmentType &&
//         n.parent_id === segmentNode.id
//     );
//     if (!marketShareNode) return NextResponse.json([], { status: 404 });

//     const monthsList = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
//     const month = selectedMonth || monthsList[new Date().getMonth() - 1];

//     const currentYear = new Date().getFullYear();
//     const lastYear = currentYear - 1;

//     const currentYearNode = hierarchyData.find((n) => n.name === String(currentYear) && n.parent_id === marketShareNode.id);
//     const previousYearNode = hierarchyData.find((n) => n.name === String(lastYear) && n.parent_id === marketShareNode.id);

//     if (!currentYearNode || !previousYearNode) return NextResponse.json([], { status: 404 });

//     const currentYearMonths = hierarchyData.filter((n) => n.parent_id === currentYearNode.id);
//     const previousYearMonths = hierarchyData.filter((n) => n.parent_id === previousYearNode.id);

//     const currentMonthNode = currentYearMonths.find((n) => n.name.toLowerCase().trim() === month);
//     const prevMonthIndex = monthsList.indexOf(month) - 1;
//     const previousMonthName = prevMonthIndex >= 0 ? monthsList[prevMonthIndex] : null;
//     const previousMonthNode = previousMonthName ? currentYearMonths.find((n) => n.name.toLowerCase().trim() === previousMonthName) : null;
//     const lastYearSameMonthNode = previousYearMonths.find((n) => n.name.toLowerCase().trim() === month);

//     const nodes = [previousMonthNode, currentMonthNode, lastYearSameMonthNode];

//     const merged = {};

//     for (const node of nodes) {
//       if (!node) continue;
//       const stream = buildPath(node.id);
//       const volumeEntry = volumeData.find((v) => v.stream === stream);
//       if (!volumeEntry) continue;

//       const nodeYear = hierarchyData.find((n) => n.id === node.parent_id)?.name;
//       const label = `${node.name} ${nodeYear}`;

//       for (const [name, value] of Object.entries(volumeEntry.data.data)) {
//         if (!merged[name]) merged[name] = { name };
//         merged[name][label] = value;
//       }
//     }

//     return NextResponse.json(Object.values(merged));
//   } catch (err) {
//     console.error('Server API error:', err);
//     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
//   }
// }
