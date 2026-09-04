import OpenAI from "openai";
import {
  toSeries,
  seasonalIndices,
  describeSeasonality,
  isEffectivelyLinear,
  monthOf,
} from "@/lib/forecastSeasonality";
import { holtWinters } from "@/lib/holtWinters";

export const dynamic = "force-dynamic";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Flash AI forecast generator (called from the CMS).
 *
 * The AI line is a QUESTION-DRIVEN prediction. The CMS holds a set of weighted
 * BYF questions per graph and country ("Are EU/government policies currently
 * supportive of LCV sales?", weight 0.15, positive). The model reads those,
 * judges each one for the market, and moves the forecast accordingly. History
 * supplies the level, scale and seasonal shape it has to stay consistent with.
 *
 * If a graph/country has no questions there is nothing to predict from, so NO
 * forecast is produced and the caller gets 422. Substituting a statistical
 * projection there is exactly what made the line look invented.
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

    // Questions are the input the forecast is derived from. Empty, or present
    // but with no readable text, means there is nothing to predict from.
    const usableQuestions = (Array.isArray(questions) ? questions : [])
      .map((q) => ({
        text: String(q?.text ?? "").trim(),
        type: String(q?.type ?? "").trim().toLowerCase() || "positive",
        weight: Number(q?.weight),
      }))
      .filter((q) => q.text.length > 0);

    if (!usableQuestions.length) {
      return new Response(
        JSON.stringify({
          error:
            "No BYF questions configured for this graph and country. The AI forecast is derived from those questions, so none can be generated.",
          code: "NO_QUESTIONS",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
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

    // Holt-Winters is kept ONLY as scale context inside the prompt. It is no
    // longer used as a fallback: if the question-derived prediction fails, the
    // endpoint returns nothing rather than substituting a statistical curve.
    const hwValues = series.map((p) => p.value);
    const hw = holtWinters(hwValues, periods.length);

    const posQ = usableQuestions.filter((q) => q.type !== "negative");
    const negQ = usableQuestions.filter((q) => q.type === "negative");
    const wsum = usableQuestions.reduce(
      (a, q) => a + (Number.isFinite(q.weight) ? Math.abs(q.weight) : 0),
      0,
    );

    const qBlock = usableQuestions
      .map(
        (q, i) =>
          `${i + 1}. [${q.type}] (weight ${
            Number.isFinite(q.weight) ? q.weight : "unweighted"
          }) ${q.text}`,
      )
      .join("
");

    const instructions = `
You are an automotive market analyst producing a monthly volume forecast.

THE FORECAST MUST BE DERIVED FROM THE DRIVER QUESTIONS BELOW.
Work through them one at a time: judge whether each is currently true for this
market, how strongly, and in which direction (a "positive" driver supports
volume, a "negative" driver suppresses it). Weight each judgement by its stated
weight. The net of those judgements decides how far, and which way, the forecast
departs from the recent run-rate. That reasoning is the forecast — do not
produce a number first and justify it afterwards.

There are ${usableQuestions.length} drivers (${posQ.length} positive, ${negQ.length} negative, total weight ${wsum.toFixed(2)}).

Constraints on the output:
- Stay on the scale of this market. The last actual was ${Math.round(last).toLocaleString()}.
- Keep the seasonal shape: vehicle sales are month-dependent (festive peaks,
  monsoon or winter troughs, quarter- and year-end effects). Consecutive months
  should rarely move by the same amount, and a constant increment is rejected.
- Normal month-on-month movement here is about ${(volatility * 100).toFixed(1)}% around a ${(drift * 100).toFixed(2)}% drift.
${seasonalNote ? `- Observed seasonality (share of trend by calendar month): ${seasonalNote}` : "- History is under 13 months; infer seasonality from the data shown."}
${hw ? `- For scale only, a damped-trend statistical fit of this history gives: ${periods.map((p, i) => `${p}=${Math.round(hw[i])}`).join(", ")}. Your answer should differ from it wherever the drivers justify it — that difference is the value the drivers add.` : ""}
- Return ONLY strict JSON: { "YYYY-MM": 123000, ... }. No prose, no code fences.
`;

    const prompt = `${instructions}

Category: ${categoryName}
Definition: ${categoryDefinition}
Region: ${region}
Graph Name: ${graphName}

DRIVER QUESTIONS (the basis of this forecast):
${qBlock}

Historical Volume Data (${series.length} months) — context for level and seasonality:
${series.map((p) => `${p.month}: ${p.value}`).join("
")}

Forecast Periods:
${periods.join(", ")}
`;

    // Ask the model, retrying once with a firmer instruction if the first
    // answer is unusable. Two attempts, then give up — a failed prediction
    // must yield NOTHING rather than a substituted statistical curve, which is
    // what previously made this line look invented.
    const recent = series.slice(-24).map((p) => p.value);
    const loBand = Math.min(...recent) * 0.7;
    const hiBand = Math.max(...recent) * 1.3;

    const askModel = async (extra) => {
      const chat = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an automotive analyst. You derive forecasts from the supplied driver questions and return strict JSON. You never return a series with a constant increment between periods.",
          },
          { role: "user", content: extra ? `${prompt}
${extra}` : prompt },
        ],
        // Low temperature collapses onto the blandest answer (a flat ramp).
        temperature: 0.7,
      });
      const text = chat.choices?.[0]?.message?.content || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return null;

      let obj;
      try {
        obj = JSON.parse(match[0]);
      } catch {
        return null;
      }

      const vals = {};
      for (const p of periods) {
        const n = Number(obj?.[p]);
        if (Number.isFinite(n) && n > 0) vals[p] = Math.round(n);
      }
      if (Object.keys(vals).length !== periods.length) return null;

      const arr = periods.map((p) => vals[p]);
      if (arr.some((v) => v < loBand || v > hiBand)) return null; // off-scale
      if (isEffectivelyLinear(arr)) return null; // a ramp is not a forecast
      return vals;
    };

    let out = null;
    let attempts = 0;
    try {
      attempts = 1;
      out = await askModel(null);
      if (!out) {
        attempts = 2;
        out = await askModel(
          `Your previous answer was rejected. It was either off the scale of this market (stay between ${Math.round(loBand).toLocaleString()} and ${Math.round(hiBand).toLocaleString()}), evenly spaced, or incomplete. Re-derive the forecast from the driver questions and return all ${periods.length} periods.`,
        );
      }
    } catch (e) {
      console.error("ai-forecast: model call failed:", e);
    }

    if (!out) {
      // No usable prediction. Return nothing rather than fabricate one.
      return new Response(
        JSON.stringify({
          error:
            "The model did not return a usable question-derived forecast for this market.",
          code: "NO_PREDICTION",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Surfaced for CMS debugging; harmless to clients that ignore it.
        "x-forecast-drivers": String(usableQuestions.length),
        "x-forecast-attempts": String(attempts),
        "x-forecast-seasonality": idx ? "observed" : "insufficient-history",
      },
    });
  } catch (err) {
    console.error("AI forecast error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
