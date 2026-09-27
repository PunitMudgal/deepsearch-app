import { generateObject } from "ai";
import { z } from "zod";

import { model } from "@/models";
import { createLangfuseTelemetry } from "@/server/langfuse-telemetry";
import type { SystemContext } from "@/server/system-context";

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "Concise action title for the UI, e.g. 'Searching Saka's injury history'.",
    ),
  reasoning: z.string().describe("One short sentence on why this step."),
  type: z.enum(["search", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
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
): Promise<Action> => {
  try {
    const result = await generateObject({
      model,
      schema: actionSchema,
      system: `
      You are a helpful AI assistant that can search the web or answer questions. Your goal is to determine the next best action to take based on the current context.
      `,
      prompt: `
Message History:
${context.getConversationHistory() || "No prior messages."}

Choose the next action:
1. If you need more information, use 'search' with a relevant query.
2. If you have enough information to answer, use 'answer'.

Search history so far (titles, URLs and snippets only):

${context.getQueryHistory() || "No searches yet."}
      `,
      experimental_telemetry: createLangfuseTelemetry({
        langfuseTraceId: opts.langfuseTraceId,
        functionId: opts.functionId,
      }),
    });

    return result.object;
  } catch (error) {
    console.error("Failed to get next action:", error);
    return {
      title: "Answering question",
      reasoning: "Failed to determine next action, defaulting to answer.",
      type: "answer",
    };
  }
};
