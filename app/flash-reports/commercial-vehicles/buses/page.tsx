import type { Metadata } from "next";
import { getSegmentSeo } from "@/lib/flashSegmentSeo";
import { SITE_URL } from "@/lib/seoRoutes";
import SegmentAvailabilityGuard from "@/components/flash-reports/SegmentAvailabilityGuard";
import SegmentClient from "./SegmentClient";

// Server wrapper around the interactive report.
//
// The visible page is intentionally UNCHANGED from the client-approved design:
// SegmentClient renders exactly what it always has, and nothing is added above
// it. This wrapper only contributes <head> output, which a "use client" page
// cannot produce:
//   - a unique title/description/canonical per segment (all 8 routes
//     previously inherited one title from the layout)
//   - Dataset + BreadcrumbList JSON-LD
// No FAQPage schema here: the FAQ copy is not rendered on the page, and
// marking up content a visitor cannot see breaks Google's structured-data
// rules.
const seo = getSegmentSeo("commercial-vehicles/buses")!;
const url = `${SITE_URL}/flash-reports/${seo.path}`;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: `/flash-reports/${seo.path}` },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url,
    type: "website",
  },
};

const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: `${seo.name} sales data by country`,
  description: seo.description,
  url,
  isAccessibleForFree: false,
  creator: {
    "@type": "Organization",
    name: "Race Auto Analytics",
    url: SITE_URL,
  },
  variableMeasured: [
    "Monthly sales volume",
    "OEM segment share",
    "Month-on-month change",
    "Year-on-year change",
    "EV / alternative-fuel share",
  ],
  temporalCoverage: "Monthly",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Flash Reports",
      item: `${SITE_URL}/flash-reports/overview`,
    },
    { "@type": "ListItem", position: 3, name: seo.name, item: url },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SegmentAvailabilityGuard segment={seo.path} />
      <SegmentClient />
    </>
  );
}
