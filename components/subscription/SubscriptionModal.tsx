"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import AuthModal from "@/app/flash-reports/components/Login/LoginModal";
import { useSubscriptionModal } from "@/utils/SubscriptionModalContext";
import transformPricing from "./transformPricing";

type BillingCycle = "monthly" | "annual";
type PlanKey = "silver" | "gold" | "platinum";

type FeatureItem = {
  label: string;
  value?: string;
};

type PlanCard = {
  key: PlanKey;
  title: string;
  monthlyPrice: number;
  annualPrice: number;
  features: FeatureItem[];
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLAN_RANK: Record<PlanKey, number> = {
  silver: 1,
  gold: 2,
  platinum: 3,
};

const PLATINUM_VISUAL_DISCOUNT_PERCENT = 30;

function getPlanRank(plan?: string | null) {
  const key = String(plan || "silver").toLowerCase() as PlanKey;
  return PLAN_RANK[key] || 1;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function decodeJwt(token: string) {
  try {
    const b64 = token.split(".")[1];
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function syncLocal(url: string, payload: any) {
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error(`Local sync failed for ${url}:`, error);
  }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0);
}

function smartRound(value: number) {
  if (value >= 10000) return Math.round(value / 5000) * 5000;
  if (value >= 1000) return Math.round(value / 500) * 500;
  return Math.round(value / 50) * 50;
}

/**
 * Visual-only compare price.
 * Example: actual 55,000 shows as 80,000 struck-through + 55,000 actual.
 * This DOES NOT affect payment amount.
 */
function getOfferComparePrice(planKey: PlanKey, actualPrice: number) {
  if (planKey !== "platinum" || actualPrice <= 0) return actualPrice;

  const original = actualPrice / (1 - PLATINUM_VISUAL_DISCOUNT_PERCENT / 100);
  return smartRound(original);
}

export default function SubscriptionModal() {
  const { show, close } = useSubscriptionModal();

  const [authOpen, setAuthOpen] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("gold");

  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlanData = useMemo(() => {
    return plans.find((p) => p.key === selectedPlan) || null;
  }, [plans, selectedPlan]);

  /**
   * Actual payable amount from API pricing.
   * No visual discount is applied here.
   */
  const selectedAmount = useMemo(() => {
    if (!selectedPlanData) return 0;
    return billingCycle === "annual"
      ? selectedPlanData.annualPrice
      : selectedPlanData.monthlyPrice;
  }, [selectedPlanData, billingCycle]);

  const selectedCompareAmount = useMemo(() => {
    return getOfferComparePrice(selectedPlan, selectedAmount);
  }, [selectedPlan, selectedAmount]);

  const currentRank = useMemo(() => getPlanRank(currentPlan), [currentPlan]);
  const selectedRank = useMemo(() => getPlanRank(selectedPlan), [selectedPlan]);

  const isFreeTier = selectedAmount === 0;
  const isCurrentPlanSelected = currentPlan === selectedPlan;
  const isDowngrade = currentRank > selectedRank;
  const isUpgrade = selectedRank > currentRank;
  const isPlatinumVisualOffer =
    selectedPlan === "platinum" && selectedAmount > 0 && selectedCompareAmount > selectedAmount;

  const disablePayment =
    paying ||
    loading ||
    !selectedPlanData ||
    isFreeTier ||
    isCurrentPlanSelected ||
    isDowngrade;

  const selectionMessage = useMemo(() => {
    if (isDowngrade) {
      return "You already have a better plan. Switching to this plan would reduce your access.";
    }

    if (isCurrentPlanSelected && isFreeTier) {
      return "You are already on the free tier.";
    }

    if (isCurrentPlanSelected) {
      return "You are already on this plan.";
    }

    if (isFreeTier) {
      return "Silver is the free tier. No payment is required.";
    }

    if (selectedPlan === "platinum" && !isCurrentPlanSelected && !isDowngrade) {
      return "Platinum currently includes a special 30% OFF display offer for premium access.";
    }

    if (isUpgrade) {
      return "Upgrade your plan to unlock more access and premium features.";
    }

    return "Choose the plan that best fits your access needs.";
  }, [isDowngrade, isCurrentPlanSelected, isFreeTier, isUpgrade, selectedPlan]);

  async function loadModalData(userEmail: string | null) {
    setLoading(true);
    setError(null);

    try {
      const pricingRes = await fetch("https://raceautoindia.com/api/subscription", {
        method: "GET",
        cache: "no-store",
      });

      if (!pricingRes.ok) {
        throw new Error(`Pricing fetch failed: ${pricingRes.status}`);
      }

      const rawPricing = await pricingRes.json();

      void syncLocal("/api/subscription/sync-plans", {
        rows: rawPricing,
      });

      const transformedPlans = transformPricing(rawPricing);
      setPlans(transformedPlans);

      if (userEmail) {
        const myPlanRes = await fetch(
          `/api/my-plan?email=${encodeURIComponent(userEmail)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!myPlanRes.ok) {
          throw new Error(`Current plan fetch failed: ${myPlanRes.status}`);
        }

        const myPlanData = await myPlanRes.json();

        void syncLocal("/api/subscription/sync-current-plan", {
          email: userEmail,
          data: myPlanData,
        });

        const active = Array.isArray(myPlanData)
          ? myPlanData.find((item: any) => item.status === "Active")
          : null;

        if (active?.plan_name) {
          const normalizedPlan = String(active.plan_name).toLowerCase() as PlanKey;
          setCurrentPlan(normalizedPlan);

          if (["silver", "gold", "platinum"].includes(normalizedPlan)) {
            setSelectedPlan(normalizedPlan);
          }
        } else {
          setCurrentPlan("silver");
        }
      } else {
        setCurrentPlan("silver");
        setSelectedPlan("gold");
      }
    } catch (err: any) {
      console.error("Subscription modal load error:", err);
      setError(err?.message || "Unable to load subscription data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!show) return;

    const token = getCookie("authToken");

    if (!token) {
      setEmail(null);
      setCurrentPlan("silver");
      loadModalData(null);
      return;
    }

    const payload = decodeJwt(token);

    if (!payload?.email) {
      setEmail(null);
      setCurrentPlan("silver");
      loadModalData(null);
      return;
    }

    setEmail(payload.email);
    loadModalData(payload.email);
  }, [show]);

  async function handlePayNow() {
    if (isFreeTier) {
      setError("Silver is a free tier. No payment is required.");
      return;
    }

    if (isCurrentPlanSelected) {
      setError("You are already on this plan.");
      return;
    }

    if (isDowngrade) {
      setError("You already have a higher plan. Downgrade is not available here.");
      return;
    }

    if (!email) {
      close();
      setAuthOpen(true);
      return;
    }

    if (!selectedPlanData || !selectedAmount) {
      setError("Please select a valid plan.");
      return;
    }

    if (!window.Razorpay) {
      setError("Razorpay SDK not loaded.");
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const createRes = await fetch(
        "https://raceautoindia.com/api/subscription/create-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_email: email,
            AMT: selectedAmount, // actual amount only
          }),
        }
      );

      const createData = await createRes.json();

      if (!createRes.ok || !createData?.id) {
        throw new Error(createData?.message || "Unable to create payment order");
      }

      void syncLocal("/api/subscription/sync-payment-log", {
        email,
        plan_name: selectedPlan,
        duration: billingCycle,
        amount: selectedAmount,
        razorpay_order_id: createData.id,
        status: "created",
        message: "Order created in Auto India",
        request_payload: {
          customer_email: email,
          AMT: selectedAmount,
        },
        response_payload: createData,
      });

      const options = {
        key: createData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: selectedAmount * 100, // actual amount only
        currency: "INR",
        name: "Race Auto Analytics",
        description: `${selectedPlanData.title} - ${billingCycle}`,
        order_id: createData.id,
        prefill: {
          email,
        },
        notes: {
          email,
          plan: selectedPlan,
          duration: billingCycle,
          source: "raceautoanalytics",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(
              "https://raceautoindia.com/api/subscription/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  email,
                  plan: selectedPlan,
                  duration: billingCycle,
                }),
              }
            );

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData?.success) {
              throw new Error(verifyData?.message || "Payment verification failed");
            }

            await syncLocal("/api/subscription/sync-payment-log", {
              email,
              plan_name: selectedPlan,
              duration: billingCycle,
              amount: selectedAmount,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              status: "success",
              message: verifyData?.message || "Payment verified successfully",
              request_payload: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                plan: selectedPlan,
                duration: billingCycle,
              },
              response_payload: verifyData,
            });

            const latestPlanRes = await fetch(
              `/api/my-plan?email=${encodeURIComponent(email)}`,
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
              }
            );

            if (latestPlanRes.ok) {
              const latestPlanData = await latestPlanRes.json();

              await syncLocal("/api/subscription/sync-current-plan", {
                email,
                data: latestPlanData,
              });
            }

            close();
            window.location.reload();
          } catch (err: any) {
            console.error("Verify payment error:", err);

            await syncLocal("/api/subscription/sync-payment-log", {
              email,
              plan_name: selectedPlan,
              duration: billingCycle,
              amount: selectedAmount,
              razorpay_order_id: response?.razorpay_order_id || null,
              razorpay_payment_id: response?.razorpay_payment_id || null,
              status: "failed",
              message: err?.message || "Payment verification failed",
              request_payload: {
                razorpay_order_id: response?.razorpay_order_id || null,
                razorpay_payment_id: response?.razorpay_payment_id || null,
                plan: selectedPlan,
                duration: billingCycle,
              },
              response_payload: null,
            });

            setError(err?.message || "Payment verification failed");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          },
        },
        theme: {
          color: "#4F67FF",
        },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err: any) {
      console.error("Create payment error:", err);

      void syncLocal("/api/subscription/sync-payment-log", {
        email,
        plan_name: selectedPlan,
        duration: billingCycle,
        amount: selectedAmount,
        status: "failed",
        message: err?.message || "Unable to start payment",
        request_payload: {
          customer_email: email,
          AMT: selectedAmount,
        },
        response_payload: null,
      });

      setError(err?.message || "Unable to start payment");
      setPaying(false);
    }
  }

  if (!show) {
    return (
      <>
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        .sub-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
        }

        .sub-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .sub-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sub-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        .sub-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.55);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
        <div
          className="absolute inset-0 bg-[#050B1A]/80 backdrop-blur-[10px]"
          onClick={close}
        />

        <div className="relative z-10 flex h-[calc(100vh-1rem)] w-full max-w-[1100px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)] sm:h-[calc(100vh-2rem)]">
          <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[860px] -translate-x-1/2 rounded-full bg-[#4F67FF]/18 blur-3xl" />

          <div className="relative flex items-start justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Choose Your Subscription
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {email ? `Logged in as ${email}` : "Preview pricing. Login required only for checkout."}
              </p>
              <p className="mt-1 text-sm text-white/65">
                Current plan:{" "}
                <span className="font-medium text-[#FFD166]">
                  {(currentPlan || "silver").toUpperCase()}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1228]/95 px-4 py-3 backdrop-blur">
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={[
                  "h-10 rounded-xl px-5 text-sm font-semibold transition",
                  billingCycle === "monthly"
                    ? "bg-[#4F67FF] text-white"
                    : "text-white/70 hover:text-white",
                ].join(" ")}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={[
                  "h-10 rounded-xl px-5 text-sm font-semibold transition",
                  billingCycle === "annual"
                    ? "bg-[#4F67FF] text-white"
                    : "text-white/70 hover:text-white",
                ].join(" ")}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="sub-scroll flex-1 overflow-y-auto px-4 pb-4 pt-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
                Loading subscription plans...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {plans.map((plan) => {
                    const actualPrice =
                      billingCycle === "annual"
                        ? plan.annualPrice
                        : plan.monthlyPrice;

                    const comparePrice = getOfferComparePrice(plan.key, actualPrice);
                    const hasVisualOffer =
                      plan.key === "platinum" &&
                      actualPrice > 0 &&
                      comparePrice > actualPrice;

                    const isSelected = selectedPlan === plan.key;
                    const isCurrent = currentPlan === plan.key;

                    const planRank = getPlanRank(plan.key);
                    const currentPlanRank = getPlanRank(currentPlan);

                    let badgeText: string | null = null;
                    let badgeClass = "rounded-full px-3 py-1 text-xs font-semibold";

                    if (isCurrent) {
                      badgeText = "Current";
                      badgeClass += " bg-[#FFD166]/15 text-[#FFD166]";
                    } else if (actualPrice === 0) {
                      badgeText = "Free";
                      badgeClass += " bg-emerald-500/15 text-emerald-300";
                    } else if (hasVisualOffer) {
                      badgeText = "30% OFF";
                      badgeClass += " bg-pink-500/15 text-pink-300";
                    } else if (planRank > currentPlanRank) {
                      badgeText = "Upgrade";
                      badgeClass += " bg-blue-500/15 text-blue-300";
                    } else if (planRank < currentPlanRank) {
                      badgeText = "Lower Plan";
                      badgeClass += " bg-orange-500/15 text-orange-300";
                    }

                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedPlan(plan.key)}
                        className={[
                          "rounded-[18px] border p-3.5 text-left transition",
                          isSelected
                            ? "border-[#4F67FF] bg-[#4F67FF]/10 shadow-[0_12px_30px_rgba(79,103,255,0.18)]"
                            : "border-white/10 bg-white/5 hover:bg-white/[0.07]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {plan.title}
                          </h3>
                          {badgeText && <span className={badgeClass}>{badgeText}</span>}
                        </div>

                        <div className="mt-4">
                          {actualPrice === 0 ? (
                            <>
                              <div className="text-2xl sm:text-3xl font-bold text-white">
                                Free Tier
                              </div>
                              <div className="mt-1 text-sm text-white/60">
                                No payment required
                              </div>
                            </>
                          ) : hasVisualOffer ? (
                            <>
                              <div className="flex items-end gap-2">
                                <div className="text-2xl sm:text-3xl font-bold text-white">
                                  ₹{formatPrice(actualPrice)}
                                </div>
                                <div className="pb-1 text-sm text-white/40 line-through">
                                  ₹{formatPrice(comparePrice)}
                                </div>
                              </div>
                              <div className="mt-1 text-sm font-medium text-pink-300">
                                Platinum special display offer · Save 30%
                              </div>
                              <div className="mt-1 text-sm text-white/60">
                                per {billingCycle === "annual" ? "year" : "month"}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-2xl sm:text-3xl font-bold text-white">
                                ₹{formatPrice(actualPrice)}
                              </div>
                              <div className="mt-1 text-sm text-white/60">
                                per {billingCycle === "annual" ? "year" : "month"}
                              </div>
                            </>
                          )}
                        </div>

                        {hasVisualOffer && (
                          <div className="mt-3 rounded-xl border border-pink-400/20 bg-pink-500/10 px-3 py-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-pink-300">
                              Limited Offer
                            </div>
                            <div className="mt-1 text-sm text-white/85">
                              Get{" "}
                              <span className="font-semibold text-pink-300">
                                30% off
                              </span>{" "}
                              on the Platinum plan.
                            </div>
                          </div>
                        )}

                        <div className="sub-scroll mt-3 max-h-40 space-y-2.5 overflow-y-auto pr-1">
                          {plan.features.map((feature, index) => (
                            <div
                              key={`${plan.key}-${index}`}
                              className="flex items-start gap-3"
                            >
                              <CheckCircle2
                                size={16}
                                className="mt-[2px] shrink-0 text-[#22C55E]"
                              />
                              <div className="text-[13px] font-medium leading-5 text-white/85 sm:text-sm">
                                {feature.label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 mt-4 flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#0F1730]/95 p-3 backdrop-blur sm:flex-row sm:items-center">
                  <div>
                    <div className="text-sm text-white/60">Selected plan</div>

                    <div className="mt-1 text-base font-semibold text-white sm:text-lg">
                      {selectedPlanData?.title || "-"} ·{" "}
                      {isFreeTier ? (
                        "Free Tier"
                      ) : isPlatinumVisualOffer ? (
                        <>
                          ₹{formatPrice(selectedAmount)} /{" "}
                          {billingCycle === "annual" ? "year" : "month"}
                          <span className="ml-2 text-sm font-medium text-pink-300">
                            (30% OFF visual offer)
                          </span>
                        </>
                      ) : (
                        `₹${formatPrice(selectedAmount)} / ${
                          billingCycle === "annual" ? "year" : "month"
                        }`
                      )}
                    </div>

                    {!isFreeTier && isPlatinumVisualOffer && (
                      <div className="mt-1 text-sm text-white/45 line-through">
                        Display compare price: ₹{formatPrice(selectedCompareAmount)}
                      </div>
                    )}

                    <div
                      className={[
                        "mt-2 text-sm",
                        isDowngrade
                          ? "text-orange-300"
                          : isFreeTier
                          ? "text-emerald-300"
                          : isCurrentPlanSelected
                          ? "text-[#FFD166]"
                          : selectedPlan === "platinum"
                          ? "text-pink-300"
                          : "text-white/70",
                      ].join(" ")}
                    >
                      {selectionMessage}
                    </div>
                  </div>

                  {isFreeTier ? (
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">
                      Free Access
                    </div>
                  ) : isDowngrade ? (
                    <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 px-5 py-3 text-sm font-semibold text-orange-300">
                      Better Plan Active
                    </div>
                  ) : isCurrentPlanSelected ? (
                    <div className="rounded-xl border border-[#FFD166]/20 bg-[#FFD166]/10 px-5 py-3 text-sm font-semibold text-[#FFD166]">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePayNow}
                      disabled={disablePayment}
                      className="h-11 rounded-xl bg-[#4F67FF] px-5 font-semibold text-white shadow-[0_12px_30px_rgba(79,103,255,0.25)] transition hover:bg-[#3B55FF] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {paying ? "Processing..." : "Pay Now"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false);
        }}
      />
    </>
  );
}