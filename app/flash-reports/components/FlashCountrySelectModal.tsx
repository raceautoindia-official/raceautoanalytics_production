"use client";

import { useEffect, useState } from "react";
import type { FlashEntitlement, AssignedCountry } from "@/app/hooks/useFlashEntitlement";

type CountryOpt = { value: string; label: string; flag?: string };

interface Props {
  entitlement: FlashEntitlement;
  assignedCountries: AssignedCountry[];
  onSaved: () => void;
}

const PLAN_LABEL: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export default function FlashCountrySelectModal({
  entitlement,
  assignedCountries,
  onSaved,
}: Props) {
  const [availableOptions, setAvailableOptions] = useState<CountryOpt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = entitlement.flashReportCountryLimit;
  const alreadyAssigned = assignedCountries.map((c) => c.country_id);
  const usedSlots = alreadyAssigned.length;
  const remaining = limit - usedSlots;

  // Fetch available countries from the same countries API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/flash-reports/countries", {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (Array.isArray(json)) {
          // Exclude already-assigned
          const opts = json.filter(
            (o: CountryOpt) => !alreadyAssigned.includes(o.value),
          );
          setAvailableOptions(opts);
        }
      } catch {
        // keep empty
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCountry(value: string) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= remaining) return prev; // slot limit reached
      return [...prev, value];
    });
  }

  async function handleSave() {
    if (!selected.length) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/flash-reports/user-countries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries: selected }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "Failed to save country selection");
        return;
      }

      onSaved();
    } catch (e: any) {
      setErrorMsg(e?.message || "Network error");
    } finally {
      setSaving(false);
    }
  }

  // Don't render if no remaining slots (all filled)
  if (remaining <= 0) return null;

  const planLabel =
    PLAN_LABEL[entitlement.effectivePlan?.toLowerCase() ?? ""] ||
    entitlement.effectivePlan ||
    "Subscribed";

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#050B1A]/85 backdrop-blur-[3px]" />

      {/* Modal */}
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[700px] -translate-x-1/2 rounded-full bg-[#4F67FF]/15 blur-3xl" />

        <div className="relative px-7 py-6">
          <div className="text-xl font-semibold text-[#EAF0FF]">
            Select Your Flash Report Countries
          </div>
          <div className="mt-1.5 text-sm text-[#EAF0FF]/60">
            Your <span className="text-[#7B93FF] font-medium">{planLabel}</span> plan includes{" "}
            <span className="text-[#EAF0FF]/80 font-medium">{limit}</span> country{" "}
            {limit === 1 ? "slot" : "slots"}.{" "}
            {usedSlots > 0 && (
              <>
                You have already assigned{" "}
                <span className="text-[#EAF0FF]/80 font-medium">{usedSlots}</span>.{" "}
              </>
            )}
            Select <span className="text-[#EAF0FF]/80 font-medium">{remaining}</span> more.
          </div>

          {entitlement.accessType === "shared" && entitlement.parentEmail && (
            <div className="mt-2 text-xs text-[#EAF0FF]/40">
              Shared access via{" "}
              <span className="text-[#EAF0FF]/60">{entitlement.parentEmail}</span>
            </div>
          )}

          {/* Already assigned (read-only) */}
          {alreadyAssigned.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-[#EAF0FF]/40 mb-2 uppercase tracking-wide">
                Already assigned (locked)
              </div>
              <div className="flex flex-wrap gap-2">
                {alreadyAssigned.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 rounded-full text-xs bg-white/5 text-[#EAF0FF]/50 border border-white/10 cursor-not-allowed"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Country selection grid */}
          <div className="mt-5">
            <div className="text-xs text-[#EAF0FF]/40 mb-2 uppercase tracking-wide">
              Choose {remaining} {remaining === 1 ? "country" : "countries"}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {availableOptions.map((opt) => {
                const isSelected = selected.includes(opt.value);
                const isDisabled = !isSelected && selected.length >= remaining;
                return (
                  <button
                    key={opt.value}
                    onClick={() => !isDisabled && toggleCountry(opt.value)}
                    disabled={isDisabled}
                    className={[
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all text-left",
                      isSelected
                        ? "border-[#4F67FF] bg-[#4F67FF]/20 text-[#EAF0FF]"
                        : isDisabled
                          ? "border-white/5 bg-white/2 text-[#EAF0FF]/30 cursor-not-allowed"
                          : "border-white/10 bg-white/5 text-[#EAF0FF]/80 hover:border-white/25 hover:bg-white/8 cursor-pointer",
                    ].join(" ")}
                  >
                    <span className="text-base">{opt.flag || "🌍"}</span>
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="ml-auto text-[#7B93FF] text-xs">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <div className="mt-5 text-xs text-[#EAF0FF]/35 leading-relaxed">
            Once saved, your selected countries are permanently fixed and cannot
            be changed or removed.
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <div className="text-sm text-[#EAF0FF]/50 self-center">
              {selected.length} / {remaining} selected
            </div>
            <button
              onClick={handleSave}
              disabled={saving || selected.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
            >
              {saving ? "Saving…" : "Confirm Selection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
