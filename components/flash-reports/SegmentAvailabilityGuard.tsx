"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/components/providers/Providers";
import { withCountry } from "@/lib/withCountry";

/**
 * Renders nothing. Sends the visitor to the country's flash-report hub only
 * when the segment has no available chart for that country and month.
 *
 * The hub and this guard use the same segment-availability API. Countries with
 * a sales forecast but no market-share, EV-share, application, or segment-split
 * chart therefore remain accessible because one available chart is enough.
 */
export default function SegmentAvailabilityGuard({
  segment,
}: {
  segment: string;
}) {
  const { region, month } = useAppContext();
  const router = useRouter();
  // Redirect at most once per country/month/segment, so a slow hub never loops.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!region || !month) return;

    const lookupKey = `${region}:${month}:${segment}`;
    if (handled.current === lookupKey) return;

    let cancelled = false;
    (async () => {
      try {
        // Use the same any-chart availability rule as the segment cards. A
        // forecast alone is enough to keep the destination page accessible.
        const availabilityRes = await fetch(
          withCountry(
            `/api/flash-reports/segment-availability?month=${encodeURIComponent(
              month,
            )}`,
            region,
          ),
          { cache: "no-store" },
        );

        // A transient lookup failure must not bounce a valid report page.
        if (!availabilityRes.ok) return;

        const json = await availabilityRes.json();
        if (cancelled) return;

        const availability = json?.segments?.[segment];
        if (typeof availability?.isAvailable === "boolean") {
          if (availability.isAvailable) return;

          handled.current = lookupKey;
          const params = new URLSearchParams({ country: region, month });
          router.replace(`/flash-reports?${params.toString()}`);
          return;
        }

        const usesLegacyCountryFallback =
          segment === "commercial-vehicles/trucks" ||
          segment === "commercial-vehicles/buses";
        if (!usesLegacyCountryFallback) return;

        // Truck and Bus are nested routes and are not yet part of the hub's
        // segment map, so preserve their existing country-level fallback.
        const countriesRes = await fetch(
          `/api/flash-reports/segment-countries?segment=${encodeURIComponent(
            segment,
          )}`,
        );
        if (!countriesRes.ok) return;
        const countriesJson = await countriesRes.json();
        if (cancelled) return;

        // `countries: null` means the lookup failed — fail open and let the
        // page render rather than bouncing the user on a transient error.
        const list = countriesJson?.countries;
        if (!Array.isArray(list)) return;

        if (!list.includes(region)) {
          handled.current = lookupKey;
          const params = new URLSearchParams({ country: region, month });
          router.replace(`/flash-reports?${params.toString()}`);
        }
      } catch {
        // fail open
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [region, month, segment, router]);

  return null;
}
