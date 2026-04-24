"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthModal from "@/app/flash-reports/components/Login/LoginModal";
import { useSubscriptionModal } from "@/utils/SubscriptionModalContext";
import transformPricing from "./transformPricing";
import { formatPlanLabelOrFallback } from "@/lib/planLabels";

type BillingCycle = "monthly" | "annual";
type PlanKey = "bronze" | "silver" | "gold" | "platinum";
type PlanCategory = "individual" | "business";
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

function parseDateMs(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function isActiveAndNotExpired(item: any): boolean {
  const status = String(item?.status || "").trim().toLowerCase();
  if (status !== "active") return false;
  const endMs = parseDateMs(item?.end_date ?? item?.endDate);
  if (endMs == null) return false;
  return endMs >= Date.now();
}

function getCategoryFromPlan(plan?: PlanKey | null): PlanCategory {
  if (plan === "gold" || plan === "platinum") return "business";
  return "individual";
}

function isPlanDisabledByCategory(
  planKey: PlanKey,
  categoryView: PlanCategory
) {
  if (categoryView === "individual") {
    return planKey === "gold" || planKey === "platinum";
  }

  return planKey === "bronze" || planKey === "silver";
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function getRazorpayKeyMode(key?: string | null): "test" | "live" | "unknown" {
  const value = String(key || "").trim();
  if (value.startsWith("rzp_test_")) return "test";
  if (value.startsWith("rzp_live_")) return "live";
  return "unknown";
}

function extractCheckoutKeyFromCreatePaymentResponse(data: any): string {
  const candidates = [
    data?.key_id,
    data?.key,
    data?.razorpay_key_id,
    data?.razorpayKeyId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
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
    text: "Best Choice",
    className: "bg-white/10 text-white/75",
  };
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

function getDisabledViewText(categoryView: PlanCategory) {
  return categoryView === "individual"
    ? "Available in Business View"
    : "Available in Individual View";
}

function getCardCtaLabel(args: {
  isCategoryDisabled: boolean;
  categoryView: PlanCategory;
  isCurrent: boolean;
  isIncluded: boolean;
  isUpgrade: boolean;
  isPriceUnavailable: boolean;
}) {
  if (args.isCategoryDisabled) return getDisabledViewText(args.categoryView);
  if (args.isPriceUnavailable) return "Price Unavailable";
  if (args.isCurrent) return "Current Plan";
  if (args.isIncluded) return "Included in Your Plan";
  if (args.isUpgrade) return "Upgrade Plan";
  return "Buy Now";
}

type SubscriptionModalProps = {
  mode?: "modal" | "page";
};

type CheckoutIntent = {
  planKey: PlanKey;
  planTitle: string;
  amount: number;
};

export default function SubscriptionModal({ mode = "modal" }: SubscriptionModalProps) {
  const { show, close } = useSubscriptionModal() as {
    show: boolean;
    close: () => void;
  };
  const router = useRouter();
  const isPage = mode === "page";
  const visible = isPage || show;

  const [authOpen, setAuthOpen] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanKey | null>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("bronze");
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("INR");
  const [categoryView, setCategoryView] = useState<PlanCategory>("individual");

  const [loading, setLoading] = useState(false);
  const [payingPlan, setPayingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkoutIntent, setCheckoutIntent] = useState<CheckoutIntent | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [enterpriseSending, setEnterpriseSending] = useState(false);
  const [enterpriseMessage, setEnterpriseMessage] = useState<string | null>(null);
  const [enterpriseError, setEnterpriseError] = useState<string | null>(null);
  const [enterprisePlanContext, setEnterprisePlanContext] = useState<PlanCategory>("individual");
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    requirement: "",
  });

  const visiblePlans = useMemo(
    () =>
      plans.filter((plan) =>
        categoryView === "individual"
          ? plan.key === "bronze" || plan.key === "silver"
          : plan.key === "gold" || plan.key === "platinum",
      ),
    [plans, categoryView],
  );

  const closePlans = () => {
    if (isPage) {
      router.push("/");
      return;
    }
    close();
  };

  const categoryTitle =
    categoryView === "individual"
      ? "Individual Category"
      : "Business / Enterprise Category";

  const categoryDescription =
    categoryView === "individual"
      ? "Choose between Individual Basic and Individual Pro plans."
      : "Choose between Business and Business Pro, or contact us for a custom plan.";

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
          ? myPlanData.find((item: any) => isActiveAndNotExpired(item))
          : null;

        const normalizedPlan = normalizePlanKey(active?.plan_name);

        if (normalizedPlan) {
          setCurrentPlan(normalizedPlan);
          setCategoryView(getCategoryFromPlan(normalizedPlan));
          setSelectedPlan(normalizedPlan);
        } else {
          setCurrentPlan(null);
          setCategoryView("individual");
          setSelectedPlan("bronze");
        }
      } else {
        setCurrentPlan(null);
        setCategoryView("individual");
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
    if (!visible) return;

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
  }, [visible]);

  useEffect(() => {
    setEnterpriseMessage(null);
    setEnterpriseError(null);

    const selectedDisabled = isPlanDisabledByCategory(selectedPlan, categoryView);

    if (!selectedDisabled) return;

    if (categoryView === "individual") {
      setSelectedPlan("bronze");
    } else {
      setSelectedPlan("gold");
    }
  }, [categoryView, selectedPlan]);

  async function handlePayNow(planToPay: PlanKey) {
    setSelectedPlan(planToPay);

    const chosenPlan = plans.find((p) => p.key === planToPay);

    if (!chosenPlan) {
      setError("Please select a valid plan.");
      return;
    }

    const chosenAmount =
      billingCycle === "annual" ? chosenPlan.annualPrice : chosenPlan.monthlyPrice;

    const isCategoryDisabled = isPlanDisabledByCategory(planToPay, categoryView);
    const chosenRank = getPlanRank(planToPay);
    const currentRank = getPlanRank(currentPlan);
    const isChosenCurrent = currentPlan === planToPay;
    const isChosenIncluded = currentRank > 0 && currentRank > chosenRank;
    const isChosenPriceUnavailable = chosenAmount === 0;

    if (isCategoryDisabled) {
      setError(
        categoryView === "individual"
          ? "This plan is disabled in Individual view. Switch to Business view."
          : "This plan is disabled in Business view. Switch to Individuals view."
      );
      return;
    }

    if (isChosenPriceUnavailable) {
      setError("Pricing is not available for this plan.");
      return;
    }

    if (isChosenCurrent) {
      setError("You are already on this plan.");
      return;
    }

    if (isChosenIncluded) {
      setError("This lower plan is already covered by your current access.");
      return;
    }

    if (!email) {
      if (!isPage) close();
      setAuthOpen(true);
      return;
    }

    if (!window.Razorpay) {
      setError("Razorpay SDK not loaded.");
      return;
    }

    setCheckoutIntent(null);
    setAgreedToTerms(false);
    setPayingPlan(planToPay);
    setError(null);

    try {
      const createRes = await fetch(
        "/api/subscription/create-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_email: email,
            AMT: chosenAmount,
          }),
        }
      );

      const createData = await createRes.json();

      if (!createRes.ok || !createData?.id) {
        throw new Error(
          createData?.error?.description ||
            createData?.message ||
            "Unable to create payment order"
        );
      }

      if (typeof createData.id !== "string" || !createData.id.startsWith("order_")) {
        throw new Error("Invalid Razorpay order id returned by payment API.");
      }

      const envKeyId =
        typeof process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === "string"
          ? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.trim()
          : "";
      const responseKeyId = extractCheckoutKeyFromCreatePaymentResponse(createData);

      if (!responseKeyId && !envKeyId) {
        throw new Error("Missing Razorpay key configuration for checkout.");
      }

      const responseMode = getRazorpayKeyMode(responseKeyId);
      const envMode = getRazorpayKeyMode(envKeyId);
      if (
        responseKeyId &&
        envKeyId &&
        responseMode !== "unknown" &&
        envMode !== "unknown" &&
        responseMode !== envMode
      ) {
        console.error("Razorpay mode mismatch detected", {
          orderId: createData.id,
          responseKeyMode: responseMode,
          envKeyMode: envMode,
        });
        throw new Error(
          "Razorpay environment mismatch (test/live). Please align backend and frontend Razorpay keys."
        );
      }

      if (!responseKeyId && envKeyId) {
        const envMode = getRazorpayKeyMode(envKeyId);
        if (envMode === "test") {
          throw new Error(
            "Unable to start Razorpay test checkout. Please ensure create-payment returns a matching test key_id.",
          );
        }
        console.warn("Razorpay create-payment did not return a checkout key; falling back to env key.");
      }

      const checkoutKey = responseKeyId || envKeyId;
      console.info("Razorpay checkout init", {
        orderId: createData.id,
        keyMode: getRazorpayKeyMode(checkoutKey),
      });

      void syncLocal("/api/subscription/sync-payment-log", {
        email,
        plan_name: planToPay,
        duration: billingCycle,
        amount: chosenAmount,
        amount_display_currency: currencyMode,
        razorpay_order_id: createData.id,
        status: "created",
        message: "Order created in Race Auto Analytics",
        request_payload: {
          customer_email: email,
          AMT: chosenAmount,
          currency_display: currencyMode,
        },
        response_payload: createData,
      });

      const options = {
        key: checkoutKey,
        amount: chosenAmount * 100,
        currency: "INR",
        name: "Race Auto Analytics",
        description: `${chosenPlan.title} - ${billingCycle}`,
        order_id: createData.id,
        prefill: {
          email,
        },
        notes: {
          email,
          plan: planToPay,
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
                  plan: planToPay,
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
              plan_name: planToPay,
              duration: billingCycle,
              amount: chosenAmount,
              amount_display_currency: currencyMode,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              status: "success",
              message: verifyData?.message || "Payment verified successfully",
              request_payload: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                plan: planToPay,
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
                triggerPurchaseEmail: true,
              });
            }

            if (!isPage) close();
            router.push(
              `/subscription/success?plan=${encodeURIComponent(planToPay)}&cycle=${encodeURIComponent(
                billingCycle,
              )}&amount=${encodeURIComponent(String(chosenAmount))}&currency=INR&orderId=${encodeURIComponent(
                String(response?.razorpay_order_id || ""),
              )}&paymentId=${encodeURIComponent(
                String(response?.razorpay_payment_id || ""),
              )}`,
            );
          } catch (err: any) {
            console.error("Verify payment error:", err);

            await syncLocal("/api/subscription/sync-payment-log", {
              email,
              plan_name: planToPay,
              duration: billingCycle,
              amount: chosenAmount,
              amount_display_currency: currencyMode,
              razorpay_order_id: response?.razorpay_order_id || null,
              razorpay_payment_id: response?.razorpay_payment_id || null,
              status: "failed",
              message: err?.message || "Payment verification failed",
              request_payload: {
                razorpay_order_id: response?.razorpay_order_id || null,
                razorpay_payment_id: response?.razorpay_payment_id || null,
                plan: planToPay,
                duration: billingCycle,
                currency_display: currencyMode,
              },
              response_payload: null,
            });

            const failureMessage = err?.message || "Payment verification failed";
            setError(failureMessage);
            router.push(
              `/subscription/failure?reason=${encodeURIComponent(
                failureMessage,
              )}&orderId=${encodeURIComponent(
                String(response?.razorpay_order_id || ""),
              )}&paymentId=${encodeURIComponent(
                String(response?.razorpay_payment_id || ""),
              )}`,
            );
          } finally {
            setPayingPlan(null);
          }
        },
        modal: {
          ondismiss: function () {
            setPayingPlan(null);
            router.push(
              `/subscription/failure?reason=Checkout%20cancelled&orderId=${encodeURIComponent(
                String(createData?.id || ""),
              )}`,
            );
          },
        },
        theme: {
          color: "#4F67FF",
        },
      };

      const rz = new window.Razorpay(options);
      rz.on("payment.failed", (failure: any) => {
        const failureMessage =
          failure?.error?.description || "We couldn't complete your payment. Please try again.";
        const failureOrderId = failure?.error?.metadata?.order_id || createData?.id || "";
        const failurePaymentId = failure?.error?.metadata?.payment_id || "";
        setPayingPlan(null);
        setError(failureMessage);
        router.push(
          `/subscription/failure?reason=${encodeURIComponent(
            failureMessage,
          )}&orderId=${encodeURIComponent(
            String(failureOrderId),
          )}&paymentId=${encodeURIComponent(String(failurePaymentId))}`,
        );
      });
      rz.open();
    } catch (err: any) {
      console.error("Create payment error:", err);

      void syncLocal("/api/subscription/sync-payment-log", {
        email,
        plan_name: planToPay,
        duration: billingCycle,
        amount: chosenAmount,
        amount_display_currency: currencyMode,
        status: "failed",
        message: err?.message || "Unable to start payment",
        request_payload: {
          customer_email: email,
          AMT: chosenAmount,
          currency_display: currencyMode,
        },
        response_payload: null,
      });

      setError(err?.message || "Unable to start payment");
      setPayingPlan(null);
    }
  }

  function requestCheckout(planToPay: PlanKey) {
    const chosenPlan = plans.find((p) => p.key === planToPay);
    if (!chosenPlan) {
      setError("Please select a valid plan.");
      return;
    }

    const chosenAmount =
      billingCycle === "annual" ? chosenPlan.annualPrice : chosenPlan.monthlyPrice;
    const chosenRank = getPlanRank(planToPay);
    const currentRank = getPlanRank(currentPlan);
    const isChosenCurrent = currentPlan === planToPay;
    const isChosenIncluded = currentRank > 0 && currentRank > chosenRank;
    const isChosenPriceUnavailable = chosenAmount === 0;

    if (isChosenPriceUnavailable) {
      setError("Pricing is not available for this plan.");
      return;
    }
    if (isChosenCurrent) {
      setError("You are already on this plan.");
      return;
    }
    if (isChosenIncluded) {
      setError("This lower plan is already covered by your current access.");
      return;
    }

    setSelectedPlan(planToPay);
    setAgreedToTerms(false);
    setCheckoutIntent({
      planKey: planToPay,
      planTitle: chosenPlan.title,
      amount: chosenAmount,
    });
  }

  async function submitEnterpriseInquiry() {
    if (
      !enterpriseForm.name.trim() ||
      !enterpriseForm.email.trim() ||
      !enterpriseForm.phone.trim() ||
      !enterpriseForm.company.trim() ||
      !enterpriseForm.requirement.trim()
    ) {
      setEnterpriseError("Please complete all required fields.");
      setEnterpriseMessage(null);
      return;
    }

    setEnterpriseSending(true);
    setEnterpriseError(null);
    setEnterpriseMessage(null);

    try {
      const res = await fetch("/api/subscription/enterprise-inquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...enterpriseForm,
          planType:
            enterprisePlanContext === "business"
              ? "Business Custom Plan"
              : "Individual Custom Plan",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Unable to submit inquiry.");
      }
      setEnterpriseMessage("Thank you. Our sales team will contact you shortly.");
      setEnterpriseForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        requirement: "",
      });
    } catch (err: any) {
      setEnterpriseError(err?.message || "Unable to submit inquiry.");
    } finally {
      setEnterpriseSending(false);
    }
  }

  if (!visible) {
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

      <div
        className={
          isPage
            ? "min-h-screen bg-[#050B1A] px-3 py-6 sm:px-6 sm:py-10"
            : "fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4"
        }
      >
        {!isPage && (
          <div
            className="absolute inset-0 bg-[#050B1A]/80 backdrop-blur-[10px]"
            onClick={closePlans}
          />
        )}

        <div
          className={
            isPage
              ? "relative z-10 mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1220px] flex-col overflow-hidden rounded-[16px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:min-h-[calc(100vh-5rem)]"
              : "relative z-10 flex h-[calc(100vh-1rem)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0B1228] shadow-[0_30px_90px_rgba(0,0,0,0.85)] sm:h-[calc(100vh-2rem)]"
          }
        >
          <div className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[860px] -translate-x-1/2 rounded-full bg-[#4F67FF]/18 blur-3xl" />

          <div className="relative flex items-start justify-between border-b border-white/10 px-4 py-3">
            <div>
              {isPage && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.history.length > 1) {
                      router.back();
                      return;
                    }
                    router.push("/");
                  }}
                  className="mb-2 inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/85 transition hover:bg-white/10"
                >
                  Back
                </button>
              )}
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
                  {formatPlanLabelOrFallback(currentPlan, "Free")}
                </span>
              </p>
            </div>

            {!isPage && (
              <button
                type="button"
                onClick={closePlans}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0B1228]/95 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3">
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

                <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setCategoryView("individual")}
                    className={[
                      "h-10 rounded-xl px-5 text-sm font-semibold transition",
                      categoryView === "individual"
                        ? "bg-[#F59E0B] text-white"
                        : "text-white/70 hover:text-white",
                    ].join(" ")}
                  >
                    Individuals
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategoryView("business")}
                    className={[
                      "h-10 rounded-xl px-5 text-sm font-semibold transition",
                      categoryView === "business"
                        ? "bg-[#F59E0B] text-white"
                        : "text-white/70 hover:text-white",
                    ].join(" ")}
                  >
                    Business
                  </button>
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm font-semibold text-white">
                  {categoryTitle}
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {categoryDescription}
                </div>
              </div>
            </div>
          </div>

          <div className="sub-scroll flex-1 overflow-y-auto px-4 pb-4 pt-3">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
                Loading subscription plans...
              </div>
            ) : error ? (
              <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {!loading && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visiblePlans.map((plan) => {
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

                  const isCurrent = currentPlan === plan.key;
                  const isIncluded =
                    getPlanRank(currentPlan) > 0 &&
                    getPlanRank(currentPlan) > getPlanRank(plan.key);
                  const isUpgrade =
                    getPlanRank(currentPlan) > 0 &&
                    getPlanRank(plan.key) > getPlanRank(currentPlan);
                  const isPriceUnavailable = actualPrice === 0;
                  const isPayingThisPlan = payingPlan === plan.key;

                  const ctaLabel = getCardCtaLabel({
                    isCategoryDisabled: false,
                    categoryView,
                    isCurrent,
                    isIncluded,
                    isUpgrade,
                    isPriceUnavailable,
                  });

                  const ctaDisabled =
                    isCurrent || isIncluded || isPriceUnavailable || isPayingThisPlan;

                  return (
                    <div
                      key={plan.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedPlan(plan.key);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPlan(plan.key);
                        }
                      }}
                      className={[
                        "relative min-h-[430px] overflow-hidden rounded-[18px] border p-3 text-left transition xl:min-h-[450px]",
                        getSelectedCardClasses(isSelected, planStatus),
                        "cursor-pointer",
                      ].join(" ")}
                    >
                      <div
                        className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${getPlanAccent(
                          plan.key
                        )}`}
                      />

                      <div className="relative z-[2] flex h-full flex-col">
                        <div className="flex items-center justify-between gap-2">
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
                                {plan.title} special display offer - Save {offerPercent}%
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

                        <div className="sub-scroll mt-2.5 max-h-28 flex-1 space-y-1.5 overflow-y-auto pr-1 xl:max-h-32">
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

                        <div className="mt-4 border-t border-white/10 pt-3">
                          <div
                            className={[
                              "mb-2 text-xs uppercase tracking-wide",
                              planStatus === "current"
                                ? "text-[#FFD166]"
                                : planStatus === "included"
                                ? "text-orange-300"
                                : planStatus === "upgrade"
                                ? "text-blue-300"
                                : "text-white/55",
                            ].join(" ")}
                          >
                            {planStatus === "current"
                              ? "Current access"
                              : planStatus === "included"
                              ? "Already covered"
                              : planStatus === "upgrade"
                              ? "Upgrade available"
                              : "Ready to buy"}
                          </div>

                          <button
                            type="button"
                            disabled={ctaDisabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!ctaDisabled) {
                                requestCheckout(plan.key);
                              }
                            }}
                            className={[
                              "h-11 w-full rounded-xl px-4 font-semibold transition",
                              ctaDisabled
                                ? "cursor-not-allowed border border-white/20 bg-white/5 text-slate-300"
                                : isUpgrade
                                ? "bg-[#4F67FF] text-white shadow-[0_12px_30px_rgba(79,103,255,0.25)] hover:bg-[#3B55FF]"
                                : "bg-[#111827] text-white hover:bg-[#0b1228]",
                            ].join(" ")}
                          >
                            {isPayingThisPlan ? "Processing..." : ctaLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="relative min-h-[430px] overflow-hidden rounded-[18px] border border-dashed border-[#4F67FF]/55 bg-[#0d1733] p-3 text-left transition xl:min-h-[450px]">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-cyan-500/15 to-indigo-500/10" />
                  <div className="relative z-[2] flex h-full flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-white sm:text-lg">Custom Plan</h3>
                      <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[11px] font-semibold text-cyan-300">
                        Enterprise
                      </span>
                    </div>

                    <div className="mt-4 text-sm text-white/75">
                      Need a tailored solution for your business? Contact our sales team.
                    </div>

                    <div className="mt-4 flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
                      Custom seats, multi-team access, tailored regional combinations, and enterprise onboarding support.
                    </div>

                    <div className="mt-4 border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEnterprisePlanContext(categoryView);
                          setEnterpriseOpen(true);
                        }}
                        className="h-11 w-full rounded-xl bg-[#111827] px-4 font-semibold text-white transition hover:bg-[#0b1228]"
                      >
                        Contact Sales Team
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {enterpriseOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#050B1A]/85 backdrop-blur-sm"
            onClick={() => {
              if (!enterpriseSending) {
                setEnterpriseOpen(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-[620px] rounded-2xl border border-white/10 bg-[#0B1228] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-semibold text-white">Enterprise Inquiry</div>
                <div className="mt-1 text-sm text-white/60">
                  Share your requirements and our sales team will reach out.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnterpriseOpen(false)}
                disabled={enterpriseSending}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close enterprise inquiry"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
              Plan Context: {enterprisePlanContext === "business" ? "Business" : "Individual"} - Custom Plan
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                value={enterpriseForm.name}
                onChange={(e) =>
                  setEnterpriseForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Name"
                className="h-11 rounded-xl border border-white/10 bg-[#0B1228] px-3 text-sm text-white outline-none focus:border-[#4F67FF]"
              />
              <input
                type="email"
                value={enterpriseForm.email}
                onChange={(e) =>
                  setEnterpriseForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Email"
                className="h-11 rounded-xl border border-white/10 bg-[#0B1228] px-3 text-sm text-white outline-none focus:border-[#4F67FF]"
              />
              <input
                type="text"
                value={enterpriseForm.phone}
                onChange={(e) =>
                  setEnterpriseForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="Phone"
                className="h-11 rounded-xl border border-white/10 bg-[#0B1228] px-3 text-sm text-white outline-none focus:border-[#4F67FF]"
              />
              <input
                type="text"
                value={enterpriseForm.company}
                onChange={(e) =>
                  setEnterpriseForm((prev) => ({ ...prev, company: e.target.value }))
                }
                placeholder="Company"
                className="h-11 rounded-xl border border-white/10 bg-[#0B1228] px-3 text-sm text-white outline-none focus:border-[#4F67FF]"
              />
            </div>

            <textarea
              value={enterpriseForm.requirement}
              onChange={(e) =>
                setEnterpriseForm((prev) => ({ ...prev, requirement: e.target.value }))
              }
              placeholder="Requirement / Message"
              rows={4}
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#0B1228] px-3 py-2 text-sm text-white outline-none focus:border-[#4F67FF]"
            />

            {enterpriseError && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {enterpriseError}
              </div>
            )}
            {enterpriseMessage && (
              <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {enterpriseMessage}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setEnterpriseOpen(false)}
                disabled={enterpriseSending}
                className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                disabled={enterpriseSending}
                onClick={() => {
                  void submitEnterpriseInquiry();
                }}
                className="h-11 flex-1 rounded-xl bg-[#4F67FF] px-5 text-sm font-semibold text-white transition hover:bg-[#3B55FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enterpriseSending ? "Submitting..." : "Send Inquiry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutIntent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#050B1A]/85 backdrop-blur-sm"
            onClick={() => {
              if (!payingPlan) {
                setCheckoutIntent(null);
                setAgreedToTerms(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-[480px] rounded-2xl border border-white/10 bg-[#0B1228] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
            <div className="text-xl font-semibold text-white">Confirm Your Plan</div>
            <div className="mt-2 text-sm text-white/70">
              You are about to subscribe to the selected plan.
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="flex justify-between gap-3 text-white/80">
                <span>Plan</span>
                <span className="font-medium text-white">{checkoutIntent.planTitle}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3 text-white/80">
                <span>Billing Interval</span>
                <span className="font-medium text-white">
                  {billingCycle === "annual" ? "Annual" : "Monthly"}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-3 text-white/80">
                <span>Currency</span>
                <span className="font-medium text-white">INR</span>
              </div>
              <div className="mt-2 flex justify-between gap-3 text-white/80">
                <span>Final Price</span>
                <span className="font-medium text-white">
                  {formatDisplayPrice(checkoutIntent.amount, "INR")}
                </span>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-white/75">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent"
              />
              <span>I agree to the payment terms and conditions.</span>
            </label>

            <div className="mt-2 text-xs text-white/55">Secure payment powered by Razorpay.</div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={!!payingPlan}
                onClick={() => {
                  setCheckoutIntent(null);
                  setAgreedToTerms(false);
                }}
                className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agreedToTerms || !!payingPlan}
                onClick={() => {
                  void handlePayNow(checkoutIntent.planKey);
                }}
                className="h-11 flex-1 rounded-xl bg-[#4F67FF] px-4 text-sm font-semibold text-white transition hover:bg-[#3B55FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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

