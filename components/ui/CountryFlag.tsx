"use client";

import { useState } from "react";

/**
 * Real flag icon for a country, keyed by ISO 3166-1 alpha-2 code.
 *
 * Uses flag IMAGES (flagcdn) — NOT emoji flags — because emoji flags render as
 * the two-letter country code on Windows and some Chrome builds (Windows fonts
 * ship no flag glyphs). Images render correctly on every platform. Falls back to
 * a 🌍 glyph when the code is missing/invalid or the image fails to load.
 *
 * Matches the flagcdn source already used by the hero panels.
 */
export function CountryFlag({
  iso2,
  name,
  className = "h-4 w-6 shrink-0 rounded-sm object-cover ring-1 ring-white/15",
}: {
  iso2?: string | null;
  name?: string | null;
  className?: string;
}) {
  const cc = String(iso2 || "").toLowerCase().trim();
  const valid = /^[a-z]{2}$/.test(cc);
  const [errored, setErrored] = useState(false);

  if (!valid || errored) {
    return (
      <span className={className} role="img" aria-label={name ? `${name} flag` : "flag"}>
        🌍
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      srcSet={`https://flagcdn.com/w80/${cc}.png 2x`}
      alt={name ? `${name} flag` : `${cc.toUpperCase()} flag`}
      loading="lazy"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
