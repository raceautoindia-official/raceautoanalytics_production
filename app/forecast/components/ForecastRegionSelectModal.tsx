"use client";

/**
 * ForecastRegionSelectModal
 *
 * Shown to direct paid users when they have no Forecast region slots assigned yet.
 * Fetches available region names from /api/contentHierarchy, then lets the user
 * pick up to their plan limit (forecastRegionLimit).
 *
 * Selections are permanent — cannot be changed after saving.
 */

import React, { useState, useEffect } from "react";
import type { ForecastEntitlement } from "@/app/hooks/useForecastEntitlement";
import type { AssignedRegion } from "@/app/hooks/useForecastEntitlement";

interface Props {
  entitlement: ForecastEntitlement;
  assignedRegions: AssignedRegion[];
  onSaved: () => void;
}

interface HierarchyNode {
  id: number;
  name: string;
  parent_id: number | null;
}

const ROOT_PARENT_ID = 76; // matches forecast/page.js constant

export default function ForecastRegionSelectModal({
  entitlement,
  assignedRegions,
  onSaved,
}: Props) {
  const [allNodes, setAllNodes] = useState<HierarchyNode[]>([]);
  const [availableRegionNames, setAvailableRegionNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(true);

  const limit = entitlement.forecastRegionLimit;
  const alreadyAssigned = new Set(assignedRegions.map((r) => r.region_name));
  const remainingSlots = limit - assignedRegions.length;

  useEffect(() => {
    setLoadingRegions(true);
    fetch("/api/contentHierarchy", {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
      },
    })
      .then((r) => r.json())
      .then((nodes: HierarchyNode[]) => {
        setAllNodes(nodes);

        // Extract distinct region names:
        // Region nodes = children of category nodes (grandchildren of ROOT_PARENT_ID),
        // excluding the "All Regions" aggregate node.
        const categoryIds = new Set(
          nodes
            .filter((n) => n.parent_id == ROOT_PARENT_ID)
            .map((n) => n.id),
        );

        const regionNamesSet = new Set<string>();
        nodes
          .filter(
            (n) =>
              n.parent_id != null &&
              categoryIds.has(n.parent_id) &&
              n.name !== "All Regions",
          )
          .forEach((n) => regionNamesSet.add(n.name));

        setAvailableRegionNames(Array.from(regionNamesSet).sort());
      })
      .catch(() => setError("Failed to load regions. Please refresh and try again."))
      .finally(() => setLoadingRegions(false));
  }, []);

  function toggleRegion(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < remainingSlots) {
        next.add(name);
      }
      return next;
    });
    setError(null);
  }

  async function handleSave() {
    if (selected.size === 0) {
      setError("Please select at least one region.");
      return;
    }
    if (selected.size !== remainingSlots) {
      setError(
        `Please select exactly ${remainingSlots} region${remainingSlots !== 1 ? "s" : ""}.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/forecast/user-regions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regions: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to save regions. Please try again.");
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const planLabel = entitlement.effectivePlan
    ? entitlement.effectivePlan.charAt(0).toUpperCase() +
      entitlement.effectivePlan.slice(1).toLowerCase()
    : "Paid";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#0B1228] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 rounded-lg bg-[#4F67FF]/15 flex items-center justify-center">
              <span className="text-[#7B93FF] text-sm">🌐</span>
            </div>
            <h2 className="text-base font-semibold text-[#EAF0FF]">
              Select Your Forecast Regions
            </h2>
          </div>
          <p className="text-xs text-[#EAF0FF]/50 leading-relaxed mt-1">
            Your <span className="text-[#7B93FF]">{planLabel}</span> plan
            includes{" "}
            <span className="text-[#EAF0FF]">
              {limit} region{limit !== 1 ? "s" : ""}
            </span>
            . Choose carefully — region slots are{" "}
            <span className="text-amber-400">permanent</span> and cannot be
            changed after saving.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[340px] overflow-y-auto">
          {loadingRegions ? (
            <div className="text-[#EAF0FF]/40 text-sm text-center py-8">
              Loading available regions…
            </div>
          ) : availableRegionNames.length === 0 ? (
            <div className="text-[#EAF0FF]/40 text-sm text-center py-8">
              No regions available.
            </div>
          ) : (
            <div className="space-y-2">
              {availableRegionNames.map((name) => {
                const isAssigned = alreadyAssigned.has(name);
                const isSelected = selected.has(name);
                const isDisabled =
                  isAssigned ||
                  (!isSelected && selected.size >= remainingSlots);

                return (
                  <label
                    key={name}
                    className={[
                      "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition",
                      isAssigned
                        ? "border-white/8 bg-white/3 cursor-not-allowed opacity-50"
                        : isSelected
                        ? "border-[#4F67FF]/60 bg-[#4F67FF]/10"
                        : isDisabled
                        ? "border-white/8 bg-transparent cursor-not-allowed opacity-40"
                        : "border-white/10 bg-transparent hover:border-white/20 hover:bg-white/4",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#4F67FF]"
                      checked={isSelected || isAssigned}
                      disabled={isDisabled}
                      onChange={() => !isDisabled && toggleRegion(name)}
                    />
                    <span className="text-sm text-[#EAF0FF]/85 font-medium flex-1">
                      {name}
                    </span>
                    {isAssigned && (
                      <span className="text-xs text-[#EAF0FF]/30">
                        🔒 Fixed
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Slot counter */}
        <div className="px-6 py-3 border-t border-white/8 flex items-center justify-between">
          <span className="text-xs text-[#EAF0FF]/40">
            {selected.size} of {remainingSlots} selected
          </span>
          <div className="flex gap-2">
            {Array.from({ length: remainingSlots }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-2 w-2 rounded-full transition",
                  i < selected.size ? "bg-[#4F67FF]" : "bg-white/15",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-2">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={saving || selected.size === 0 || loadingRegions}
            className="w-full h-11 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
          >
            {saving
              ? "Saving…"
              : `Confirm ${selected.size > 0 ? selected.size : ""} Region${selected.size !== 1 ? "s" : ""}`}
          </button>
          <p className="mt-2.5 text-center text-[10px] text-[#EAF0FF]/30 leading-relaxed">
            This selection is permanent and cannot be changed later.
          </p>
        </div>
      </div>
    </div>
  );
}
