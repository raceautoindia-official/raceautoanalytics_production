"use client";

type SegmentCmsTextProps = {
  highlight?: string | null;
  html?: string | null;
  className?: string;
};

// Rich-text editors save "empty" as markup rather than an empty string —
// "<p></p>", "<p><br></p>", "<p>&nbsp;</p>". Those are all truthy, so a simple
// trim() check rendered a bordered card containing nothing (this is the stray
// empty rectangle that appeared between charts, e.g. Brazil's
// passenger_vehicle_secondary, which is 11 characters of pure markup).
//
// Treat content as present only if it survives stripping tags, entities and
// whitespace — unless it embeds real media, which carries meaning with no text.
const EMBED_RE = /<(img|iframe|video|audio|table|svg|picture|source)\b/i;

function hasRenderableContent(raw: string): boolean {
  if (!raw) return false;
  if (EMBED_RE.test(raw)) return true;

  const text = raw
    .replace(/<[^>]*>/g, "") // tags
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ") // non-breaking spaces
    .replace(/&[a-z0-9#]+;/gi, "") // any other entity
    .replace(/[\s\u00a0\u200b]+/g, ""); // whitespace incl. zero-width

  return text.length > 0;
}

export function SegmentCmsText({
  highlight,
  html,
  className = "",
}: SegmentCmsTextProps) {
  const cleanHighlight = String(highlight || "").trim();
  const rawHtml = String(html || "").trim();
  const showHtml = hasRenderableContent(rawHtml);

  // Nothing meaningful to show -> render nothing at all, so no empty card.
  if (!cleanHighlight && !showHtml) return null;

  return (
    <div
      className={`rounded-lg border border-border/50 bg-card/30 p-5 ${className}`}
    >
      {cleanHighlight ? (
        <div className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {cleanHighlight}
        </div>
      ) : null}

      {showHtml ? (
        <div
          className="prose prose-sm max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: rawHtml }}
        />
      ) : null}
    </div>
  );
}
