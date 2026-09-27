import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

import { env } from "@/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

/** Primary model for the research agent (search and answer). */
export const model = google("gemini-2.5-flash");

/** Model for URL summarization via OpenRouter. */
// export const summarizationModel = openrouter.chatModel("qwen/qwen3-coder:free");
export const summarizationModel = groq("openai/gpt-oss-20b");

/**
 * Secondary model for lightweight tasks (chat titles, eval scorers, etc.)
 * via Groq.
 */
export const secondaryModel = groq("qwen/qwen3.8-27b");

/** @deprecated Use `secondaryModel` instead. */
export const factualityModel = secondaryModel;
