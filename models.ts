import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

const openrouter = createOpenAICompatible({
  name: "openrouter",
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/** Primary model for the research agent (search and answer). */
export const model = google("gemini-2.5-flash");

/** Model for URL summarization via OpenRouter. */
export const summarizationModel = openrouter.chatModel("qwen/qwen3-coder:free");

/**
 * Secondary model for lightweight tasks (chat titles, eval scorers, etc.)
 * via Groq.
 */
export const secondaryModel = groq("llama-3.1-8b-instant");

/** @deprecated Use `secondaryModel` instead. */
export const factualityModel = secondaryModel;
