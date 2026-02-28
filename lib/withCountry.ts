// lib/withCountry.ts
export function withCountry(url: string, country?: string) {
  const c = String(country || "").trim();
  if (!c) return url;

  // works with "/api/..." URLs
  const hasQuery = url.includes("?");
  const hasCountryAlready = /(^|[?&])country=/.test(url);
  if (hasCountryAlready) return url;

  const sep = hasQuery ? "&" : "?";
  return `${url}${sep}country=${encodeURIComponent(c)}`;
}