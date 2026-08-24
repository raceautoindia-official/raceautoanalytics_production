export type FaqLink = {
  /** Exact phrase inside `a` to turn into a link (first match only). */
  match: string;
  href: string;
};

export type FaqItem = {
  q: string;
  a: string;
  /**
   * Internal links rendered inside the answer. `a` itself stays plain text so
   * the FAQPage schema never contains markup — the linking happens only in the
   * visible render.
   */
  links?: FaqLink[];
};

/**
 * FAQ for /automotive-market-intelligence.
 *
 * Every answer is grounded in behaviour verified against production — coverage
 * counts, publication lag, forecast methods, plan limits, GST treatment. It
 * deliberately does NOT restate anything still marked [CONFIRM] on the
 * methodology page (per-country sources, wholesale vs retail, release day,
 * forecast anchoring, revision policy); those link out instead of being
 * asserted here.
 *
 * Prices are described structurally rather than quoted, because plan pricing is
 * CMS-driven and hardcoded figures would drift out of date.
 *
 * Questions are unique to this page. The homepage, pricing, flash-report and
 * forecast overviews each carry their own smaller FAQ; repeating those here
 * would compete for the same query instead of widening coverage.
 */
export function getAutomotiveFaqs(countryCount: number): FaqItem[] {
  const markets =
    countryCount > 0 ? `${countryCount} markets` : "global markets";

  return [
    {
      q: "What is automotive market intelligence?",
      a: "Automotive market intelligence is the structured view of how a vehicle market is actually performing: how many units sold, which manufacturers gained or lost share, how segments shifted, and where demand is heading. Race Auto Analytics delivers it as monthly flash reports plus six-month sales forecasts, so planning rests on measured movement rather than anecdote.",
    },
    {
      q: "What data does Race Auto Analytics provide?",
      a: `Two connected product lines. Flash reports give monthly vehicle sales volumes by country and segment, with OEM segment share, EV and alternative-fuel penetration, month-on-month and year-on-year movement, and brand or model breakdowns where published. Forecasts project the next six months using several methods you can compare side by side. Coverage currently spans ${markets}.`,
    },
    {
      q: "Which countries does Race Auto Analytics cover?",
      a: `Coverage currently spans ${markets} across Asia-Pacific, Europe, Latin America, and the Middle East & Africa, and grows as new markets are published. Depth varies by market — not every segment is available everywhere. The country data coverage page lists every market currently live and the segments each one carries.`,
      links: [
        { match: "country data coverage page", href: "/flash-reports/country-data" },
      ],
    },
    {
      q: "Which vehicle segments are covered?",
      a: "Passenger vehicles, commercial vehicles, trucks, buses, two-wheelers, three-wheelers, tractors, and construction equipment. Two- and three-wheelers matter because they are the highest-volume segments in many of the markets covered, and they often signal a demand shift before larger vehicle classes do.",
    },
    {
      q: "How often is the automotive sales data updated?",
      a: "Flash reports are monthly. Each report covers one data month and is published the following month, once that month's figures are available and normalised. Forecasts refresh alongside the underlying data, so the six-month outlook always runs from the latest published month.",
      links: [
        { match: "Flash reports", href: "/flash-reports/overview" },
      ],
    },
    {
      q: "Why does the latest report show the previous month?",
      a: "Because a month cannot be reported until it has finished and its figures have been collected and checked. A June report is published in July. This is a publication lag, not missing data — it is normal for official vehicle sales and registration reporting in every market.",
    },
    {
      q: "What is OEM segment share?",
      a: "OEM segment share is a manufacturer's share of sales within one segment, for one country and one month, expressed as a percentage of that segment's total. It shows competitive position directly — who leads, who is gaining, and who is losing ground — which absolute volumes alone will not tell you.",
    },
    {
      q: "How is EV and alternative-fuel adoption tracked?",
      a: "Where a market reports it, electric and alternative-fuel share is shown alongside the overall segment for the same month, so EV penetration can be read against total volume rather than in isolation. Alternative fuel covers petrol, diesel, CNG, electric and other fuel types, depending on what each market publishes.",
    },
    {
      q: "Can I compare month-on-month and year-on-year vehicle sales?",
      a: "Yes, both are shown for the selected month. Month-on-month compares against the previous month and captures short-term movement; year-on-year compares against the same month a year earlier and strips out seasonality. Reading them together is what separates a genuine trend from a seasonal swing.",
    },
    {
      q: "What is a six-month vehicle sales forecast?",
      a: "A projection of sales volumes for the six months following the latest published data month, anchored to that month's actuals. It is built for planning cycles — production, inventory, procurement and budgeting — where the useful horizon is the next two quarters rather than several years out.",
      links: [
        { match: "six months", href: "/forecast/overview" },
      ],
    },
    {
      q: "Which forecast methods can I compare?",
      a: "Several run in parallel on the same chart rather than a single black-box number: an AI/ML projection, a Race analyst forecast, a survey-based ML average, and your own Build Your Forecast input. Seeing them together shows where the methods agree, and where they diverge — usually the more informative signal.",
    },
    {
      q: "What is Build Your Forecast (BYF)?",
      a: "Build Your Forecast lets you supply your own assumptions through a scoring input and see the resulting projection plotted against the AI, analyst and survey forecasts. It makes the platform somewhere to test a view rather than only consume one, which matters when your own market knowledge differs from the model.",
    },
    {
      q: "How reliable are the sales forecasts?",
      a: "No forecast is certain, which is precisely why several methods are shown side by side instead of one headline figure. Historical actuals are always plotted alongside the projections, so a forecast can be judged against the trend it came from. The full modelling approach and assumptions are set out on the methodology page.",
      links: [
        { match: "methodology page", href: "/methodology" },
      ],
    },
    {
      q: "What does it mean when a country or month shows no data?",
      a: "It means that market or month has not been published yet — a coverage gap, not a reading of zero sales. Where a chart has no data for the month selected, that section is hidden rather than showing an older month's figures under the current label.",
    },
    {
      q: "Are LCV, MCV and HCV defined the same way in every country?",
      a: "No. Light, medium and heavy commercial vehicle classes follow each market's own gross vehicle weight rules, so the thresholds differ between countries. Figures are normalised into consistent OEM and segment definitions for comparison, but class boundaries remain those of the local market — worth remembering when reading across borders.",
    },
    {
      q: "Who uses automotive market intelligence?",
      a: "OEMs and their suppliers tracking competitive position, dealers and distributors planning inventory, consultants and analysts building market views, investors assessing sector momentum, and EV companies sizing adoption. The common need is a monthly read on a market without assembling the numbers in-house.",
    },
    {
      q: "How is this different from free national sources?",
      a: "Free national sources such as registration authorities and industry associations are authoritative for their own market, but each publishes in its own format, definitions and calendar. The value added here is normalisation — consistent OEM and segment definitions across countries and months, so markets can be compared directly instead of reconciled by hand every month.",
    },
    {
      q: "How many countries does each subscription include?",
      a: "Plans are structured around how many markets you track. The entry plan covers one country, the next covers four, and the business tiers extend to five and eleven country slots, so you pay for the markets you actually follow. Current pricing for each tier is listed on the pricing page.",
      links: [
        { match: "pricing page", href: "/pricing" },
      ],
    },
    {
      q: "How does billing work, and is GST included?",
      a: "Billing is processed in Indian Rupees, and all displayed prices are inclusive of applicable GST — no additional tax is added at checkout. Payments are handled through Razorpay. Prices shown in USD are indicative for international buyers; the charge itself is made in INR. Monthly and annual billing are both offered, with annual discounted against paying monthly.",
    },
    {
      q: "Can I see the data before subscribing?",
      a: "Yes. Public pages carry the market scope, segment coverage, definitions and summary for each country, so you can confirm the data fits before paying. Full datasets and the interactive charts are for subscribers, and you can request a sample report or speak to an analyst about a specific market or custom requirement.",
      links: [
        { match: "request a sample report", href: "/automotive-market-intelligence#sample-report-form" },
      ],
    },
  ];
}
