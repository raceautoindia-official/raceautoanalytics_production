"use client";

type SegmentCmsTextProps = {
  highlight?: string | null;
  html?: string | null;
  className?: string;
};

export function SegmentCmsText({
  highlight,
  html,
  className = "",
}: SegmentCmsTextProps) {
  const cleanHighlight = String(highlight || "").trim();
  const cleanHtml = String(html || "").trim();

  if (!cleanHighlight && !cleanHtml) return null;

  return (
    <div
      className={`rounded-lg border border-border/50 bg-card/30 p-5 ${className}`}
    >
      {cleanHighlight ? (
        <div className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {cleanHighlight}
        </div>
      ) : null}

      {cleanHtml ? (
        <div
          className="prose prose-sm max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      ) : null}
    </div>
  );
}