"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import AuthModal from "@/app/flash-reports/components/Login/LoginModal";
import { useSubscriptionModal } from "@/utils/SubscriptionModalContext";
import transformPricing from "./transformPricing";

type BillingCycle = "monthly" | "annual";
type PlanKey = "bronze" | "silver" | "gold" | "platinum";
type CurrencyMode = "INR" | "USD";

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

const USD_RATE = 90.2;

const VISUAL_DISCOUNT_PERCENT: Partial<Record<PlanKey, number>> = {
  gold: 50,
  platinum: 67,
};

function getPlanRank(plan?: string | null) {
  const key = String(plan || "").toLowerCase();

  if (key === "bronze") return 1;
  if (key === "silver") return 2;
  if (key === "gold") return 3;
  if (key === "platinum") return 4;

  return 0;
}

function normalizePlanKey(plan?: string | null): PlanKey | null {
  const key = String(plan || "").toLowerCase();
  if (
    key === "bronze" ||
    key === "silver" ||
    key === "gold" ||
    key === "platinum"
  ) {
    return key;
  }
  return null;
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

function smartRound(value: number) {
  if (value >= 100000) return Math.round(value / 5000) * 5000;
  if (value >= 10000) return Math.round(value / 1000) * 1000;
  if (value >= 1000) return Math.round(value / 500) * 500;
  return Math.round(value / 50) * 50;
}

function convertPrice(value: number, currencyMode: CurrencyMode) {
  if (!value || value <= 0) return 0;
  return currencyMode === "USD" ? value / USD_RATE : value;
}

function formatDisplayPrice(value: number, currencyMode: CurrencyMode) {
  const converted = convertPrice(value, currencyMode);

  if (currencyMode === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: converted >= 100 ? 0 : 2,
    }).format(converted);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(converted);
}

function getOfferComparePrice(planKey: PlanKey, actualPrice: number) {
  const discountPercent = VISUAL_DISCOUNT_PERCENT[planKey];

  if (!discountPercent || actualPrice <= 0) return actualPrice;

  const original = actualPrice / (1 - discountPercent / 100);
  return smartRound(original);
}

function getPlanOfferPercent(planKey: PlanKey) {
  return VISUAL_DISCOUNT_PERCENT[planKey] || 0;
}

function getPlanAccent(planKey: PlanKey) {
  if (planKey === "bronze") return "from-amber-500/18 to-orange-500/8";
  if (planKey === "silver") return "from-slate-200/10 to-slate-400/5";
  if (planKey === "gold") return "from-violet-500/12 to-fuchsia-500/10";
  return "from-pink-500/12 to-violet-500/10";
}

function getPlanStatus(
  currentPlan: PlanKey | null,
  planKey: PlanKey
): "current" | "included" | "upgrade" | "buy" {
  const currentRank = getPlanRank(currentPlan);
  const viewedRank = getPlanRank(planKey);

  if (currentRank === 0) return "buy";
  if (currentRank === viewedRank) return "current";
  if (currentRank > viewedRank) return "included";
  return "upgrade";
}

function getPlanBadge(
  planKey: PlanKey,
  status: "current" | "included" | "upgrade" | "buy"
) {
  if (status === "current") {
    return {
      text: "Current",
      className: "bg-[#FFD166]/15 text-[#FFD166]",
    };
  }

  if (status === "included") {
    return {
      text: "Included",
      className: "bg-orange-500/15 text-orange-300",
    };
  }

  if (status === "upgrade") {
    return {
      text: "Upgrade",
      className: "bg-blue-500/15 text-blue-300",
    };
  }

  if (planKey === "bronze") {
    return {
      text: "Starter",
      className: "bg-amber-500/15 text-amber-300",
    };
  }

  if (planKey === "platinum") {
    return {
      text: "Premium",
      className: "bg-pink-500/15 text-pink-300",
    };
  }

  return {
    text: "Paid Plan",
    className: "bg-white/10 text-white/75",
  };
}

function getCardActionText(
  status: "current" | "included" | "upgrade" | "buy"
) {
  if (status === "current") return "Current Plan";
  if (status === "included") return "Included in Your Plan";
  if (status === "upgrade") return "Upgrade Plan";
  return "Choose Plan";
}

function getSelectedCardClasses(
  isSelected: boolean,
  status: "current" | "included" | "upgrade" | "buy"
) {
  if (!isSelected) {
    return "border-white/10 bg-white/5 hover:bg-white/[0.07]";
  }

  if (status === "current") {
    return "border-[#FFD166] bg-[#FFD166]/10 shadow-[0_12px_30px_rgba(255,209,102,0.16)]";
  }

  if (status === "included") {
    return "border-orange-400/50 bg-orange-500/10 shadow-[0_12px_30px_rgba(249,115,22,0.16)]";
  }

  if (status === "upgrade") {
    return "border-blue-400/50 bg-blue-500/10 shadow-[0_12px_30px_rgba(59,130,246,0.16)]";
  }

  return "border-[#4F67FF] bg-[#4F67FF]/10 shadow-[0_12px_30px_rgba(79,103,255,0.18)]";
}

function getFooterCtaText(
  currentPlan: PlanKey | null,
  selectedPlan: PlanKey,
  paying: boolean
) {
  if (paying) return "Processing...";

  const status = getPlanStatus(currentPlan, selectedPlan);

  if (status === "upgrade") return "Upgrade Plan";
  if (status === "buy") return "Continue to Payment";
  if (status === "current") return "Current Plan";
  return "Included in Your Plan";
}

export default function SubscriptionModal() {
  const { show, close } = useSubscriptionModal();

  const [authOpen, setAuthOpen] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("bronze");
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("INR");

  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlanData = useMemo(() => {
    return plans.find((p) => p.key === selectedPlan) || null;
  }, [plans, selectedPlan]);

  const selectedAmount = useMemo(() => {
    if (!selectedPlanData) return 0;
    return billingCycle === "annual"
      ? selectedPlanData.annualPrice
      : selectedPlanData.monthlyPrice;
  }, [selectedPlanData, billingCycle]);

  const selectedCompareAmount = useMemo(() => {
    return getOfferComparePrice(selectedPlan, selectedAmount);
  }, [selectedPlan, selectedAmount]);

  const selectedOfferPercent = useMemo(() => {
    return getPlanOfferPercent(selectedPlan);
  }, [selectedPlan]);

  const currentRank = useMemo(() => getPlanRank(currentPlan), [currentPlan]);
  const selectedRank = useMemo(() => getPlanRank(selectedPlan), [selectedPlan]);

  const isPriceUnavailable = selectedAmount === 0;
  const isCurrentPlanSelected = currentPlan === selectedPlan;
  const isDowngrade = currentRank > 0 && currentRank > selectedRank;
  const isUpgrade = currentRank > 0 && selectedRank > currentRank;
  const isVisualOfferPlan =
    selectedOfferPercent > 0 &&
    selectedAmount > 0 &&
    selectedCompareAmount > selectedAmount;

  const disablePayment =
    paying ||
    loading ||
    !selectedPlanData ||
    isPriceUnavailable ||
    isCurrentPlanSelected ||
    isDowngrade;

  const selectionMessage = useMemo(() => {
    if (isDowngrade) {
      return "You already have a better plan. This lower plan is already covered by your current access.";
    }

    if (isCurrentPlanSelected) {
      return "You are already on this plan.";
    }

    if (isPriceUnavailable) {
      return "Pricing is not available for this plan right now.";
    }

    if (selectedOfferPercent > 0 && !isCurrentPlanSelected && !isDowngrade) {
      return `${selectedPlanData?.title || "This plan"} currently includes a special ${selectedOfferPercent}% OFF display offer.`;
    }

    if (isUpgrade) {
      return "Upgrade your plan to unlock more access and premium features.";
    }

    if (!currentPlan) {
      return "Choose a paid plan to activate your subscription.";
    }

    return "Choose the plan that best fits your access needs.";
  }, [
    isDowngrade,
    isCurrentPlanSelected,
    isPriceUnavailable,
    isUpgrade,
    selectedOfferPercent,
    selectedPlanData,
    currentPlan,
  ]);

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

        const normalizedPlan = normalizePlanKey(active?.plan_name);

        if (normalizedPlan) {
          setCurrentPlan(normalizedPlan);
          setSelectedPlan(normalizedPlan);
        } else {
          setCurrentPlan(null);
          setSelectedPlan("bronze");
        }
      } else {
        setCurrentPlan(null);
        setSelectedPlan("bronze");
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
      setCurrentPlan(null);
      loadModalData(null);
      return;
    }

    const payload = decodeJwt(token);

    if (!payload?.email) {
      setEmail(null);
      setCurrentPlan(null);
      loadModalData(null);
      return;
    }

    setEmail(payload.email);
    loadModalData(payload.email);
  }, [show]);

  async function handlePayNow() {
    if (isPriceUnavailable) {
      setError("Pricing is not available for this plan.");
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
            AMT: selectedAmount,
          }),
        }
      );

      const createData = await createRes.json();
console.log("create-payment response:", createData);

const razorpayOrderId = createData?.id || createData?.order_id || null;
const razorpayKey =
  createData?.key_id ||
  createData?.key ||
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
  null;
const razorpayAmount = Number(createData?.amount || selectedAmount * 100);
const razorpayCurrency = createData?.currency || "INR";

if (!createRes.ok) {
  throw new Error(createData?.message || `Create payment failed: ${createRes.status}`);
}

if (!razorpayKey) {
  throw new Error("Missing Razorpay key from create-payment response");
}

if (!razorpayOrderId || !String(razorpayOrderId).startsWith("order_")) {
  throw new Error("Invalid Razorpay order id returned from create-payment");
}

if (!Number.isFinite(razorpayAmount) || razorpayAmount <= 0) {
  throw new Error("Invalid Razorpay amount returned from create-payment");
}

void syncLocal("/api/subscription/sync-payment-log", {
  email,
  plan_name: selectedPlan,
  duration: billingCycle,
  amount: selectedAmount,
  amount_display_currency: currencyMode,
  razorpay_order_id: razorpayOrderId,
  status: "created",
  message: "Order created in Auto India",
  request_payload: {
    customer_email: email,
    AMT: selectedAmount,
    currency_display: currencyMode,
  },
  response_payload: createData,
});

const options = {
  key: razorpayKey,
  amount: razorpayAmount,
  currency: razorpayCurrency,
  name: "Race Auto Analytics",
  description: `${selectedPlanData.title} - ${billingCycle}`,
  order_id: razorpayOrderId,
        prefill: {
          email,
        },
        notes: {
          email,
          plan: selectedPlan,
          duration: billingCycle,
          source: "raceautoanalytics",
          display_currency: currencyMode,
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
              amount_display_currency: currencyMode,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              status: "success",
              message: verifyData?.message || "Payment verified successfully",
              request_payload: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                plan: selectedPlan,
                duration: billingCycle,
                currency_display: currencyMode,
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
              amount_display_currency: currencyMode,
              razorpay_order_id: response?.razorpay_order_id || null,
              razorpay_payment_id: response?.razorpay_payment_id || null,
              status: "failed",
              message: err?.message || "Payment verification failed",
              request_payload: {
                razorpay_order_id: response?.razorpay_order_id || null,
                razorpay_payment_id: response?.razorpay_payment_id || null,
                plan: selectedPlan,
                duration: billingCycle,
                currency_display: currencyMode,
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
        amount_display_currency: currencyMode,
        status: "failed",
        message: err?.message || "Unable to start payment",
        request_payload: {
          customer_email: email,
          AMT: selectedAmount,
          currency_display: currencyMode,
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

        <div className="relative z-10 flex h-[calc(100vh-1rem)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)] sm:h-[calc(100vh-2rem)]">
          <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[860px] -translate-x-1/2 rounded-full bg-[#4F67FF]/18 blur-3xl" />

          <div className="relative flex items-start justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Choose Your Subscription
              </h2>
              <p className="mt-1 text-sm text-white/65">
                {email
                  ? `Logged in as ${email}`
                  : "Preview pricing. Login required only for checkout."}
              </p>
              <p className="mt-1 text-sm text-white/65">
                Current plan:{" "}
                <span className="font-medium text-[#FFD166]">
                  {(currentPlan || "none").toUpperCase()}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setCurrencyMode("INR")}
                  className={[
                    "h-10 rounded-xl px-5 text-sm font-semibold transition",
                    currencyMode === "INR"
                      ? "bg-[#14B8A6] text-white"
                      : "text-white/70 hover:text-white",
                  ].join(" ")}
                >
                  INR
                </button>

                <button
                  type="button"
                  onClick={() => setCurrencyMode("USD")}
                  className={[
                    "h-10 rounded-xl px-5 text-sm font-semibold transition",
                    currencyMode === "USD"
                      ? "bg-[#14B8A6] text-white"
                      : "text-white/70 hover:text-white",
                  ].join(" ")}
                >
                  USD
                </button>
              </div>
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {plans.map((plan) => {
                    const actualPrice =
                      billingCycle === "annual"
                        ? plan.annualPrice
                        : plan.monthlyPrice;

                    const comparePrice = getOfferComparePrice(plan.key, actualPrice);
                    const offerPercent = getPlanOfferPercent(plan.key);
                    const hasVisualOffer =
                      offerPercent > 0 &&
                      actualPrice > 0 &&
                      comparePrice > actualPrice;

                    const isSelected = selectedPlan === plan.key;
                    const planStatus = getPlanStatus(currentPlan, plan.key);
                    const badge = getPlanBadge(plan.key, planStatus);

                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setSelectedPlan(plan.key)}
                        className={[
                          "relative min-h-[420px] overflow-hidden rounded-[18px] border p-3 text-left transition xl:min-h-[440px]",
                          getSelectedCardClasses(isSelected, planStatus),
                        ].join(" ")}
                      >
                        <div
                          className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${getPlanAccent(
                            plan.key
                          )}`}
                        />

                        <div className="relative flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-white sm:text-lg">
                            {plan.title}
                          </h3>
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-[11px] font-semibold",
                              badge.className,
                            ].join(" ")}
                          >
                            {badge.text}
                          </span>
                        </div>

                        <div className="mt-4">
                          {hasVisualOffer ? (
                            <>
                              <div className="flex items-end gap-2">
                                <div className="text-xl font-bold text-white sm:text-2xl xl:text-[1.7rem]">
                                  {formatDisplayPrice(actualPrice, currencyMode)}
                                </div>
                                <div className="pb-1 text-sm text-white/40 line-through">
                                  {formatDisplayPrice(comparePrice, currencyMode)}
                                </div>
                              </div>
                              <div
                                className={[
                                  "mt-1 text-sm font-medium",
                                  plan.key === "platinum"
                                    ? "text-pink-300"
                                    : "text-violet-300",
                                ].join(" ")}
                              >
                                {plan.title} special display offer · Save {offerPercent}%
                              </div>
                              <div className="mt-1 text-sm text-white/60">
                                per {billingCycle === "annual" ? "year" : "month"}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xl font-bold text-white sm:text-2xl xl:text-[1.7rem]">
                                {actualPrice > 0
                                  ? formatDisplayPrice(actualPrice, currencyMode)
                                  : "Price unavailable"}
                              </div>
                              <div className="mt-1 text-sm text-white/60">
                                {actualPrice > 0
                                  ? `per ${billingCycle === "annual" ? "year" : "month"}`
                                  : "Contact support or update plan pricing"}
                              </div>
                            </>
                          )}
                        </div>

                        {hasVisualOffer && (
                          <div
                            className={[
                              "mt-2.5 rounded-xl border px-3 py-2",
                              plan.key === "platinum"
                                ? "border-pink-400/20 bg-pink-500/10"
                                : "border-violet-400/20 bg-violet-500/10",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "text-xs font-semibold uppercase tracking-wide",
                                plan.key === "platinum"
                                  ? "text-pink-300"
                                  : "text-violet-300",
                              ].join(" ")}
                            >
                              Limited Offer
                            </div>
                            <div className="mt-1 text-sm text-white/85">
                              Get{" "}
                              <span
                                className={[
                                  "font-semibold",
                                  plan.key === "platinum"
                                    ? "text-pink-300"
                                    : "text-violet-300",
                                ].join(" ")}
                              >
                                {offerPercent}% off
                              </span>{" "}
                              on the {plan.title} plan.
                            </div>
                          </div>
                        )}

                        <div className="sub-scroll mt-2.5 max-h-28 space-y-1.5 overflow-y-auto pr-1 xl:max-h-32">
                          {plan.features.map((feature, index) => (
                            <div
                              key={`${plan.key}-${index}`}
                              className="flex items-start gap-3"
                            >
                              <CheckCircle2
                                size={16}
                                className="mt-[2px] shrink-0 text-[#22C55E]"
                              />
                              <div className="text-[12px] font-medium leading-[1.3rem] text-white/85 sm:text-[13px]">
                                {feature.label}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wide text-white/45">
                              Action
                            </div>

                            {isSelected && (
                              <span
                                className={[
                                  "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                  planStatus === "current"
                                    ? "bg-[#FFD166]/15 text-[#FFD166]"
                                    : planStatus === "included"
                                    ? "bg-orange-500/15 text-orange-300"
                                    : planStatus === "upgrade"
                                    ? "bg-blue-500/15 text-blue-300"
                                    : "bg-[#4F67FF]/15 text-[#9FB0FF]",
                                ].join(" ")}
                              >
                                Selected
                              </span>
                            )}
                          </div>

                          <div
                            className={[
                              "mt-1 text-sm font-semibold",
                              planStatus === "current"
                                ? "text-[#FFD166]"
                                : planStatus === "included"
                                ? "text-orange-300"
                                : planStatus === "upgrade"
                                ? "text-blue-300"
                                : plan.key === "bronze"
                                ? "text-amber-300"
                                : "text-white",
                            ].join(" ")}
                          >
                            {getCardActionText(planStatus)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="sticky bottom-0 mt-3 flex flex-col items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[#0F1730]/95 p-3 backdrop-blur sm:flex-row sm:items-center">
                  <div>
                    <div className="text-sm text-white/60">Selected plan</div>

                    <div className="mt-1 text-base font-semibold text-white sm:text-lg">
                      {selectedPlanData?.title || "-"} ·{" "}
                      {isPriceUnavailable ? (
                        "Price unavailable"
                      ) : isVisualOfferPlan ? (
                        <>
                          {formatDisplayPrice(selectedAmount, currencyMode)} /{" "}
                          {billingCycle === "annual" ? "year" : "month"}
                          <span
                            className={[
                              "ml-2 text-sm font-medium",
                              selectedPlan === "platinum"
                                ? "text-pink-300"
                                : selectedPlan === "gold"
                                ? "text-violet-300"
                                : selectedPlan === "bronze"
                                ? "text-amber-300"
                                : "text-white/70",
                            ].join(" ")}
                          >
                            ({selectedOfferPercent}% OFF visual offer)
                          </span>
                        </>
                      ) : (
                        `${formatDisplayPrice(selectedAmount, currencyMode)} / ${
                          billingCycle === "annual" ? "year" : "month"
                        }`
                      )}
                    </div>

                    {!isPriceUnavailable && isVisualOfferPlan && (
                      <div className="mt-1 text-sm text-white/45 line-through">
                        Display compare price:{" "}
                        {formatDisplayPrice(selectedCompareAmount, currencyMode)}
                      </div>
                    )}

                    {currencyMode === "USD" && !isPriceUnavailable && (
                      <div className="mt-1 text-xs text-white/45">
                        USD is display-only using 1 USD = ₹{USD_RATE}. Checkout remains in INR.
                      </div>
                    )}

                    <div
                      className={[
                        "mt-2 text-sm",
                        isDowngrade
                          ? "text-orange-300"
                          : isPriceUnavailable
                          ? "text-red-300"
                          : isCurrentPlanSelected
                          ? "text-[#FFD166]"
                          : selectedPlan === "platinum"
                          ? "text-pink-300"
                          : selectedPlan === "gold"
                          ? "text-violet-300"
                          : selectedPlan === "bronze"
                          ? "text-amber-300"
                          : "text-white/70",
                      ].join(" ")}
                    >
                      {selectionMessage}
                    </div>
                  </div>

                  {isPriceUnavailable ? (
                    <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300">
                      Price Unavailable
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
                      {getFooterCtaText(currentPlan, selectedPlan, paying)}
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