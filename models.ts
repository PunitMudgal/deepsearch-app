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

/** Model for URL summarization via Groq. */
export const summarizationModel = groq("qwen/qwen3-32b");

/**
 * Secondary model for lightweight tasks (chat titles, eval scorers, etc.)
 * via Groq.
 */
export const secondaryModel = groq("llama-3.1-8b-instant");

/** @deprecated Use `secondaryModel` instead. */
export const factualityModel = secondaryModel;
