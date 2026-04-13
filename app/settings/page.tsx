"use client";

/**
 * /settings  — Account Settings (generic)
 *
 * Replaces the old /flash-reports/settings route.
 * Shows account details, subscription status, Flash Reports country slots,
 * and Forecast region slots for the logged-in user.
 * The old route /flash-reports/settings redirects here.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import { useForecastEntitlement } from "@/app/hooks/useForecastEntitlement";
import type { ForecastEntitlement, AssignedRegion } from "@/app/hooks/useForecastEntitlement";
import FlashCountrySelectModal from "@/app/flash-reports/components/FlashCountrySelectModal";
import ForecastRegionSelectModal from "@/app/forecast/components/ForecastRegionSelectModal";

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

/** Decode JWT payload without signature validation — matches existing app pattern. */
function decodeJwtEmail(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]+)/);
    if (!match) return null;
    const b64 = match[1].split(".")[1];
    if (!b64) return null;
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json);
    return payload?.email ? String(payload.email) : null;
  } catch {
    return null;
  }
}

export default function AccountSettingsPage() {
  const {
    entitlement,
    assignedCountries,
    loading,
    error,
    isLoggedIn,
    refreshCountries,
  } = useFlashEntitlement();

  const {
    entitlement: forecastEntitlement,
    assignedRegions,
    loading: forecastLoading,
    refreshRegions,
  } = useForecastEntitlement();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showForecastAddModal, setShowForecastAddModal] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  // Decode email from JWT cookie once on mount (client-side only)
  useEffect(() => {
    setLoggedInEmail(decodeJwtEmail());
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#060D1F] flex items-center justify-center px-4">
        <div className="text-[#EAF0FF]/60 text-center">
          <p className="text-lg font-medium text-[#EAF0FF]">Not logged in</p>
          <p className="mt-2 text-sm">Please log in to view your account settings.</p>
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
  const isDirectUser = entitlement?.accessType === "direct";
  const isSharedUser = entitlement?.accessType === "shared";
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
          <Link href="/" className="hover:text-[#EAF0FF]/70 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#EAF0FF]/70">Account Settings</span>
        </div>

        <h1 className="text-2xl font-semibold text-[#EAF0FF]">
          Account Settings
        </h1>
        <p className="mt-1.5 text-sm text-[#EAF0FF]/50">
          Manage your account, subscription access, Flash Reports, and Forecast preferences.
        </p>

        {/* Account / User Details Card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide mb-4">
            Account
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow
              label="Email"
              value={
                loggedInEmail ? (
                  <span className="text-[#EAF0FF]">{loggedInEmail}</span>
                ) : (
                  <span className="text-[#EAF0FF]/40">—</span>
                )
              }
            />
            <InfoRow
              label="Account Type"
              value={
                isSubscribed ? (
                  <span className="text-[#7B93FF]">
                    {isSharedUser ? "Shared Member" : "Subscriber"}
                  </span>
                ) : (
                  <span className="text-[#EAF0FF]/50">Free</span>
                )
              }
            />
          </div>
        </div>

        {/* Subscription Info Card */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
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
                label="Plan Owner"
                value={
                  <span className="text-[#7B93FF]">
                    {entitlement.parentEmail}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Flash Reports — Country Slots Card */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide">
              Flash Reports — Country Slots
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
                    {isSharedUser
                      ? "Assigned countries (inherited from plan owner)"
                      : "Assigned countries (fixed — cannot be changed)"}
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
                  {isSharedUser
                    ? "No countries have been assigned to your membership yet. Contact your plan owner."
                    : "No countries assigned yet."}
                </div>
              )}

              {/* Add remaining slots — DIRECT users only */}
              {isDirectUser && remainingSlots > 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.2)]"
                >
                  Assign {remainingSlots} More{" "}
                  {remainingSlots === 1 ? "Country" : "Countries"}
                </button>
              )}

              {/* Shared users: read-only notice */}
              {isSharedUser && remainingSlots > 0 && (
                <div className="mt-4 text-xs text-[#EAF0FF]/35 leading-relaxed">
                  Country assignment is managed by your plan owner. Contact{" "}
                  {entitlement?.parentEmail ? (
                    <span className="text-[#7B93FF]">{entitlement.parentEmail}</span>
                  ) : "your plan owner"}{" "}
                  to add more countries.
                </div>
              )}

              {remainingSlots === 0 && (
                <div className="mt-4 text-xs text-[#EAF0FF]/35">
                  All country slots are filled. Slots cannot be changed or reassigned.
                </div>
              )}
            </>
          )}
        </div>

        {/* Forecast — Region Slots Card */}
        <ForecastRegionsCard
          forecastEntitlement={forecastEntitlement}
          assignedRegions={assignedRegions}
          forecastLoading={forecastLoading}
          onAddRegions={() => setShowForecastAddModal(true)}
        />

        {/* Back link */}
        <div className="mt-6">
          <Link href="/" className="text-sm text-[#7B93FF] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Flash country-select modal — direct users only */}
      {showAddModal && entitlement && isDirectUser && (
        <FlashCountrySelectModal
          entitlement={entitlement}
          assignedCountries={assignedCountries}
          onSaved={() => {
            refreshCountries();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Forecast region-select modal — direct users only */}
      {showForecastAddModal &&
        forecastEntitlement &&
        forecastEntitlement.accessType === "direct" && (
          <ForecastRegionSelectModal
            entitlement={forecastEntitlement}
            assignedRegions={assignedRegions}
            onSaved={() => {
              refreshRegions();
              setShowForecastAddModal(false);
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

const FORECAST_PLAN_LABEL: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

function ForecastRegionsCard({
  forecastEntitlement,
  assignedRegions,
  forecastLoading,
  onAddRegions,
}: {
  forecastEntitlement: ForecastEntitlement | null;
  assignedRegions: AssignedRegion[];
  forecastLoading: boolean;
  onAddRegions: () => void;
}) {
  const isSubscribed =
    !!forecastEntitlement?.isSubscribed &&
    forecastEntitlement.effectiveStatus === "active";
  const isDirectUser = forecastEntitlement?.accessType === "direct";
  const isSharedUser = forecastEntitlement?.accessType === "shared";
  const limit = forecastEntitlement?.forecastRegionLimit ?? 0;
  const usedSlots = assignedRegions.length;
  const remainingSlots = limit - usedSlots;
  const planLabel =
    FORECAST_PLAN_LABEL[
      forecastEntitlement?.effectivePlan?.toLowerCase() ?? ""
    ] ||
    forecastEntitlement?.effectivePlan ||
    "—";

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide">
          Forecast — Region Slots
        </div>
        {isSubscribed && (
          <div className="text-xs text-[#EAF0FF]/40">
            {usedSlots} used / {limit} total
          </div>
        )}
      </div>

      {forecastLoading ? (
        <div className="text-sm text-[#EAF0FF]/40">Loading…</div>
      ) : !isSubscribed ? (
        <div className="text-sm text-[#EAF0FF]/50">
          Forecast region slots are available for subscribed users only.{" "}
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
          <div className="mb-4 text-xs text-[#EAF0FF]/40">
            Plan:{" "}
            <span className="text-[#7B93FF] font-medium">{planLabel}</span>
            {isSharedUser && forecastEntitlement?.parentEmail && (
              <span>
                {" "}
                · Owner:{" "}
                <span className="text-[#7B93FF]">
                  {forecastEntitlement.parentEmail}
                </span>
              </span>
            )}
          </div>

          <div className="flex gap-6 mb-5 text-center">
            <SlotStat label="Total Slots" value={limit} color="text-[#EAF0FF]" />
            <SlotStat label="Used" value={usedSlots} color="text-[#7B93FF]" />
            <SlotStat
              label="Remaining"
              value={remainingSlots}
              color={remainingSlots > 0 ? "text-green-400" : "text-[#EAF0FF]/30"}
            />
          </div>

          {assignedRegions.length > 0 ? (
            <div>
              <div className="text-xs text-[#EAF0FF]/35 mb-3 uppercase tracking-wide">
                {isSharedUser
                  ? "Assigned regions (inherited from plan owner)"
                  : "Assigned regions (fixed — cannot be changed)"}
              </div>
              <div className="space-y-2">
                {assignedRegions.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/8 bg-white/3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#EAF0FF]/40 w-5 text-right">
                        {r.slot_index + 1}.
                      </span>
                      <span className="text-sm text-[#EAF0FF]/80">
                        {r.region_name}
                      </span>
                    </div>
                    <span className="text-xs text-[#EAF0FF]/30">🔒 Fixed</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#EAF0FF]/50">
              {isSharedUser
                ? "No regions have been assigned to your membership yet. Contact your plan owner."
                : "No regions assigned yet."}
            </div>
          )}

          {isDirectUser && remainingSlots > 0 && (
            <button
              onClick={onAddRegions}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#4F67FF] text-white text-sm font-semibold hover:bg-[#3B55FF] transition shadow-[0_8px_24px_rgba(79,103,255,0.2)]"
            >
              Assign {remainingSlots} More{" "}
              {remainingSlots === 1 ? "Region" : "Regions"}
            </button>
          )}

          {isSharedUser && remainingSlots > 0 && (
            <div className="mt-4 text-xs text-[#EAF0FF]/35 leading-relaxed">
              Region assignment is managed by your plan owner. Contact{" "}
              {forecastEntitlement?.parentEmail ? (
                <span className="text-[#7B93FF]">
                  {forecastEntitlement.parentEmail}
                </span>
              ) : (
                "your plan owner"
              )}{" "}
              to add more regions.
            </div>
          )}

          {remainingSlots === 0 && (
            <div className="mt-4 text-xs text-[#EAF0FF]/35">
              All region slots are filled. Slots cannot be changed or reassigned.
            </div>
          )}
        </>
      )}
    </div>
  );
}
