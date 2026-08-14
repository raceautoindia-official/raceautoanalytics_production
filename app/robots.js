import { SITE_URL } from "@/lib/seoRoutes";

// AI/LLM crawlers we explicitly welcome. The wildcard rule below already allows
// them, but naming them is unambiguous — several of these are checked as
// distinct user-agents, and "Google-Extended" specifically governs whether our
// content may be used to ground Gemini and AI Overviews answers. Leaving it to
// the wildcard works; stating it removes any doubt for operators that look for
// an explicit token.
const AI_CRAWLERS = [
  "GPTBot", // OpenAI — ChatGPT browsing/training
  "OAI-SearchBot", // OpenAI — ChatGPT Search index
  "ChatGPT-User", // OpenAI — user-initiated fetches
  "ClaudeBot", // Anthropic — Claude
  "Claude-User", // Anthropic — user-initiated fetches
  "anthropic-ai", // Anthropic — legacy token
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity user-initiated fetches
  "Google-Extended", // Google — Gemini / AI Overviews grounding
  "Applebot-Extended", // Apple Intelligence
  "CCBot", // Common Crawl (feeds many models)
  "Bingbot", // Bing / Copilot
  "DuckAssistBot", // DuckDuckGo AI
  "cohere-ai",
  "Meta-ExternalAgent",
];

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // Explicitly allowed, same scope as the wildcard.
      { userAgent: AI_CRAWLERS, allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
