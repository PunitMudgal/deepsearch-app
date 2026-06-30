import { generateObject } from "ai";
import { z } from "zod";

import { model } from "@/models";
import { getSystemPrompt } from "@/server/deep-search";
import { createLangfuseTelemetry } from "@/server/langfuse-telemetry";
import type { SystemContext } from "@/server/system-context";

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Searching Saka's injury history', 'Checking HMRC industrial action', 'Comparing toaster ovens'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  type: z
    .enum(["search", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information. Results include scraped page content automatically.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe("The query to search for. Only required if type is 'search'.")
    .optional(),
});

export type Action = z.infer<typeof actionSchema>;

export const getNextAction = async (
  context: SystemContext,
  opts: {
    langfuseTraceId: string | undefined;
    functionId: string;
  },
) => {
  const searchHistory = context.getSearchHistory();

  const result = await generateObject({
    model,
    schema: actionSchema,
    prompt: `
${getSystemPrompt(context.getRequestHints())}

You are deciding the next action in a research loop. Choose exactly one action:

- search: Search the web when you need up-to-date information, facts you're unsure of, or more sources. Provide a focused query. Each search automatically fetches, scrapes, and summarizes the top results. Include the current date or a recent time window when the user asks for "latest" or "recent" information.
- answer: Stop the loop when you have enough information to answer the user's question. Prefer answering from gathered context when possible; do not guess if search returned nothing useful.

For every action, provide a concise title for the UI and clear reasoning for why you chose this step.

Pay close attention to the full conversation history. Follow-up messages like "that's not working" refer to earlier messages — use that context when choosing searches and deciding when to answer.

Conversation history:
${context.getConversationHistory() || "No prior messages."}

Latest user message:
${context.getLatestUserMessage()}

Here is the research context gathered this turn:

${searchHistory || "No searches yet."}
    `,
    experimental_telemetry: createLangfuseTelemetry({
      langfuseTraceId: opts.langfuseTraceId,
      functionId: opts.functionId,
    }),
  });

  return result.object;
};
