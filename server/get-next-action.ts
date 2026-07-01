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
      "The title of the action, to be displayed in the UI. Be extremely concise. 'Enough context to answer', 'Need more sources'",
    ),
  reasoning: z.string().describe("The reason you chose this step."),
  type: z
    .enum(["continue", "answer"])
    .describe(
      `The type of action to take.
      - 'continue': More research is needed before answering.
      - 'answer': Enough information has been gathered to answer the user's question.`,
    ),
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

You are deciding whether the research loop should continue or whether there is enough information to answer the user's question.

Choose exactly one action:

- continue: More research is needed. The searches just completed did not provide enough information, or important gaps remain.
- answer: Stop the loop and answer the question. Prefer answering from gathered context when possible; do not guess if search returned nothing useful.

For every action, provide a concise title for the UI and clear reasoning for why you chose this step.

Pay close attention to the full conversation history. Follow-up messages like "that's not working" refer to earlier messages.

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
