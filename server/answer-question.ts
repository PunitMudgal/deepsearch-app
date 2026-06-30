import { convertToModelMessages, smoothStream, streamText } from "ai";

import { markdownJoinerTransform } from "@/lib/markdown-joiner-transform";
import { model } from "@/models";
import { getSystemPrompt } from "@/server/deep-search";
import { createLangfuseTelemetry } from "@/server/langfuse-telemetry";
import type { SystemContext } from "@/server/system-context";

type AnswerQuestionResult = ReturnType<typeof streamText>;

function buildAnswerSystemPrompt(
  context: SystemContext,
  finalNote: string,
): string {
  const searchHistory = context.getSearchHistory();

  return `${getSystemPrompt(context.getRequestHints())}

${finalNote}You are answering the user's latest message in the context of the full conversation provided.

Research gathered this turn:

${searchHistory || "No searches yet."}

Answer based on the conversation and research context above. Follow-up messages refer to earlier turns — do not treat them as standalone questions. When citing sources, always use markdown links [title](url), never bare URLs. If search returned nothing useful, say so instead of guessing.`;
}

export async function answerQuestion(
  context: SystemContext,
  opts: {
    isFinal?: boolean;
    langfuseTraceId: string | undefined;
    functionId: string;
    onFinish: Parameters<typeof streamText>[0]["onFinish"];
  },
): Promise<AnswerQuestionResult> {
  const finalNote = opts.isFinal
    ? `We may not have all the information we need to answer the question, but we need to make our best effort based on the research gathered so far.

`
    : "";

  return streamText({
    model,
    system: buildAnswerSystemPrompt(context, finalNote),
    messages: await convertToModelMessages(context.getMessages()),
    experimental_transform: [
      markdownJoinerTransform(),
      smoothStream({
        delayInMs: 20,
        chunking: "line",
      }),
    ],
    experimental_telemetry: createLangfuseTelemetry({
      langfuseTraceId: opts.langfuseTraceId,
      functionId: opts.functionId,
    }),
    onFinish: opts.onFinish,
  });
}
