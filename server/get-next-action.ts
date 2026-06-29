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
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe("The query to search for. Only required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
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
  const queryHistory = context.getQueryHistory();
  const scrapeHistory = context.getScrapeHistory();

  const result = await generateObject({
    model,
    schema: actionSchema,
    prompt: `
${getSystemPrompt()}

You are deciding the next action in a research loop. Choose exactly one action:

- search: Search the web when you need up-to-date information, facts you're unsure of, or more sources. Provide a focused query. Include the current date or a recent time window when the user asks for "latest" or "recent" information.
- scrape: Scrape specific URLs when snippets are not enough and you need full page content to cite precisely. Pass URLs from prior search results. Typical flow: search → scrape top 1–3 URLs → answer.
- answer: Stop the loop when you have enough information to answer the user's question. Prefer answering from gathered context when possible; do not guess if search/scrape returned nothing useful.

For every action, provide a concise title for the UI and clear reasoning for why you chose this step.

User question:
${context.getInitialQuestion()}

Here is the research context so far:

${queryHistory || "No searches yet."}

${scrapeHistory || "No scrapes yet."}
    `,
    experimental_telemetry: createLangfuseTelemetry({
      langfuseTraceId: opts.langfuseTraceId,
      functionId: opts.functionId,
    }),
  });

  return result.object;
};
