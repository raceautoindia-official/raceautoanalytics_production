import OpenAI from "openai";
import {
  toSeries,
  seasonalIndices,
  describeSeasonality,
  isEffectivelyLinear,
  applySeasonality,
  monthOf,
} from "@/lib/forecastSeasonality";
import { holtWinters } from "@/lib/holtWinters";

export const dynamic = "force-dynamic";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Flash AI forecast generator (called from the CMS).
 *
 * Previously the prompt told the model that values "must not fluctuate
 * erratically" and should follow a "smooth, plausible trend". The model
 * complied literally and returned evenly-spaced ramps — 160 of 173 stored
 * series had a constant month-to-month step, which is why the AI line rendered
 * as a straight diagonal while the analyst (Race) line looked realistic.
 *
 * Now: the real month-of-year seasonality is computed from the supplied
 * history and given to the model as an explicit target, the smoothness demand
 * is gone, and a post-check repairs the output if it still comes back linear.
 * Seasonality is always derived from the market's own actuals — nothing is
 * invented.
 */
export async function POST(req) {
  try {
    const {
      categoryName,
      categoryDefinition,
      graphName,
      region,
      volumeData,
      years,
      questions,
    } = await req.json();

    if (
      !categoryName ||
      !categoryDefinition ||
      !graphName ||
      !region ||
      !volumeData ||
      !years ||
      !questions
    ) {
      return new Response(
        JSON.stringify({ error: "Missing one or more required fields" }),
        { status: 400 },
      );
    }

    const series = toSeries(volumeData.data);
    const periods = (Array.isArray(years) ? years : []).filter(monthOf);

    if (!series.length || !periods.length) {
      return new Response(
        JSON.stringify({ error: "No usable history or forecast periods" }),
        { status: 400 },
      );
    }

    const idx = seasonalIndices(series);
    const seasonalNote = describeSeasonality(idx);
    const last = series[series.length - 1].value;

    // Average month-on-month drift from the actuals — used for the fallback
    // level and to tell the model what "normal" movement looks like here.
    const steps = [];
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1].value;
      if (a) steps.push((series[i].value - a) / a);
    }
    const drift = steps.length
      ? steps.reduce((a, b) => a + b, 0) / steps.length
      : 0;
    const volatility = steps.length
      ? Math.sqrt(
          steps.reduce((a, b) => a + (b - drift) ** 2, 0) / steps.length,
        )
      : 0;

    // Deseasonalise the anchor before projecting. `last` is an actual, so it
    // already carries its own month's seasonal effect; multiplying the seasonal
    // index back on top of it would count that effect twice (the same mistake
    // the model makes unprompted).
    const lastMonth = series[series.length - 1].month;
    const lastCm = monthOf(lastMonth);
    const anchorFactor = idx && lastCm ? idx[lastCm] : 1;
    const lastDeseasoned =
      Number.isFinite(anchorFactor) && anchorFactor > 0
        ? last / anchorFactor
        : last;

    // Drift measured on the deseasonalised series, so a festive month at the
    // end of the history is not mistaken for underlying growth.
    const deseasonedSteps = [];
    for (let i = 1; i < series.length; i++) {
      const f0 = idx ? idx[monthOf(series[i - 1].month)] || 1 : 1;
      const f1 = idx ? idx[monthOf(series[i].month)] || 1 : 1;
      const a = series[i - 1].value / f0;
      const b = series[i].value / f1;
      if (a) deseasonedSteps.push((b - a) / a);
    }
    const trendDrift = deseasonedSteps.length
      ? deseasonedSteps.reduce((a, b) => a + b, 0) / deseasonedSteps.length
      : drift;

    const levelAt = (i) => lastDeseasoned * Math.pow(1 + trendDrift, i + 1);

    // AI baseline = Holt-Winters with a damped trend.
    //
    // Previously this fell back to applySeasonality(), the SAME seasonal-naive
    // skeleton the Survey and BYF lines are built on, so whenever the model
    // output was rejected the AI line collapsed onto the others' shape. On real
    // India 2W history the two disagree sharply (correlation -0.977, 22% level
    // difference): seasonal-naive compounds a fixed drift and runs away to
    // 2.9M, while Holt-Winters damps the trend and holds ~1.84M. Different
    // estimator, genuinely different curve — still fitted only to the actuals.
    const hwValues = series.map((p) => p.value);
    const hw = holtWinters(hwValues, periods.length);
    const fallback = () => {
      if (hw && hw.length === periods.length) {
        const out = {};
        periods.forEach((p, i) => {
          out[p] = Math.round(hw[i]);
        });
        return out;
      }
      // Only if Holt-Winters cannot fit (too little history).
      return applySeasonality(periods, levelAt, idx);
    };

    const instructions = `
You are an automotive market forecasting assistant.

Produce a month-by-month volume forecast that behaves like a real vehicle
market, not a straight line.

Requirements:
- Anchor the first forecast period near the last known actual (${Math.round(last).toLocaleString()}).
- REPRODUCE THE SEASONAL SHAPE of this market. Vehicle sales are strongly
  month-dependent (festive peaks, monsoon or winter troughs, quarter- and
  year-end effects). Two consecutive months should rarely move by the same
  amount.
- Do NOT return evenly-spaced values. A constant month-to-month increment is
  not a forecast and will be rejected.
- Typical month-on-month movement in this history is about
  ${(volatility * 100).toFixed(1)}% either side of a ${(drift * 100).toFixed(2)}% average drift —
  stay in that range rather than flattening it out.
- Let the qualitative aspects tilt the overall level, not the seasonal shape.
${seasonalNote ? `- Observed seasonality (share of trend by calendar month): ${seasonalNote}` : "- History is under 13 months, so infer seasonality from the pattern visible in the data."}
${hw ? `- A damped-trend Holt-Winters fit of this history projects: ${periods.map((p, i) => `${p}=${Math.round(hw[i])}`).join(", ")}. Treat this as the statistical reference and adjust it for the qualitative aspects; do not simply restate it, and do not drift far from it.` : ""}
- Return ONLY strict JSON: { "YYYY-MM": 123000, ... }. No prose, no code fences.
`;

    const prompt = `${instructions}

Category: ${categoryName}
Definition: ${categoryDefinition}
Region: ${region}
Graph Name: ${graphName}

Historical Volume Data (${series.length} months):
${series.map((p) => `${p.month}: ${p.value}`).join("\n")}

Forecast Periods:
${periods.join(", ")}

Aspects to Consider:
${questions.map((q) => `- (${q.type}) ${q.text} (Weight: ${q.weight})`).join("\n")}
`;

    let parsed = null;
    try {
      const chat = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You return numeric forecasts as strict JSON. You never return a series with a constant increment between periods.",
          },
          { role: "user", content: prompt },
        ],
        // Raised from 0.4: at low temperature the model collapses onto the
        // safest possible answer, which is a flat ramp.
        temperature: 0.7,
      });
      const text = chat.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (e) {
      console.error("ai-forecast: model call failed, using seasonal fallback:", e);
    }

    // Keep only the requested periods, as finite numbers.
    let out = {};
    if (parsed && typeof parsed === "object") {
      for (const p of periods) {
        const n = Number(parsed[p]);
        if (Number.isFinite(n) && n > 0) out[p] = Math.round(n);
      }
    }

    // Plausibility band from the market's own recent history. The model tends
    // to DOUBLE-COUNT seasonality: it anchors on a last actual that already
    // contains the seasonal effect, then multiplies by the index again. On
    // India 2W that produced 2.85M against a historical range of ~1.3-1.9M.
    // Anything outside the band is not credible, so the deterministic
    // seasonal path is used instead.
    const recent = series.slice(-24).map((p) => p.value);
    const loBand = Math.min(...recent) * 0.7;
    const hiBand = Math.max(...recent) * 1.3;
    const implausible = (vals) =>
      vals.some((v) => !Number.isFinite(v) || v < loBand || v > hiBand);

    let repaired = false;
    if (Object.keys(out).length !== periods.length) {
      // Incomplete or unusable response.
      out = fallback();
      repaired = true;
    } else if (implausible(periods.map((p) => out[p]))) {
      // Outside what this market has ever done — discard and use the
      // deterministic seasonal projection built from the actuals.
      out = fallback();
      repaired = true;
    } else if (isEffectivelyLinear(periods.map((p) => out[p]))) {
      // The model ignored the instruction and returned a ramp anyway. Keep its
      // level and direction, but re-impose the market's real seasonal shape.
      const vals = periods.map((p) => out[p]);
      const first = vals[0];
      const stepAvg = (vals[vals.length - 1] - first) / (vals.length - 1 || 1);
      out = applySeasonality(periods, (i) => first + stepAvg * i, idx);
      repaired = true;
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Surfaced for CMS debugging; harmless to clients that ignore it.
        "x-forecast-repaired": repaired ? "1" : "0",
        "x-forecast-seasonality": idx ? "observed" : "insufficient-history",
      },
    });
  } catch (err) {
    console.error("AI forecast error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
