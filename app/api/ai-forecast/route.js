import OpenAI from "openai";
import {
  toSeries,
  seasonalIndices,
  describeSeasonality,
  isEffectivelyLinear,
  monthOf,
} from "@/lib/forecastSeasonality";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Flash AI forecast generator (called from the CMS).
 *
 * The AI line is produced in two stages:
 *
 *   1. RESEARCH. The model is given web search and asked what is actually
 *      happening in this market right now — who publishes the volumes, which
 *      months are already published, the YoY trend, any tax or incentive
 *      change landing inside the forecast window, the festive/plate-change
 *      calendar, and any published industry forecast. Everything must be
 *      sourced; anything unfindable comes back as NOT FOUND.
 *
 *   2. FORECAST. History supplies the scale, definition and seasonal shape;
 *      the research supplies direction and turning points; the CMS driver
 *      questions supply the analyst's own view.
 *
 * Why research rather than pure statistics: the forecast window often starts
 * before the client's own upload has caught up, so the first month or two is
 * already published somewhere. On India 2W the research returned Vahan's
 * actual August 2026 figure (1,714,610) rather than guessing at it. It also
 * knows that a festive peak MOVES — Diwali fell in October 2025 and falls in
 * November 2026 — which no seasonal index keyed on calendar months can express.
 *
 * Guards, in the order of what they catch:
 *   - scale band, from the market's own history. Research quotes figures in
 *     whatever unit the source used and the model sometimes follows it:
 *     Ireland came back as 11, 8, 5, 3, 2, 43 (thousands) against a history in
 *     units. Anything outside 0.4x min .. 1.6x max of history is rejected.
 *   - year-over-year sanity where a same-month-last-year actual exists. Wide
 *     (+/-60%) on purpose: it must still permit a real festive shift between
 *     October and November, which is roughly a 45% move.
 *   - a constant month-to-month increment is a ramp, not a forecast.
 *
 * A rejected answer is retried with the specific reason. After three attempts
 * the endpoint returns NOTHING (502). Substituting a statistical curve is what
 * made this line look invented in the first place.
 *
 * A graph/country with no CMS questions still gets 422 and stores no forecast.
 */

const prettyRegion = (r) =>
  String(r || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const SEGMENT_HINT = {
  "2W": "two-wheeler (motorcycle and scooter)",
  "3W": "three-wheeler",
  PV: "passenger vehicle / passenger car",
  CV: "commercial vehicle",
  TRAC: "agricultural tractor",
  CE: "construction equipment",
  Total: "total automotive market (all vehicle types combined)",
  Truck: "truck",
  Bus: "bus and coach",
  Tipper: "tipper truck",
  Trailer: "tractor-trailer / articulated truck",
};

/**
 * Calendar facts the model must not recall from memory.
 *
 * Asked unaided, it got Diwali backwards — "shifted from November to October"
 * for 2026, when the dates are the reverse — and on a later run left the peak
 * in October entirely. A movable festival is the one thing a seasonal index
 * keyed on calendar months can never represent, so it has to be stated.
 */
const KNOWN_CALENDAR = {
  india:
    "Diwali is the festive peak for Indian vehicle sales and it MOVES each year: 31 Oct/1 Nov 2024 (peak split across October and November), 20 Oct 2025 (peak in OCTOBER), 8 Nov 2026 (peak in NOVEMBER). So October 2026 does NOT repeat October 2025's festive spike — that volume belongs to November 2026.",
  ireland:
    "Ireland changes registration plates twice a year: January (new annual plate) and July (second-half plate). January is by far the largest month of the year and December the smallest.",
  pakistan:
    "Vehicle demand tracks Ramadan and Eid, which move about 11 days earlier each year: Ramadan began 1 Mar 2025, 18 Feb 2026, and begins about 8 Feb 2027.",
};

const prevYearOf = (m) => `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const h = s.length / 2;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[h - 1] + s[h]) / 2;
};

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

    if (series.length < 8 || !periods.length) {
      return new Response(
        JSON.stringify({ error: "No usable history or forecast periods" }),
        { status: 400 },
      );
    }

    const byMonth = Object.fromEntries(series.map((p) => [p.month, p.value]));
    const values = series.map((p) => p.value);
    const loBand = Math.min(...values) * 0.4;
    const hiBand = Math.max(...values) * 1.6;

    // Year-over-year anchor. Each forecast month is compared with the same
    // calendar month a year earlier, grown by this market's own recent YoY
    // rate. Given to the model as context and used as a sanity band — not as a
    // clamp, because a festive month legitimately moves year to year.
    const yoy = [];
    for (const p of series) {
      const prev = byMonth[prevYearOf(p.month)];
      if (prev > 0) yoy.push(p.value / prev - 1);
    }
    const growth = yoy.length
      ? Math.max(-0.35, Math.min(0.35, median(yoy.slice(-6))))
      : 0;

    const anchors = {};
    periods.forEach((p, i) => {
      const a = byMonth[prevYearOf(p)];
      if (a > 0) anchors[p] = a * (1 + growth * (1 - 0.06 * i));
    });
    const anchoredMonths = periods.filter((p) => anchors[p] > 0);

    // Seasonality is only worth stating when there is no YoY anchor already
    // carrying the shape.
    const seasonalNote =
      anchoredMonths.length === periods.length
        ? null
        : describeSeasonality(seasonalIndices(series));

    const segHint =
      SEGMENT_HINT[String(categoryName).replace(/^Flash\s+/i, "").trim()] ||
      String(categoryName);
    const place = prettyRegion(region);
    const now = new Date();
    const today = `${now.toLocaleString("en-GB", {
      month: "long",
    })} ${now.getFullYear()}`;
    const first = periods[0];
    const last = periods[periods.length - 1];

    // ---------- Stage 1: online research ----------
    let brief = "";
    let sources = [];
    let researchState = "ok";
    try {
      const research = await openai.responses.create({
        model: "gpt-4o",
        tools: [{ type: "web_search" }],
        input: `Research the CURRENT state of the ${segHint} market in ${place}, as of ${today}.

Report ONLY what you can source, naming the source and its date:
1. Who publishes monthly sales/registration volumes for this market, and which months are already published — INCLUDING any month between ${first} and ${last}. If an actual figure for one of those months has already been published, state it explicitly.
2. The year-on-year growth trend over the last six months.
3. Any tax, incentive, emissions or registration change affecting demand between ${first} and ${last}.
4. Calendar effects in that window, with dates: festivals that move year to year (for example Diwali in India), plate-change months, winter demand collapse.
5. Any published industry forecast for this market covering that window.

Be concise and factual. Write NOT FOUND for anything you cannot source. Do not speculate.`,
      });
      brief = String(research.output_text || "").trim();
      sources = [
        ...new Set(
          (
            JSON.stringify(research.output || "").match(
              /https?:\/\/[^"\\\s)]+/g,
            ) || []
          ).map((u) => u.replace(/[.,]+$/, "")),
        ),
      ].slice(0, 8);
      if (!brief) researchState = "empty";
    } catch (e) {
      console.error("ai-forecast: research stage failed:", e?.message || e);
      researchState = "failed";
    }

    const qBlock = usableQuestions
      .map(
        (q, i) =>
          `${i + 1}. [${q.type}] (weight ${
            Number.isFinite(q.weight) ? q.weight : "unweighted"
          }) ${q.text}`,
      )
      .join("\n");

    const anchorBlock = anchoredMonths.length
      ? anchoredMonths
          .map(
            (p) =>
              `${p}  <- ${prevYearOf(p)} actual ${byMonth[
                prevYearOf(p)
              ].toLocaleString()}  => baseline ${Math.round(
                anchors[p],
              ).toLocaleString()}`,
          )
          .join("\n")
      : "(less than a year of history — no same-month-last-year anchor available)";

    const prompt = `You are an automotive market analyst producing a monthly volume forecast for ${place} / ${segHint}.

ACTUAL MONTHLY HISTORY. This is the client's own dataset. Your forecast must be on exactly this scale and definition — not the units used by any news source.
${series.map((p) => `${p.month}: ${p.value.toLocaleString()}`).join("\n")}

YEAR-OVER-YEAR BASELINE. Each forecast month anchored to the same calendar month one year earlier, grown by this market's recent YoY rate of ${(
      growth * 100
    ).toFixed(1)}%:
${anchorBlock}
${
  seasonalNote
    ? `\nObserved seasonality (share of trend by calendar month): ${seasonalNote}`
    : ""
}

${
  KNOWN_CALENDAR[String(region).toLowerCase()]
    ? `KNOWN CALENDAR — authoritative, use these dates rather than your own recollection:\n${
        KNOWN_CALENDAR[String(region).toLowerCase()]
      }\n`
    : ""
}
MARKET RESEARCH, gathered online just now:
${brief || "(unavailable — rely on the history and the driver questions)"}

ANALYST DRIVER QUESTIONS from the client's CMS:
${qBlock}

How to build the forecast:
- If the research reports an ALREADY-PUBLISHED actual for one of the forecast months, use it, converted to the scale of the history above.
- The baseline already carries this market's real seasonal shape. Depart from it only for a reason you can name: a driver question, a policy change, or a calendar shift found in the research.
- A festive or plate-change peak MOVES between months. If the research says it falls in a different month this year than last, move the volume to the correct month rather than leaving it where it was.
- Every value must be a realistic monthly volume for THIS dataset. The history runs from ${Math.min(
      ...values,
    ).toLocaleString()} to ${Math.max(...values).toLocaleString()}.
- Consecutive months must not move by a constant increment.

Return ONLY a JSON object with exactly these ${
      periods.length
    } keys as plain integers (no commas, no units): ${periods.join(
      ", ",
    )}. Add "_why" with one short sentence.`;

    // ---------- Stage 2: forecast, validated ----------
    const askModel = async (correction) => {
      const chat = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an automotive market analyst. You ground every forecast in the supplied history, research and driver questions, and return a strict JSON object. You never return a series with a constant increment between periods.",
          },
          {
            role: "user",
            content: correction ? `${prompt}\n\n${correction}` : prompt,
          },
        ],
      });

      let obj;
      try {
        obj = JSON.parse(chat.choices?.[0]?.message?.content || "");
      } catch {
        return { vals: null, reason: "the response was not valid JSON" };
      }

      const vals = {};
      for (const p of periods) {
        const n = Number(obj?.[p]);
        if (Number.isFinite(n) && n > 0) vals[p] = Math.round(n);
      }
      if (Object.keys(vals).length !== periods.length) {
        return {
          vals: null,
          reason: `it did not contain all ${periods.length} months as positive numbers`,
        };
      }

      const arr = periods.map((p) => vals[p]);

      // Scale guard. Catches a model that silently switched units.
      if (arr.some((v) => v < loBand || v > hiBand)) {
        return {
          vals: null,
          reason: `the values were off the scale of this market — every month must be between ${Math.round(
            loBand,
          ).toLocaleString()} and ${Math.round(
            hiBand,
          ).toLocaleString()}, in the same units as the history`,
        };
      }

      // Year-over-year sanity, wide enough to allow a genuine festive shift.
      const wild = anchoredMonths.filter(
        (p) => Math.abs(vals[p] / anchors[p] - 1) > 0.6,
      );
      if (wild.length) {
        return {
          vals: null,
          reason: `${wild.join(
            ", ",
          )} departed more than 60% from the year-over-year baseline without support`,
        };
      }

      if (isEffectivelyLinear(arr)) {
        return {
          vals: null,
          reason: "the months were evenly spaced — a ramp is not a forecast",
        };
      }

      return { vals, why: String(obj?._why || "").slice(0, 300) };
    };

    let out = null;
    let why = "";
    let attempts = 0;
    let lastReason = "";
    try {
      for (let i = 0; i < 3 && !out; i++) {
        attempts = i + 1;
        const r = await askModel(
          i === 0
            ? null
            : `Your previous answer was rejected because ${lastReason}. Correct it and return all ${periods.length} months.`,
        );
        if (r.vals) {
          out = r.vals;
          why = r.why || "";
        } else {
          lastReason = r.reason;
        }
      }
    } catch (e) {
      console.error("ai-forecast: model call failed:", e);
    }

    if (!out) {
      return new Response(
        JSON.stringify({
          error:
            "The model did not return a usable forecast for this market after three attempts.",
          code: "NO_PREDICTION",
          lastReason,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(out), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Surfaced for CMS debugging; harmless to clients that ignore them.
        "x-forecast-drivers": String(usableQuestions.length),
        "x-forecast-attempts": String(attempts),
        "x-forecast-research": researchState,
        "x-forecast-sources": sources.join(" | ").slice(0, 1800),
        "x-forecast-why": why.replace(/[^\x20-\x7e]/g, "").slice(0, 300),
      },
    });
  } catch (err) {
    console.error("AI forecast error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
