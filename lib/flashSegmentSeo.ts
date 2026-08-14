// Per-segment copy for the server-rendered layer on the flash-report segment
// pages.
//
// Those pages are client components: on first paint they emit ~104 words, no
// <h1>, and no structured data, because everything is fetched in effects. Search
// and AI crawlers therefore saw an effectively empty page. This supplies the
// text/definitions/FAQ that render on the server, above the interactive charts.
//
// Copy rules followed here: factual, no superlatives, and no claim about
// coverage or figures that the data does not support (a segment is described by
// what it contains, never by a number that could drift).

export type SegmentSeo = {
  /** Route path under /flash-reports. */
  path: string;
  /** Page <h1> and metadata title stem. */
  name: string;
  title: string;
  description: string;
  /** Lead paragraphs rendered above the charts. */
  intro: string[];
  /** "What's in this report" bullets. */
  includes: string[];
  /** Term -> definition, rendered as a definition list. */
  definitions: [string, string][];
  faqs: { q: string; a: string }[];
};

const COMMON_INCLUDES = [
  "Monthly sales volumes for the selected country and month",
  "Month-on-month and year-on-year movement",
  "OEM segment share, including the leading manufacturer",
  "EV and alternative-fuel share where the market reports it",
  "Brand and model-level breakdown where published",
];

const COMMON_DEFINITIONS: [string, string][] = [
  [
    "Report month",
    "The month the data describes. Figures are published the following month, so a June report is released in July.",
  ],
  [
    "Segment share",
    "A manufacturer's share of sales within this segment for the selected month and country, expressed as a percentage of the segment total.",
  ],
  [
    "MoM / YoY",
    "Month-on-month compares the report month with the previous month. Year-on-year compares it with the same month in the previous year.",
  ],
  [
    "Coverage gap",
    "Where a country or month shows no data, that market has not been published yet. It does not indicate zero sales.",
  ],
];

const COMMON_FAQS = (name: string) => [
  {
    q: `Which countries are covered for ${name.toLowerCase()}?`,
    a: "Coverage differs by market and grows over time. The country selector lists every market currently published for this segment, and the country data coverage page lists all markets across segments.",
  },
  {
    q: "How current is the data?",
    a: "Reports are monthly and are published the month after the data month. Where a country's latest month is not yet published, the chart shows the most recent month available and says so.",
  },
  {
    q: "Can I see the underlying numbers?",
    a: "Public pages carry the segment scope, definitions, and summary. Full datasets and interactive charts are available to subscribers.",
  },
];

export const SEGMENT_SEO: Record<string, SegmentSeo> = {
  "two-wheeler": {
    path: "two-wheeler",
    name: "Two-Wheeler",
    title: "Two-Wheeler Sales Data by Country | OEM Share & EV Trends",
    description:
      "Monthly two-wheeler sales data by country: volumes, OEM segment share, EV adoption, and application splits. Motorcycles, scooters and mopeds.",
    intro: [
      "The two-wheeler flash report tracks monthly motorcycle, scooter and moped sales for each covered country. It is built for teams that need a fast read on volume movement and manufacturer position without assembling the numbers themselves.",
      "Two-wheelers are the highest-volume segment in most of the markets covered here, and often the first to show a demand shift, which makes month-on-month movement a useful early indicator for the wider market.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "Application split",
        "Where published, the breakdown of two-wheeler usage by application, such as commuter, sport, or delivery use.",
      ],
    ],
    faqs: [
      ...COMMON_FAQS("Two-wheelers"),
      {
        q: "Does this include electric two-wheelers?",
        a: "Yes. Where a market reports it, electric and alternative-fuel share is shown alongside the overall segment, so EV penetration can be read against total volume for the same month.",
      },
    ],
  },

  "three-wheeler": {
    path: "three-wheeler",
    name: "Three-Wheeler",
    title: "Three-Wheeler Sales Data by Country | OEM Share & EV Trends",
    description:
      "Monthly three-wheeler sales data by country: volumes, OEM segment share, EV adoption and passenger versus cargo splits.",
    intro: [
      "The three-wheeler flash report covers monthly sales of passenger and cargo three-wheelers by country, with manufacturer share and electrification trend where the market reports it.",
      "Three-wheelers sit close to last-mile mobility and small-goods transport, so the segment tends to track urban demand and local policy changes more directly than larger vehicle classes.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "Passenger vs cargo",
        "Where published, three-wheeler volumes split between passenger-carrying and goods-carrying variants.",
      ],
    ],
    faqs: COMMON_FAQS("Three-wheelers"),
  },

  "passenger-vehicles": {
    path: "passenger-vehicles",
    name: "Passenger Vehicle",
    title: "Passenger Vehicle Sales Data by Country | OEM Share & EV Trends",
    description:
      "Monthly passenger vehicle sales data by country: volumes, OEM segment share, EV adoption, and body-type splits across cars, SUVs and MPVs.",
    intro: [
      "The passenger vehicle flash report tracks monthly car, SUV and MPV sales for each covered country, alongside manufacturer share and electrification trend.",
      "Passenger vehicles carry the clearest signal on consumer demand and model mix, and the body-type split shows where volume is moving between hatchbacks, sedans and utility vehicles.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "Body type",
        "Where published, passenger vehicle volumes split by body style such as hatchback, sedan, SUV or MPV.",
      ],
    ],
    faqs: COMMON_FAQS("Passenger vehicles"),
  },

  "commercial-vehicles": {
    path: "commercial-vehicles",
    name: "Commercial Vehicle",
    title: "Commercial Vehicle Sales Data by Country | OEM Share & Segments",
    description:
      "Monthly commercial vehicle sales data by country: volumes, OEM segment share, and LCV / MCV / HCV splits across trucks and buses.",
    intro: [
      "The commercial vehicle flash report covers monthly CV sales by country, including the split across light, medium and heavy classes, with manufacturer share for each month.",
      "Commercial vehicle demand follows freight and construction activity, so this segment is commonly read as an indicator of industrial and logistics conditions rather than consumer sentiment.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "LCV / MCV / HCV",
        "Light, medium and heavy commercial vehicles. Class boundaries follow each market's own gross vehicle weight definitions, so thresholds differ between countries.",
      ],
    ],
    faqs: COMMON_FAQS("Commercial vehicles"),
  },

  "commercial-vehicles/trucks": {
    path: "commercial-vehicles/trucks",
    name: "Truck",
    title: "Truck Sales Data by Country | OEM Share & Segment Splits",
    description:
      "Monthly truck sales data by country: volumes, OEM segment share, and LCV / MCV / HCV distribution for goods-carrying vehicles.",
    intro: [
      "The truck flash report tracks monthly goods-vehicle sales by country, with the light, medium and heavy split and manufacturer share for the selected month.",
      "Truck volumes respond to freight rates, infrastructure spending and replacement cycles, and the movement between weight classes often shows a shift before total volume does.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "LCV / MCV / HCV",
        "Light, medium and heavy commercial vehicles. Class boundaries follow each market's own gross vehicle weight definitions, so thresholds differ between countries.",
      ],
    ],
    faqs: COMMON_FAQS("Trucks"),
  },

  "commercial-vehicles/buses": {
    path: "commercial-vehicles/buses",
    name: "Bus",
    title: "Bus Sales Data by Country | OEM Share & Segment Splits",
    description:
      "Monthly bus and coach sales data by country: volumes, OEM segment share, electrification trend and segment distribution.",
    intro: [
      "The bus flash report covers monthly bus and coach sales by country, with manufacturer share and, where reported, the electric share of the segment.",
      "Bus procurement is heavily influenced by public transport tenders and fleet electrification programmes, so volumes can move in steps rather than smooth trends.",
    ],
    includes: COMMON_INCLUDES,
    definitions: COMMON_DEFINITIONS,
    faqs: COMMON_FAQS("Buses"),
  },

  tractor: {
    path: "tractor",
    name: "Tractor",
    title: "Tractor Sales Data by Country | OEM Share & Segment Trends",
    description:
      "Monthly tractor sales data by country: volumes, OEM segment share and horsepower-band splits for agricultural tractors.",
    intro: [
      "The tractor flash report tracks monthly agricultural tractor sales by country, with manufacturer share and, where published, the split by horsepower band.",
      "Tractor demand is tied to farm income, monsoon and harvest conditions, and rural credit availability, so it follows an agricultural cycle rather than the wider automotive one.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "Horsepower band",
        "Where published, tractor volumes grouped by engine power range, which is the usual way this segment is compared across markets.",
      ],
    ],
    faqs: COMMON_FAQS("Tractors"),
  },

  "construction-equipment": {
    path: "construction-equipment",
    name: "Construction Equipment",
    title: "Construction Equipment Sales Data by Country | OEM Share",
    description:
      "Monthly construction equipment sales data by country: volumes, OEM segment share and equipment-category splits.",
    intro: [
      "The construction equipment flash report covers monthly sales of earthmoving and construction machinery by country, with manufacturer share for the selected month.",
      "Equipment demand tracks infrastructure and construction activity, and because purchases are project-driven the segment is typically more volatile month to month than on-road vehicles.",
    ],
    includes: COMMON_INCLUDES,
    definitions: [
      ...COMMON_DEFINITIONS,
      [
        "Equipment category",
        "Where published, volumes split by machine type such as backhoe loaders, excavators, or compaction equipment.",
      ],
    ],
    faqs: COMMON_FAQS("Construction equipment"),
  },
};

export function getSegmentSeo(path: string): SegmentSeo | null {
  return SEGMENT_SEO[path] ?? null;
}
