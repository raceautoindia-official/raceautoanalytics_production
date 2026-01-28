import OpenAI from "openai";

export const dynamic = "force-dynamic";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const {
      graphId,
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
        { status: 400 }
      );
    }

    console.log(
      `${Object.entries(volumeData.data)
        .map(([year, value]) => `${year}: ${value}`)
        .join("\n")}`
    );

    const instructions = `
You are an automotive market forecasting assistant.

Your task is to generate realistic, period-by-period volume forecasts based on historical sales data and weighted qualitative aspects.

⚠️ Important constraints:
- The first forecasted period must begin near the last known historical value.!!IMPORTANT
- Forecast values must **not fluctuate erratically**. Ensure a **smooth, plausible trend**.
- Incorporate the provided aspects to influence the growth/decline conservatively.
- Return only the output in strict JSON format: { "YYYY-MM": 123000, "YYYY-MM": 126500, ... } or { "2025": 123000, "2026": 126500, ... }.
- DO NOT add any text, explanation, or formatting outside the JSON.

Be concise, data-aligned, and assume no external sources.
`;

    const prompt = `
${instructions}

Category: ${categoryName}
Definition: ${categoryDefinition}
Region: ${region}
Graph Name: ${graphName}

Historical Volume Data:
${Object.entries(volumeData.data)
  .map(([year, value]) => `${year}: ${value}`)
  .join("\n")}

Forecast Periods:
${years.join(", ")}

Aspects to Consider:
${questions
  .map((q) => `- (${q.type}) ${q.text} (Weight: ${q.weight})`)
  .join("\n")}

Please provide only the forecast volumes for the years mentioned.
`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an AI model that returns numeric forecasts based on structured prompts.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    });

    const textResponse = chat.choices[0].message.content;
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Response does not contain valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI forecast error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
