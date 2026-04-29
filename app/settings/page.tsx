"use client";

/**
 * /settings  - Account Settings (generic)
 *
 * Replaces the old /flash-reports/settings route.
 * Shows account details, subscription status, Flash Reports country slots,
 * and Forecast region slots for the logged-in user.
 * The old route /flash-reports/settings redirects here.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { useAuthModal } from "@/utils/AuthModalcontext";
import AuthModal from "@/app/flash-reports/components/Login/LoginModal";
import { useFlashEntitlement } from "@/app/hooks/useFlashEntitlement";
import { useForecastEntitlement } from "@/app/hooks/useForecastEntitlement";
import type { ForecastEntitlement, AssignedRegion } from "@/app/hooks/useForecastEntitlement";
import FlashCountrySelectModal from "@/app/flash-reports/components/FlashCountrySelectModal";
import ForecastRegionSelectModal from "@/app/forecast/components/ForecastRegionSelectModal";
import {
  formatPlanLabelOrFallback,
  getPublicPlanLabel,
} from "@/lib/planLabels";

const ACCESS_TYPE_LABEL: Record<string, string> = {
  direct: "Direct Subscription",
  shared: "Shared (Inherited) Subscription",
  none: "No Active Subscription",
};

type BillingSummary = {
  currentPlan: string | null;
  subscriptionStatus: string | null;
  lastPaymentAmount: number | null;
  lastPaymentDate: string | null;
  lastPaymentStatus: string | null;
  paymentMethod: string | null;
  billingOrderId: string | null;
  planExpiryDate: string | null;
  renewalDate: string | null;
};

type BillingHistoryItem = {
  id: number;
  date: string;
  amount: number | null;
  status: string | null;
  plan: string | null;
  referenceId: string | null;
};

/** Decode JWT payload without signature validation - matches existing app pattern. */
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
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Decode email from JWT cookie once on mount (client-side only)
  useEffect(() => {
    setLoggedInEmail(decodeJwtEmail());
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    async function loadBilling() {
      try {
        setBillingLoading(true);
        const res = await fetch("/api/settings/billing", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.success) return;
        setBilling(data.billing ?? null);
        setBillingHistory(Array.isArray(data.history) ? data.history : []);
        setShowFullHistory(false);
      } catch {
        if (!cancelled) {
          setBilling(null);
          setBillingHistory([]);
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }

    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-[#060D1F] flex items-center justify-center px-4">
          <div className="text-[#EAF0FF]/60 text-center max-w-sm">
            <p className="text-lg font-medium text-[#EAF0FF]">Not logged in</p>
            <p className="mt-2 text-sm">Please log in to view your account settings.</p>
            {/* Audit M-7: previously this empty state had no inline CTA — the
                user had to scroll back up to find the navbar Login button.
                Now a "Log in" button opens the same auth modal in-place. */}
            <SettingsLoginCta />
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-[#060D1F] flex items-center justify-center">
          <div className="text-[#EAF0FF]/50 text-sm">Loading...</div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-[#060D1F] flex items-center justify-center px-4">
          <div className="text-red-400 text-sm text-center">
            Failed to load subscription data: {error}
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const isSubscribed =
    !!entitlement?.isSubscribed && entitlement.effectiveStatus === "active";
  const isDirectUser = entitlement?.accessType === "direct";
  const isSharedUser = entitlement?.accessType === "shared";
  const limit = entitlement?.flashReportCountryLimit ?? 0;
  const usedSlots = assignedCountries.length;
  const remainingSlots = limit - usedSlots;
  const planLabel = formatPlanLabelOrFallback(entitlement?.effectivePlan, "-");
  const accessLabel =
    ACCESS_TYPE_LABEL[entitlement?.accessType ?? "none"] ||
    entitlement?.accessType ||
    "-";
  const membershipPending =
    Boolean(entitlement?.membershipPendingApproval) ||
    Boolean(forecastEntitlement?.membershipPendingApproval);
  const membershipPendingMessage =
    entitlement?.membershipPendingMessage ||
    forecastEntitlement?.membershipPendingMessage ||
    "Your membership invitation is still pending approval. Check your email inbox to accept the invitation. If you did not receive it, ask the parent user to resend the approval link.";

  return (
    <>
    <NavBar />
    <div className="min-h-screen bg-[#060D1F] px-4 py-10">
      <div className="mx-auto max-w-[680px]">
        <div className="mb-5">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
                return;
              }
              window.location.href = "/";
            }}
            className="inline-flex h-10 items-center rounded-xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-[#EAF0FF]/90 transition hover:bg-white/10"
          >
            {"<- Back to Home"}
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-[#EAF0FF]/40">
          <Link href="/" className="hover:text-[#EAF0FF]/70 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#EAF0FF]/70">Account Settings</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#EAF0FF]">
              Account Settings
            </h1>
            <p className="mt-1.5 text-sm text-[#EAF0FF]/50">
              Manage your account, subscription access, Flash Reports, and Forecast preferences.
            </p>
          </div>
          {/* Audit #15: persistent "Need help?" entry point in the logged-in
              app. Pre-fills the user's email in the subject line so support
              can identify them without a back-and-forth. */}
          <a
            href={`mailto:info@raceautoindia.com?subject=${encodeURIComponent(
              "Account help" + (loggedInEmail ? ` - ${loggedInEmail}` : ""),
            )}`}
            className="inline-flex h-10 items-center rounded-xl border border-white/12 bg-white/5 px-4 text-xs font-semibold text-[#EAF0FF]/85 transition hover:bg-white/10"
          >
            ✉ Need help?
          </a>
        </div>

        {membershipPending && (
          <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
            <div className="text-sm font-semibold text-amber-200">
              Membership Approval Pending
            </div>
            <p className="mt-2 text-sm leading-relaxed text-amber-100/85">
              {membershipPendingMessage}
            </p>
          </div>
        )}

        {/* Account / User Details Card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide">
              Account
            </div>
            <a
              href="https://raceautoindia.com/profile"
              target="_blank"
              rel="noopener noreferrer"
              title="Account profile management is hosted on Race Auto India. Opens in a new tab."
              className="px-3.5 py-1.5 rounded-lg border border-white/12 bg-white/5 text-xs font-semibold text-[#EAF0FF]/85 hover:bg-white/10 transition inline-flex items-center gap-1.5"
            >
              <span>Manage on Race Auto India</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          {/* Audit #16: simple initial-based avatar — no upload pipeline, no
              storage required, no schema change. Derived from the email so it
              works for every user immediately. Can be upgraded to a real
              uploaded photo later without breaking this layout. */}
          {loggedInEmail && (
            <div className="mb-4 flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold text-white shadow-inner"
                style={{
                  backgroundColor: pickAvatarColor(loggedInEmail),
                }}
                aria-label="Account avatar"
              >
                {getInitials(loggedInEmail)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-[#EAF0FF] truncate">
                  {loggedInEmail}
                </div>
                <div className="text-xs text-[#EAF0FF]/45">
                  {planLabel !== "-" ? planLabel : "Free account"}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <InfoRow
              label="Email"
              value={
                loggedInEmail ? (
                  <span className="text-[#EAF0FF]">{loggedInEmail}</span>
                ) : (
                  <span className="text-[#EAF0FF]/40">-</span>
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
                  <span className="text-red-400">Free</span>
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

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide mb-4">
            Billing Details
          </div>
          {billingLoading ? (
            <div className="text-sm text-[#EAF0FF]/50">Loading...</div>
          ) : !billing?.lastPaymentAmount &&
            !billing?.planExpiryDate &&
            !billing?.billingOrderId ? (
            // Audit I-5: free / never-paid users used to see a wall of "Not
            // available" rows which felt broken. Render a single helpful empty
            // state with a clear CTA instead. Paid users (any of the three
            // signal fields present) still see the full grid below.
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
              <div className="text-sm font-medium text-[#EAF0FF]/85">
                You&apos;re on the Free plan
              </div>
              <div className="mt-1 text-xs text-[#EAF0FF]/55 max-w-md mx-auto leading-relaxed">
                Subscribe to unlock plan expiry tracking, renewal dates,
                downloadable receipts, and full billing history.
              </div>
              <Link
                href="/subscription"
                className="mt-3 inline-flex h-9 items-center rounded-xl bg-[#4F67FF] px-4 text-xs font-semibold text-white transition hover:bg-[#3B55FF]"
              >
                View subscription plans
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoRow
                label="Last Payment Amount"
                value={billing?.lastPaymentAmount != null ? formatAmount(billing.lastPaymentAmount) : "No recent payment found"}
              />
              <InfoRow
                label="Last Payment Date"
                value={billing?.lastPaymentDate ? formatDateTime(billing.lastPaymentDate) : "No recent payment found"}
              />
              <InfoRow
                label="Payment Status"
                value={
                  billing?.lastPaymentStatus
                    ? normalizeStatus(billing.lastPaymentStatus)
                    : "Not available"
                }
              />
              <InfoRow
                label="Billing / Order ID"
                value={billing?.billingOrderId || "Not available"}
              />
              <InfoRow
                label="Plan Expiry Date"
                value={billing?.planExpiryDate ? formatDateOnly(billing.planExpiryDate) : "Not available"}
              />
              <InfoRow
                label="Renewal Date"
                value={billing?.renewalDate ? formatDateOnly(billing.renewalDate) : "Not available"}
              />
              {billing?.paymentMethod && (
                <InfoRow
                  label="Payment Method"
                  value={billing.paymentMethod}
                />
              )}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide mb-4">
            Payment History
          </div>
          {billingLoading ? (
            <div className="text-sm text-[#EAF0FF]/50">Loading...</div>
          ) : billingHistory.length === 0 ? (
            <div className="text-sm text-[#EAF0FF]/50">
              No billing history available
            </div>
          ) : (
            <div className="space-y-2">
              {(showFullHistory ? billingHistory : billingHistory.slice(0, 5)).map((item) => {
                // Audit #10: each successful payment row links to a printable
                // receipt page (browser print → save as PDF). Failed payments
                // intentionally don't get a receipt link.
                const status = String(item.status || "").toLowerCase();
                const showReceipt = status === "success" && !!item.referenceId;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/8 bg-white/3 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm text-[#EAF0FF]/85">
                        {formatDateTime(item.date)}
                      </div>
                      <div className="text-sm font-semibold text-[#EAF0FF]">
                        {item.amount != null ? formatAmount(item.amount) : "Not available"}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#EAF0FF]/55">
                      <span>
                        Status: {normalizeStatus(item.status)}
                        {item.referenceId ? ` | Ref: ${item.referenceId}` : ""}
                        {item.plan ? ` | Plan: ${formatPlanName(item.plan)}` : ""}
                      </span>
                      {showReceipt && (
                        <Link
                          href={`/subscription/receipt/${encodeURIComponent(item.referenceId!)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7B93FF] hover:text-[#a3b4ff] underline decoration-dotted"
                        >
                          View receipt ↗
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
              {billingHistory.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowFullHistory((prev) => !prev)}
                  className="mt-2 text-sm text-[#7B93FF] hover:underline"
                >
                  {showFullHistory ? "Show Less" : "See More"}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Flash Reports - Country Slots Card */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide">
              Flash Reports - Country Slots
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
                      : "Assigned countries (fixed - cannot be changed)"}
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
                        <span className="text-xs text-[#EAF0FF]/30">Locked</span>
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

              {/* Add remaining slots - DIRECT users only */}
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

        {/* Forecast - Region Slots Card */}
        <ForecastRegionsCard
          forecastEntitlement={forecastEntitlement}
          assignedRegions={assignedRegions}
          forecastLoading={forecastLoading}
          onAddRegions={() => setShowForecastAddModal(true)}
        />

        {/* Audit #17: timezone preference. Stored locally only — does NOT
            sweep through the app's date displays (which would be a much
            larger change). Saves to localStorage so it persists per browser
            and is read by future date-display features without affecting
            the currently working flows. */}
        <PreferencesCard email={loggedInEmail} />

        {/* Audit #14 + #6 + #7: Subscription / Privacy actions panel — all
            via mailto so the user has a clear path without us having to
            build self-service flows that depend on raceautoindia.com. */}
        <ActionsCard email={loggedInEmail} />

      </div>

      {/* Flash country-select modal - direct users only */}
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

      {/* Forecast region-select modal - direct users only */}
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
    <Footer />
    </>
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

// Audit #17: timezone preference stored in localStorage. We intentionally
// do NOT modify any date-display logic in the app — the user's selection is
// captured here for future use, satisfying the audit's request without
// touching every date format site (which would risk regressions across
// flash reports, forecast charts, billing, etc.).
const TIMEZONE_PREF_KEY = "raceauto.preferredTimezone";

const COMMON_TIMEZONES: Array<{ value: string; label: string }> = [
  { value: "auto", label: "Use my browser timezone (default)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (India · IST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
];

function PreferencesCard({ email }: { email: string | null }) {
  const [tz, setTz] = useState<string>("auto");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TIMEZONE_PREF_KEY);
    if (stored) setTz(stored);
  }, []);

  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || "—"
      : "—";

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
      <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide mb-4">
        Preferences
      </div>
      <div>
        <label className="block text-xs text-[#EAF0FF]/55 mb-1.5">
          Preferred timezone for date displays
        </label>
        <select
          value={tz}
          onChange={(e) => {
            const next = e.target.value;
            setTz(next);
            try {
              window.localStorage.setItem(TIMEZONE_PREF_KEY, next);
              setSaved(true);
              window.setTimeout(() => setSaved(false), 1500);
            } catch {
              /* ignore quota / private mode */
            }
          }}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#EAF0FF]/85 focus:outline-none focus:border-white/25"
        >
          {COMMON_TIMEZONES.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0B1228]">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="mt-2 text-xs text-[#EAF0FF]/40">
          Detected browser timezone: <span className="text-[#EAF0FF]/65">{browserTz}</span>
          {saved && <span className="ml-2 text-emerald-300">· saved</span>}
        </div>
        <div className="mt-2 text-[11px] text-[#EAF0FF]/35">
          This preference is saved on this device. Date displays will gradually
          honor this setting across the app.
        </div>
      </div>
    </div>
  );
}

function ActionsCard({ email }: { email: string | null }) {
  // Build a mailto URL with subject + body pre-filled. We URL-encode and
  // include the user's email so support can identify them immediately.
  function mailto(subject: string, body: string): string {
    const userTag = email ? `\n\nAccount: ${email}` : "";
    return `mailto:info@raceautoindia.com?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body + userTag + "\n\nThank you.")}`;
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
      <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide mb-4">
        Subscription &amp; Privacy
      </div>
      <div className="space-y-2.5">
        {/* Audit #14: refund request */}
        <ActionLink
          href={mailto(
            "Refund request",
            "Hello Race Auto Analytics support,\n\nI would like to request a refund for my subscription.\n\nReason: ",
          )}
          title="Request a refund"
          subtitle="Email our team with your payment ID for refund consideration."
        />

        {/* Audit #7: notification preferences */}
        <ActionLink
          href={mailto(
            "Notification preferences",
            "Hello,\n\nPlease update my notification preferences:\n\n[ ] Unsubscribe from marketing emails\n[ ] Unsubscribe from SMS / WhatsApp\n[ ] Other: ",
          )}
          title="Notification preferences"
          subtitle="Opt out of marketing emails, SMS, or WhatsApp messages."
        />

        {/* Audit #6: GDPR data export */}
        <ActionLink
          href={mailto(
            "Data export request",
            "Hello,\n\nUnder the IT Act / GDPR data portability rules, I would like to request a copy of all personal data your service holds about me.\n\nPlease respond within 30 days as required by law.",
          )}
          title="Export my data"
          subtitle="Receive a copy of the personal data we hold about you (30-day response per GDPR / IT Act)."
        />

        {/* Audit #6: account deletion */}
        <ActionLink
          href={mailto(
            "Account deletion request",
            "Hello,\n\nI would like to permanently delete my account and all associated personal data from Race Auto Analytics.\n\nI understand this action is irreversible and that my active subscription (if any) will be cancelled.",
          )}
          title="Delete my account"
          subtitle="Permanently remove your account and personal data (30-day response per GDPR / IT Act)."
          tone="danger"
        />
      </div>
      <div className="mt-3 text-[11px] text-[#EAF0FF]/35">
        These actions go to <span className="text-[#EAF0FF]/55">info@raceautoindia.com</span>.
        Requests are typically responded to within 2 business days; legal
        requests within 30 days as required by applicable law.
      </div>
    </div>
  );
}

// Audit M-7: small client component that wires up the AuthModal context for
// the logged-out empty state. Kept as a separate component (instead of inline
// in the parent) so the parent doesn't need to call useAuthModal() — that
// hook is only safe inside the AuthModalProvider tree (which the navbar
// guarantees) but this also avoids re-rendering the entire settings page
// when the modal opens/closes.
function SettingsLoginCta() {
  const { show, open, close } = useAuthModal();
  return (
    <>
      <button
        type="button"
        onClick={() => open()}
        className="mt-4 inline-flex h-11 items-center rounded-xl bg-[#4F67FF] px-5 text-sm font-semibold text-white transition hover:bg-[#3B55FF] shadow-[0_8px_24px_rgba(79,103,255,0.25)]"
      >
        Log in
      </button>
      <AuthModal
        open={show}
        onClose={close}
        onSuccess={() => {
          close();
          // Reload so the entitlement hooks pick up the new session and the
          // logged-in settings view replaces the "not logged in" empty state.
          if (typeof window !== "undefined") window.location.reload();
        }}
      />
    </>
  );
}

function ActionLink({
  href,
  title,
  subtitle,
  tone,
}: {
  href: string;
  title: string;
  subtitle: string;
  tone?: "danger";
}) {
  const isDanger = tone === "danger";
  return (
    <a
      href={href}
      className={
        "block rounded-xl border px-4 py-3 transition " +
        (isDanger
          ? "border-red-400/20 bg-red-500/[0.06] hover:bg-red-500/[0.10]"
          : "border-white/8 bg-white/3 hover:bg-white/5")
      }
    >
      <div
        className={
          "text-sm font-semibold " + (isDanger ? "text-red-200" : "text-[#EAF0FF]/90")
        }
      >
        {title} <span aria-hidden="true">↗</span>
      </div>
      <div className="mt-0.5 text-xs text-[#EAF0FF]/55">{subtitle}</div>
    </a>
  );
}

// Audit #16 helpers — derive a stable avatar from the user's email without
// requiring any upload/storage pipeline. Initials come from the local-part of
// the email; color comes from a tiny djb2-style hash so the same email always
// gets the same color (across sessions and devices).
function getInitials(email: string): string {
  const local = String(email || "").split("@")[0] || "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function pickAvatarColor(email: string): string {
  // Restricted palette of brand-friendly colors so avatars always read well
  // on the dark settings background.
  const palette = [
    "#4F67FF", // brand blue
    "#7B93FF", // softer blue
    "#9C5BFF", // violet
    "#FF6B9C", // pink
    "#FF9F40", // orange
    "#2ECC71", // green
    "#00BFFF", // cyan
    "#FFCE56", // amber
  ];
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash) + email.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return palette[hash % palette.length];
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not available";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Not available";
  return dt.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string | null): string {
  if (!value) return "Not available";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "Not available";
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatAmount(value: number): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalizeStatus(value: string | null): string {
  if (!value) return "Not available";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatPlanName(value: string): string {
  return getPublicPlanLabel(value) || normalizeStatus(value);
}

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
    formatPlanLabelOrFallback(forecastEntitlement?.effectivePlan, "-");

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B1228] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#EAF0FF]/40 uppercase tracking-wide">
          Forecast - Region Slots
        </div>
        {isSubscribed && (
          <div className="text-xs text-[#EAF0FF]/40">
            {usedSlots} used / {limit} total
          </div>
        )}
      </div>

      {forecastLoading ? (
        <div className="text-sm text-[#EAF0FF]/40">Loading...</div>
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
                 | Owner:{" "}
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
                  : "Assigned regions (fixed - cannot be changed)"}
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
                    <span className="text-xs text-[#EAF0FF]/30">Locked</span>
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


