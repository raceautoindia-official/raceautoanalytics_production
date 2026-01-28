"use client";

import { useState } from "react";

export function useAIForecast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState(null);

  const generateForecast = async ({
    graphId,
    categoryName,
    categoryDefinition,
    graphName,
    region,
    volumeData,
    years,
    questions,
  }) => {
    setLoading(true);
    setError(null);
    setForecast(null);

    try {
      const res = await fetch("/api/ai-forecast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`,
        },
        body: JSON.stringify({
          graphId,
          categoryName,
          categoryDefinition,
          graphName,
          region,
          volumeData,
          years,
          questions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Forecast API error");
      }

      const data = await res.json(); 
      console.log("data ", data);
      setForecast(data); // Expected format: { "2025": 123000, ... }
      return data;
    } catch (err) {
      setError(err.message);
      return err.message;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    forecast,
    generateForecast,
  };
}
