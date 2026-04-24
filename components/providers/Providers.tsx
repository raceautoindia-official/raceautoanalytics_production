"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useMemo,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface AppContextType {
  region: string;
  month: string; // YYYY-MM (current selection)
  maxMonth: string; // ✅ stable upper bound (default/latest allowed)
  minMonth: string; // ✅ stable lower bound
  setRegion: (region: string) => void;
  setMonth: (month: string) => void;
  updateUrl: (params: Record<string, string>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within Providers");
  return context;
}

const sanitizeCountry = (s: string | null) => {
  const v = String(s || "").toLowerCase().trim();
  const clean = v
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
  return clean || "india";
};


// ✅ Cap earliest selectable month (locked requirement)
const MIN_MONTH = "2024-01";

const isYYYYMM = (s: string) => /^\d{4}-\d{2}$/.test(s);
const cmpYYYYMM = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function clampYYYYMM(v: string, min: string, max: string) {
  if (!isYYYYMM(v)) return min;
  if (cmpYYYYMM(v, min) < 0) return min;
  if (cmpYYYYMM(v, max) > 0) return max;
  return v;
}

function getPrevMonthIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "01");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "01");

  const cutoffDay = 5;
  const back = d >= cutoffDay ? 1 : 2;

  let year = y;
  let month = m - back;
  while (month <= 0) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getLatestUploadedMonth(rows: any): string | null {
  if (!Array.isArray(rows)) return null;

  const months = rows
    .map((row) => {
      const month = String(row?.month || "");
      const data = row?.data;
      const hasData =
        data &&
        typeof data === "object" &&
        Object.keys(data).length > 0;
      if (!isYYYYMM(month) || !hasData) return null;
      return month;
    })
    .filter((value): value is string => Boolean(value));

  if (!months.length) return null;
  months.sort((a, b) => a.localeCompare(b));
  return months[months.length - 1];
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initializedMonthRef = useRef(false);

  const [maxMonth, setMaxMonth] = useState(() => {
    const latest = getPrevMonthIST();
    // ensure maxMonth is never earlier than MIN_MONTH
    return cmpYYYYMM(latest, MIN_MONTH) < 0 ? MIN_MONTH : latest;
  });

  const minMonth = MIN_MONTH;

  const [region, setRegionState] = useState("india");

  // ✅ Current month selection (clamped to [minMonth, maxMonth])
  const [month, setMonthState] = useState(() =>
    clampYYYYMM(maxMonth, minMonth, maxMonth),
  );

  useEffect(() => {
    const urlCountry = searchParams.get("country") ?? searchParams.get("region");
    if (urlCountry) setRegionState(sanitizeCountry(urlCountry));
  }, [searchParams]);

  useEffect(() => {
    if (!pathname?.startsWith("/flash-reports")) return;
    let cancelled = false;

    async function loadLatestMonthForRegion() {
      const fallback = (() => {
        const latest = getPrevMonthIST();
        return cmpYYYYMM(latest, MIN_MONTH) < 0 ? MIN_MONTH : latest;
      })();

      try {
        const params = new URLSearchParams();
        params.set("country", region);
        params.set("forceHistorical", "1");
        params.set("horizon", "6");

        const res = await fetch(
          `/api/flash-reports/overall-chart-data?${params.toString()}`,
          { cache: "no-store" },
        );

        const json = res.ok ? await res.json() : null;
        const latestFromData = getLatestUploadedMonth(json?.data);
        const nextMax =
          latestFromData && isYYYYMM(latestFromData)
            ? latestFromData
            : fallback;

        if (cancelled) return;
        setMaxMonth(nextMax);
        const urlMonth = searchParams.get("month");
        const shouldRespectUrlMonth =
          !initializedMonthRef.current && urlMonth && isYYYYMM(urlMonth);
        const nextMonth = shouldRespectUrlMonth
          ? clampYYYYMM(String(urlMonth), minMonth, nextMax)
          : nextMax;

        setMonthState(nextMonth);
        initializedMonthRef.current = true;

        if (
          typeof window !== "undefined" &&
          pathname?.startsWith("/flash-reports")
        ) {
          const currentUrlMonth = searchParams.get("month");
          const currentUrlCountry =
            searchParams.get("country") ?? searchParams.get("region");
          if (currentUrlMonth !== nextMonth || currentUrlCountry !== region) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("country", region);
            params.set("month", nextMonth);
            router.replace(`${window.location.pathname}?${params.toString()}`, {
              scroll: false,
            });
          }
        }
      } catch {
        if (cancelled) return;
        setMaxMonth(fallback);
        setMonthState(fallback);
        initializedMonthRef.current = true;
        if (
          typeof window !== "undefined" &&
          pathname?.startsWith("/flash-reports")
        ) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("country", region);
          params.set("month", fallback);
          router.replace(`${window.location.pathname}?${params.toString()}`, {
            scroll: false,
          });
        }
      }
    }

    loadLatestMonthForRegion();

    return () => {
      cancelled = true;
    };
  }, [region, minMonth, pathname, router, searchParams]);

  useEffect(() => {
    if (!pathname?.startsWith("/flash-reports")) return;
    const urlMonth = searchParams.get("month");
    if (urlMonth && isYYYYMM(urlMonth)) {
      setMonthState(clampYYYYMM(urlMonth, minMonth, maxMonth));
    }
  }, [pathname, searchParams, minMonth, maxMonth]);

  const updateUrl = (params: Record<string, string>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => current.set(key, value));

    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${window.location.pathname}${query}`, { scroll: false });
  };

  const setRegion = (newRegion: string) => {
    setRegionState(newRegion);
    updateUrl({ country: newRegion, month });
  };

  const setMonth = (newMonth: string) => {
    const clamped = clampYYYYMM(newMonth, minMonth, maxMonth);
    setMonthState(clamped);
    updateUrl({ country: region, month: clamped });
  };

  const ctxValue = useMemo(
    () => ({
      region,
      month,
      maxMonth,
      minMonth,
      setRegion,
      setMonth,
      updateUrl,
    }),
    [region, month, maxMonth, minMonth],
  );

  return <AppContext.Provider value={ctxValue}>{children}</AppContext.Provider>;
}
