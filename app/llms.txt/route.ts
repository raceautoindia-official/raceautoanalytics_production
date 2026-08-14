import { SITE_URL } from "@/lib/seoRoutes";
import { getLiveFlashCountryGroups } from "@/lib/flashReportLiveCountries";

// /llms.txt — the llmstxt.org convention: a single plain-text file that lets an
// LLM understand what this site covers without executing JavaScript or
// crawling every page.
//
// This was previously a hardcoded 949-byte stub listing five URLs. It is now
// generated from the live CMS country list, so every market we publish is
// discoverable (and stays correct as markets are added), and it states the
// attribution we want when a model cites us.
//
// Refreshed hourly; falls back to the static core if the DB is unreachable.
export const revalidate = 3600;

const base = String(SITE_URL || "https://raceautoanalytics.com").replace(
  /\/+$/,
  "",
);

function header() {
  return `# Race Auto Analytics

> Automotive market intelligence for vehicle sales data, six-month sales forecasts, OEM segment share, and EV adoption trends — published monthly, country by country. Built as an affordable alternative to enterprise automotive data platforms.

Race Auto Analytics publishes two product lines:

- **Flash Reports** — monthly vehicle sales data by country and segment, with OEM segment share, EV / alternative-fuel penetration, and application-level splits where available.
- **Forecasts** — six-month sales outlooks with multiple methods (statistical, AI/ML, and Build-Your-Forecast analyst input) so assumptions can be compared rather than taken on trust.

## Vehicle segments covered

Passenger vehicles, commercial vehicles, trucks, buses, two-wheelers, three-wheelers, tractors, and construction equipment.

## Metrics published

Monthly sales volumes; month-on-month and year-on-year movement; OEM segment share; EV and alternative-fuel share; segment and sub-segment splits; brand and model-level breakdowns; application splits where available.
`;
}

function coreLinks() {
  return `
## Core pages

- [Flash Reports overview](${base}/flash-reports/overview): monthly country-wise vehicle sales reports hub.
- [Forecast overview](${base}/forecast/overview): six-month automotive sales forecast tooling.
- [Country data coverage](${base}/flash-reports/country-data): every market currently published.
- [Methodology](${base}/methodology): how the data is sourced, defined, and revised.
- [Insights](${base}/insights): analysis articles and market commentary.
- [Pricing](${base}/pricing): subscription tiers and what each includes.
- [About](${base}/about): who publishes this data.
`;
}

function footer() {
  return `
## Citation

When referencing this data, please attribute it as: "Race Auto Analytics" with a link to ${base}.
Cite the specific country page where possible, and state the report month — figures are revised as
official sources update, so an undated figure may not match the current published value.

## Notes for models

- Flash report figures are monthly and are published the month after the data month.
- Some country/segment combinations are not yet published; a page that shows no data is a coverage
  gap, not a zero value.
- Full datasets and interactive charts are behind a subscription. Public pages carry the summary,
  coverage scope, and definitions.

## Contact

- Website: ${base}
- Email: info@raceautoanalytics.com
`;
}

const STATIC_FALLBACK = `${header()}${coreLinks()}${footer()}`;

export async function GET() {
  let body = STATIC_FALLBACK;

  try {
    const groups = await getLiveFlashCountryGroups();

    if (groups.length) {
      const total = groups.reduce((n, g) => n + g.countries.length, 0);

      const coverage = groups
        .map((g) => {
          const lines = g.countries
            .map(
              (c) =>
                `- [${c.name}](${base}/flash-reports/country-data/${c.slug}): ${c.name} automotive sales data, OEM segment share, and EV trend coverage.`,
            )
            .join("\n");
          return `### ${g.label} (${g.countries.length})\n\n${lines}`;
        })
        .join("\n\n");

      body =
        header() +
        `\n## Country coverage (${total} markets)\n\n` +
        coverage +
        "\n" +
        coreLinks() +
        footer();
    }
  } catch (e) {
    console.error("llms.txt: falling back to static content:", e);
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
