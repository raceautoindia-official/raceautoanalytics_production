// lib/flashReportCountry.ts

export type FlashReportContext = {
  mainRoot: any | null;
  flashReports: any | null;

  /**
   * Root node under which segment nodes live.
   * - India (default): flash-reports
   * - Other countries: flash-reports -> countries -> <country>
   */
  dataRoot: any | null;

  /**
   * Stream prefix IDs to reach dataRoot.
   * - India: [mainRoot.id, flashReports.id]
   * - Other: [mainRoot.id, flashReports.id, countries.id, country.id]
   */
  streamPrefix: Array<number | string> | null;

  /** normalized country key used for matching */
  countryKey: string;
};

function norm(s: any) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, "");
}

export function normalizeCountryKey(raw?: string | null) {
  const k = norm(raw);
  if (!k || k === "india" || k === "in") return "india";
  return k;
}

/**
 * Expected hierarchy:
 * main root -> flash-reports -> (india segments...)
 * main root -> flash-reports -> countries -> <country> -> (segments...)
 */
export function resolveFlashReportContext(
  hierarchyData: any[],
  rawCountry?: string | null,
): FlashReportContext {
  const countryKey = normalizeCountryKey(rawCountry);

const mainRoot = hierarchyData.find(
  (n: any) =>
    (norm(n?.name) === "mainroot") &&
    (n.parent_id == null || n.parent_id === 0)
);

const flashReports = hierarchyData.find(
  (n: any) =>
    (norm(n?.name) === "flashreports") &&
    (mainRoot ? String(n.parent_id) === String(mainRoot.id) : true)
);

  // India/default → keep current behavior
  if (!mainRoot || !flashReports || countryKey === "india") {
    return {
      mainRoot: mainRoot ?? null,
      flashReports: flashReports ?? null,
      dataRoot: flashReports ?? null,
      streamPrefix: mainRoot && flashReports ? [mainRoot.id, flashReports.id] : null,
      countryKey,
    };
  }

  const countriesNode = hierarchyData.find(
    (n: any) => n.parent_id === flashReports.id && norm(n?.name) === "countries",
  );

  const countryNode = countriesNode
    ? hierarchyData.find(
        (n: any) =>
          n.parent_id === countriesNode.id && norm(n?.name) === countryKey,
      )
    : null;

  if (!countriesNode || !countryNode) {
    return {
      mainRoot,
      flashReports,
      dataRoot: null,
      streamPrefix: null,
      countryKey,
    };
  }

  return {
    mainRoot,
    flashReports,
    dataRoot: countryNode,
    streamPrefix: [mainRoot.id, flashReports.id, countriesNode.id, countryNode.id],
    countryKey,
  };
}