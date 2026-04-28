import { ABBREVIATIONS } from "@/lib/abbreviations";

interface AbbrHintProps {
  /** Subset of keys from ABBREVIATIONS to show. Defaults to all. */
  keys?: string[];
}

export function AbbrHint({ keys }: AbbrHintProps) {
  const entries = keys
    ? keys.map((k) => [k, ABBREVIATIONS[k]] as [string, string]).filter(([, v]) => v)
    : Object.entries(ABBREVIATIONS);

  return (
    <p className="text-xs text-muted-foreground/70 flex flex-wrap gap-x-3 gap-y-0.5">
      {entries.map(([abbr, full], i) => (
        <span key={abbr}>
          <span className="font-medium text-muted-foreground">{abbr}</span>
          {" = "}
          {full}
          {i < entries.length - 1 && <span className="ml-3 text-border">·</span>}
        </span>
      ))}
    </p>
  );
}
