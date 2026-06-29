import { smoothStream, streamText, type TelemetrySettings } from "ai";

import { markdownJoinerTransform } from "@/lib/markdown-joiner-transform";
import { model } from "@/models";
import { getSystemPrompt } from "@/server/deep-search";
import type { SystemContext } from "@/server/system-context";

type AnswerQuestionResult = ReturnType<typeof streamText>;

export function answerQuestion(
  context: SystemContext,
  opts: { isFinal?: boolean; telemetry?: TelemetrySettings } = {},
): AnswerQuestionResult {
  const finalNote = opts.isFinal
    ? `We may not have all the information we need to answer the question, but we need to make our best effort based on the research gathered so far.

`
    : "";

  const queryHistory = context.getQueryHistory();
  const scrapeHistory = context.getScrapeHistory();

  return streamText({
    model,
    system: getSystemPrompt(),
    prompt: `${finalNote}User question:
${context.getInitialQuestion()}

Research context:

${queryHistory || "No searches yet."}

${scrapeHistory || "No scrapes yet."}

Answer the user's question based on the research context above. When citing sources, always use markdown links [title](url), never bare URLs. If search/scrape returned nothing useful, say so instead of guessing.`,
    experimental_transform: [
      markdownJoinerTransform(),
      smoothStream({
        delayInMs: 20,
        chunking: "line",
      }),
    ],
    experimental_telemetry: opts.telemetry,
  });
}
