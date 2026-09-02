/**
 * Holt-Winters exponential smoothing with a DAMPED trend.
 *
 * Why this exists: every forecast line on the chart was ultimately built from
 * the same seasonal-naive skeleton — a drift applied to the last actual, times
 * a centred-moving-average seasonal index. Survey, BYF and the AI fallback all
 * shared that structure, so the lines converged and the chart showed four
 * methods that were really one.
 *
 * This is a structurally different estimator, so the AI line diverges on
 * genuine modelling grounds rather than by decoration:
 *
 *   - level, trend and seasonality are EXPONENTIALLY weighted, so recent
 *     seasons count for more than old ones (the centred moving average weights
 *     every year equally);
 *   - the trend is DAMPED by phi < 1, so growth flattens across the horizon
 *     instead of compounding at a constant rate;
 *   - parameters are fitted to the market's own history by minimising
 *     in-sample squared error, not assumed.
 *
 * Everything is derived from the supplied actuals. Nothing is invented.
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Fit and forecast. `values` must be chronological.
 * Returns an array of `h` forecasts, or null when there is too little history.
 */
export function holtWinters(values, h, opts = {}) {
  const y = (values || []).map(Number).filter(Number.isFinite);
  const m = opts.period || 12; // seasonal period (months)
  if (!Array.isArray(y) || y.length < 8 || h <= 0) return null;
  if (y.some((v) => v <= 0)) return null; // multiplicative needs positives

  const seasonal = y.length >= 2 * m;

  const run = (alpha, beta, gamma, phi) => {
    let level;
    let trend;
    const season = new Array(m).fill(1);

    if (seasonal) {
      // Seed level/trend from the first two full cycles, seasonal from ratios.
      const c1 = y.slice(0, m).reduce((a, b) => a + b, 0) / m;
      const c2 = y.slice(m, 2 * m).reduce((a, b) => a + b, 0) / m;
      level = c1;
      trend = (c2 - c1) / m;
      for (let i = 0; i < m; i++) {
        const denom = c1 || 1;
        season[i] = y[i] / denom;
      }
    } else {
      level = y[0];
      trend = y.length > 1 ? y[1] - y[0] : 0;
    }

    let sse = 0;
    for (let t = 0; t < y.length; t++) {
      const s = seasonal ? season[t % m] || 1 : 1;
      const fitted = (level + phi * trend) * s;
      const err = y[t] - fitted;
      sse += err * err;

      const prevLevel = level;
      level = alpha * (y[t] / s) + (1 - alpha) * (level + phi * trend);
      trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
      if (seasonal) {
        season[t % m] = gamma * (y[t] / (level || 1)) + (1 - gamma) * s;
      }
    }

    return { sse, level, trend, season };
  };

  // Small grid search — cheap at this data size and avoids assumed constants.
  const grid = [0.1, 0.3, 0.5, 0.7, 0.9];
  const phis = [0.8, 0.9, 0.98];
  let best = null;
  for (const alpha of grid) {
    for (const beta of [0.05, 0.1, 0.3]) {
      for (const gamma of seasonal ? grid : [0.1]) {
        for (const phi of phis) {
          const r = run(alpha, beta, gamma, phi);
          if (!Number.isFinite(r.sse)) continue;
          if (!best || r.sse < best.sse) best = { ...r, alpha, beta, gamma, phi };
        }
      }
    }
  }
  if (!best) return null;

  // Damped-trend projection: the trend contribution is a decaying geometric
  // sum, so growth tapers instead of running away.
  const out = [];
  let damp = 0;
  for (let i = 1; i <= h; i++) {
    damp += Math.pow(best.phi, i);
    const s = seasonal ? best.season[(y.length + i - 1) % m] || 1 : 1;
    const v = (best.level + damp * best.trend) * s;
    out.push(v);
  }

  if (out.some((v) => !Number.isFinite(v) || v <= 0)) return null;

  // Guard against a runaway fit: keep the path inside what this market has
  // plausibly done. Wider than the AI acceptance band so real HW dynamics
  // survive, but it still cannot produce an absurd number.
  const lo = Math.min(...y) * 0.5;
  const hi = Math.max(...y) * 1.6;
  return out.map((v) => clamp(v, lo, hi));
}

export default holtWinters;
