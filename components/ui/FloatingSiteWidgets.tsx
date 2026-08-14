"use client";

import { usePathname } from "next/navigation";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import TalkToExpertWidget from "@/app/components/TalkToExpertWidget";

/**
 * The floating "Talk to an Expert" button and the scroll-to-top arrow are
 * public-site furniture. They were mounted in the root layout, so they also
 * appeared over the admin/CMS screens where they are just in the way — the
 * arrow overlaps the bottom-right of CMS tables, and admins have no use for a
 * sales enquiry form.
 *
 * Rendered everywhere except the admin area.
 *
 * Note: usePathname (unlike useSearchParams) does not force a client-side
 * bailout, so wrapping these here does not de-opt any page's server rendering.
 */
const HIDDEN_PREFIXES = ["/admin"];

export default function FloatingSiteWidgets() {
  const pathname = usePathname() || "";

  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (hidden) return null;

  return (
    <>
      <ScrollToTopButton />
      <TalkToExpertWidget />
    </>
  );
}
