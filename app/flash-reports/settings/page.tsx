"use client";

/**
 * /flash-reports/settings
 *
 * Shows the user's Flash Report subscription status and fixed country slots.
 * - Displays effective plan, access type, parent email if shared
 * - Shows used / total / remaining country slots
 * - Already-assigned countries are read-only (no edit/remove)
 * - Allows adding remaining slots if any are available
 */

import { useState } from "react";
import Link from "next/link";
import { useFlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import FlashCountrySelectModal from "@/app/flash-reports/components/FlashCountrySelectModal";

const PLAN_LABEL: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const ACCESS_TYPE_LABEL: Record<string, string> = {
  direct: "Direct Subscription",
  shared: "Shared (Inherited) Subscription",
  none: "No Active Subscription",
};

export default function FlashReportsSettingsPage() {
  const {
    entitlement,
    assignedCountries,
    loading,
    error,
    isLoggedIn,
    refreshCountries,
  } = useFlashEntitlement();

  const [showAddModal, setShowAddModal] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center px-4">
        <div className="text-[#EAF0FF]/60 text-center">
          <p className="text-lg font-medium text-[#EAF0FF]">Not logged in</p>
          <p className="mt-2 text-sm">Please log in to view your Flash Report settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center">
        <div className="text-[#EAF0FF]/50 text-sm">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center px-4">
        <div className="text-red-400 text-sm text-center">
          Failed to load subscription data: {error}
        </div>
      </div>
    );
  }

  const isSubscribed =
    !!entitlement?.isSubscribed && entitlement.effectiveStatus === "active";
  const limit = entitlement?.flashReportCountryLimit ?? 0;
  const usedSlots = assignedCountries.length;
  const remainingSlots = limit - usedSlots;
  const planLabel =
    PLAN_LABEL[entitlement?.effectivePlan?.toLowerCase() ?? ""] ||
    entitlement?.effectivePlan ||
    "—";
  const accessLabel =
    ACCESS_TYPE_LABEL[entitlement?.accessType ?? "none"] ||
    entitlement?.accessType ||
    "—";

  return (
    <div className="min-h-screen bg-[#060D1F] px-4 py-10">
      <div className="mx-auto max-w-[680px]">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-[#EAF0FF]/40">
          <Link href="/flash-reports" className="hover:text-[#EAF0FF]/70 transition">
            Flash Reports
          </Link>
          <span>/</span>
          <span className="text-[#EAF0FF]/70">Settings</span>
        </div>

        <h1 className="text-2xl font-semibold text-[#EAF0FF]">
          Flash Report Settings
        </h1>
        <p className="mt-1.5 text-sm text-[#EAF0FF]/50">
          Your subscription status and fixed country slot assignments.
        </p>

        {/* Subscription Info Card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide mb-4">
            Subscription
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow label="Plan" value={planLabel} />
            <InfoRow
              label="Status"
              value={
                isSubscribed ? (
                  <span className="text-green-400">Active</span>
                ) : (
                  <span className="text-red-400">Inactive / Free</span>
                )
              }
            />
            <InfoRow label="Access Type" value={accessLabel} />
            {entitlement?.parentEmail && (
              <InfoRow
                label="Shared via"
                value={
                  <span className="text-[#7B93FF]">
                    {entitlement.parentEmail}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Country Slots Card */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide">
              Country Slots
            </div>
            <div className="text-xs text-[#EAF0FF]/40">
              {usedSlots} used / {limit} total
            </div>
          </div>

          {!isSubscribed ? (
            <div className="text-sm text-[#EAF0FF]/50">
              Country slots are available for subscribed users only.{" "}
              <a
                href="https://raceautoindia.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#7B93FF] hover:underline"
              >
                View plans
              </a>
            </div>
          ) : (
            <>
              {/* Slot summary */}
              <div className="flex gap-6 mb-5 text-center">
                <SlotStat label="Total Slots" value={limit} color="text-[#EAF0FF]" />
                <SlotStat label="Used" value={usedSlots} color="text-[#7B93FF]" />
                <SlotStat
                  label="Remaining"
                  value={remainingSlots}
                  color={remainingSlots > 0 ? "text-green-400" : "text-[#EAF0FF]/30"}
                />
              </div>

              {/* Assigned countries list */}
              {assignedCountries.length > 0 ? (
                <div>
                  <div className="text-xs text-[#EAF0FF]/35 mb-3 uppercase tracking-wide">
                    Assigned countries (fixed — cannot be changed)
                  </div>
                  <div className="space-y-2">
                    {assignedCountries.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/8 bg-white/3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#EAF0FF]/40 w-5 text-right">
                            {c.slot_index + 1}.
                          </span>
                          <span className="text-sm text-[#EAF0FF]/80 capitalize">
                            {c.country_id.replace(/-/g, " ")}
                          </span>
                        </div>
                        <span className="text-xs text-[#EAF0FF]/30">🔒 Fixed</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#EAF0FF]/50">
                  No countries assigned yet.
                </div>
              )}

              {/* Add remaining slots button */}
              {remainingSlots > 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.2)]"
                >
                  Assign {remainingSlots} More{" "}
                  {remainingSlots === 1 ? "Country" : "Countries"}
                </button>
              )}

              {remainingSlots === 0 && (
                <div className="mt-4 text-xs text-[#EAF0FF]/35">
                  All country slots are filled. Slots cannot be changed or
                  reassigned.
                </div>
              )}
            </>
          )}
        </div>

        {/* Back link */}
        <div className="mt-6">
          <Link
            href="/flash-reports"
            className="text-sm text-[#7B93FF] hover:underline"
          >
            ← Back to Flash Reports
          </Link>
        </div>
      </div>

      {/* Add-countries modal (reuses FlashCountrySelectModal) */}
      {showAddModal && entitlement && (
        <FlashCountrySelectModal
          entitlement={entitlement}
          assignedCountries={assignedCountries}
          onSaved={() => {
            refreshCountries();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-[#EAF0FF]/40 mb-0.5">{label}</div>
      <div className="text-sm text-[#EAF0FF]/80 font-medium">{value}</div>
    </div>
  );
}

function SlotStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-white/8 bg-white/3 py-3 px-2 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-[#EAF0FF]/40 mt-0.5">{label}</div>
    </div>
  );
}
