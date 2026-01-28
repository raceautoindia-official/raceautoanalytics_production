// File: app/hooks/useYearlyScores.js
'use client';

import { useMemo } from 'react';

/**
 * Compute final score per year.
 *
 * @param {{key:string,label:string}[]} posAttributes
 * @param {{key:string,label:string}[]} negAttributes
 * @param {{[key:string]: number[]}} posScores
 * @param {{[key:string]: number[]}} negScores
 * @param {{[key:string]: number}} weights
 * @param {string[]} yearNames
 * @returns {{year:string, score:number}[]}
 */
export function useYearlyScores(
  posAttributes,
  negAttributes,
  posScores,
  negScores,
  weights,
  yearNames
) {
  return useMemo(() => {
    const results = [];
    for (let i = 0; i < yearNames.length; i++) {
      let posSum = 0, negSum = 0;
      posAttributes.forEach(attr => {
        const v = posScores[attr.key]?.[i] ?? 0;
        posSum += v * (weights[attr.key] ?? 0);
      });
      negAttributes.forEach(attr => {
        const v = negScores[attr.key]?.[i] ?? 0;
        negSum += v * (weights[attr.key] ?? 0);
      });
      results.push({ year: yearNames[i], score: posSum - negSum });
    }
    return results;
  }, [posAttributes, negAttributes, posScores, negScores, weights, yearNames]);
}
