"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const AIPoweredForecastTools = dynamic(
  () => import("@/app/components/AIPoweredForecastTools"),
  { loading: () => null },
);

export default function DeferredForecastTools() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;

    const node = ref.current;
    const load = () => setShouldLoad(true);

    if (!node || !("IntersectionObserver" in window)) {
      const timer = window.setTimeout(load, 2500);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load();
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" },
    );

    observer.observe(node);

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions,
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const usedIdleCallback = typeof idleWindow.requestIdleCallback === "function";
    const idleId = usedIdleCallback
      ? idleWindow.requestIdleCallback(load, { timeout: 4500 })
      : window.setTimeout(load, 4500);

    return () => {
      observer.disconnect();
      if (
        usedIdleCallback &&
        typeof idleWindow.cancelIdleCallback === "function"
      ) {
        idleWindow.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [shouldLoad]);

  return <div ref={ref}>{shouldLoad ? <AIPoweredForecastTools /> : null}</div>;
}
