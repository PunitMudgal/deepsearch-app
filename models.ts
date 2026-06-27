import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { env } from "@/env";

const google = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const model = google("gemini-2.5-flash");

export const factualityModel = google("gemini-1.5-flash");
