import type { Metadata } from "next";
import SegmentSeoContent from "@/components/flash-reports/SegmentSeoContent";
import { getSegmentSeo } from "@/lib/flashSegmentSeo";
import { SITE_URL } from "@/lib/seoRoutes";
import SegmentClient from "./SegmentClient";

// Server wrapper. The interactive report is unchanged — it moved verbatim to
// SegmentClient.tsx and still renders below. This wrapper exists so the route
// can (a) export its own metadata, which a "use client" page cannot, and
// (b) emit real server-rendered content instead of the ~104-word shell
// crawlers used to receive.
const seo = getSegmentSeo("three-wheeler")!;

export const metadata: Metadata = {
  title: seo.title,
  description: seo.description,
  alternates: { canonical: `/flash-reports/${seo.path}` },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: `${SITE_URL}/flash-reports/${seo.path}`,
    type: "website",
  },
};

export default function Page() {
  return (
    <>
      <SegmentSeoContent seo={seo} />
      <SegmentClient />
    </>
  );
}
