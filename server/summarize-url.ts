import { generateText } from "ai";

import { summarizationModel } from "@/models";
import { createLangfuseTelemetry } from "@/server/langfuse-telemetry";
import {
  buildCacheKey,
  getCachedValue,
  setCachedValue,
} from "@/server/redis/redis";

const CACHE_KEY_PREFIX = "summarizeURL";

const SUMMARIZER_SYSTEM_PROMPT = `You are a research extraction specialist. Given a research topic and raw web content, create a thoroughly detailed synthesis as a cohesive narrative that flows naturally between key concepts.

Extract the most valuable information related to the research topic, including relevant facts, statistics, methodologies, claims, and contextual information. Preserve technical terminology and domain-specific language from the source material.

Structure your synthesis as a coherent document with natural transitions between ideas. Begin with an introduction that captures the core thesis and purpose of the source material. Develop the narrative by weaving together key findings and their supporting details, ensuring each concept flows logically to the next.

Integrate specific metrics, dates, and quantitative information within their proper context. Explore how concepts interconnect within the source material, highlighting meaningful relationships between ideas. Acknowledge limitations by noting where information related to aspects of the research topic may be missing or incomplete.

Important guidelines:
- Maintain original data context (e.g., "2024 study of 150 patients" rather than generic "recent study")
- Preserve the integrity of information by keeping details anchored to their original context
- Create a cohesive narrative rather than disconnected bullet points or lists
- Use paragraph breaks only when transitioning between major themes

Critical Reminder: If content lacks a specific aspect of the research topic, clearly state that in the synthesis, and you should NEVER make up information and NEVER rely on external knowledge.`;

export type SummarizeURLInput = {
  query: string;
  conversationHistory: string;
  metadata: {
    date: string;
    title: string;
    url: string;
    snippet: string;
  };
  scrapedContent: string;
};

function buildSummarizePrompt(input: SummarizeURLInput): string {
  return `Research topic (search query): ${input.query}

Conversation history for context:
${input.conversationHistory || "No prior conversation."}

Source metadata:
- Title: ${input.metadata.title}
- URL: ${input.metadata.url}
- Date: ${input.metadata.date}
- Snippet: ${input.metadata.snippet}

Raw web content to summarize:
${input.scrapedContent}`;
}

export async function summarizeURL(
  input: SummarizeURLInput,
  opts: { langfuseTraceId: string | undefined },
): Promise<string> {
  const cacheKey = buildCacheKey(CACHE_KEY_PREFIX, input);
  const cachedResult = await getCachedValue<string>(cacheKey);

  if (cachedResult !== null) {
    console.log(`Cache hit for ${CACHE_KEY_PREFIX}`);
    return cachedResult;
  }

  const { text } = await generateText({
    model: summarizationModel,
    system: SUMMARIZER_SYSTEM_PROMPT,
    prompt: buildSummarizePrompt(input),
    experimental_telemetry: createLangfuseTelemetry({
      langfuseTraceId: opts.langfuseTraceId,
      functionId: "summarize-url",
    }),
  });

  const summary = text.trim();
  await setCachedValue(cacheKey, summary);

  return summary;
}
