"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/components/providers/Providers";

/**
 * Renders nothing. Sends the visitor to the country's flash-report hub when the
 * segment they landed on has no data for that country.
 *
 * The country selector already hides such countries, so this only catches the
 * ways round it: a shared link, a bookmark, a hand-edited ?country=, or a
 * country selected before the availability list finished loading. Without it
 * the page renders "0 units" with every metric dashed out.
 *
 * The hub lists only the segments that country actually has, so the visitor
 * lands somewhere useful and is never told a report is missing.
 */
export default function SegmentAvailabilityGuard({
  segment,
}: {
  segment: string;
}) {
  const { region } = useAppContext();
  const router = useRouter();
  // Redirect at most once per country, so a slow hub never loops.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!region || handled.current === region) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/flash-reports/segment-countries?segment=${encodeURIComponent(
            segment,
          )}`,
        );
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        // `countries: null` means the lookup failed — fail open and let the
        // page render rather than bouncing the user on a transient error.
        const list = json?.countries;
        if (!Array.isArray(list)) return;

        if (!list.includes(region)) {
          handled.current = region;
          router.replace(
            `/flash-reports?country=${encodeURIComponent(region)}`,
          );
        }
      } catch {
        // fail open
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [region, segment, router]);

  return null;
}
