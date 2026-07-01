import { generateObject } from "ai";
import { z } from "zod";

import { model } from "@/models";
import { getSystemPrompt } from "@/server/deep-search";
import { createLangfuseTelemetry } from "@/server/langfuse-telemetry";
import type { SystemContext } from "@/server/system-context";

export const queryRewriteSchema = z.object({
  title: z
    .string()
    .describe(
      "A concise title for the UI. e.g. 'Planning Avengers release search', 'Mapping India cricket schedule'",
    ),
  plan: z
    .string()
    .describe(
      "A strategic research plan explaining the logical progression of information needed to answer the question.",
    ),
  queries: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "3-5 sequential search queries that progress logically from foundational to specific information.",
    ),
});

export type QueryRewriteResult = z.infer<typeof queryRewriteSchema>;

const PLANNING_PROMPT = `You are a strategic research planner with expertise in breaking down complex questions into logical search steps. Your primary role is to create a detailed research plan before generating any search queries.

First, analyze the question thoroughly:
- Break down the core components and key concepts
- Identify any implicit assumptions or context needed
- Consider what foundational knowledge might be required
- Think about potential information gaps that need filling

Then, develop a strategic research plan that:
- Outlines the logical progression of information needed
- Identifies dependencies between different pieces of information
- Considers multiple angles or perspectives that might be relevant
- Anticipates potential dead-ends or areas needing clarification

Finally, translate this plan into a numbered list of 3-5 sequential search queries that:
- Are specific and focused (avoid broad queries that return general information)
- Are written in natural language without Boolean operators (no AND/OR)
- Progress logically from foundational to specific information
- Build upon each other in a meaningful way

Remember that initial queries can be exploratory - they help establish baseline information or verify assumptions before proceeding to more targeted searches. Each query should serve a specific purpose in your overall research plan.`;

export async function queryRewriter(
  context: SystemContext,
  opts: {
    langfuseTraceId: string | undefined;
    functionId: string;
  },
): Promise<QueryRewriteResult> {
  const searchHistory = context.getSearchHistory();

  const result = await generateObject({
    model,
    schema: queryRewriteSchema,
    prompt: `
${getSystemPrompt(context.getRequestHints())}

${PLANNING_PROMPT}

Pay close attention to the full conversation history. Follow-up messages like "that's not working" refer to earlier messages — use that context when planning.

Conversation history:
${context.getConversationHistory() || "No prior messages."}

Latest user message:
${context.getLatestUserMessage()}

Research gathered so far this turn:
${searchHistory || "No searches yet."}

If research has already been gathered, plan only the additional searches needed — do not repeat queries that have already been run unless a different angle is required.
    `,
    experimental_telemetry: createLangfuseTelemetry({
      langfuseTraceId: opts.langfuseTraceId,
      functionId: opts.functionId,
    }),
  });

  return result.object;
}
