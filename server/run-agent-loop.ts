import type { UIMessage } from "ai";
import { streamText } from "ai";

import type { WriteMessageAnnotation } from "@/lib/agent-annotations";
import type { RequestHints } from "@/server/request-hints";
import { searchTavily } from "@/server/search/tavily";
import { answerQuestion } from "@/server/answer-question";
import { getNextAction } from "@/server/get-next-action";
import { SystemContext } from "@/server/system-context";

type AgentLoopResult = ReturnType<typeof streamText>;

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    abortSignal?: AbortSignal;
    langfuseTraceId?: string;
    writeMessageAnnotation?: WriteMessageAnnotation;
    onFinish?: Parameters<typeof streamText>[0]["onFinish"];
    requestHints?: RequestHints;
  } = {},
): Promise<AgentLoopResult> {
  const ctx = SystemContext.fromMessages(messages, opts.requestHints ?? {});
  const writeMessageAnnotation = opts.writeMessageAnnotation ?? (() => {});
  let step = 0;

  while (!ctx.shouldStop()) {
    const nextAction = await getNextAction(ctx, {
      langfuseTraceId: opts.langfuseTraceId,
      functionId: `agent-get-next-action-step-${step}`,
    });

    writeMessageAnnotation({
      type: "NEW_ACTION",
      action: nextAction,
    });

    if (nextAction.type === "search") {
      if (!nextAction.query) {
        throw new Error("Query is required for search action");
      }

      const results = await searchTavily(nextAction.query, opts.abortSignal);

      ctx.reportQueries([
        {
          query: nextAction.query,
          results: results.map((result) => ({
            date: result.publishedDate || new Date().toISOString(),
            title: result.title,
            url: result.link,
            snippet: result.snippet,
          })),
        },
      ]);

      ctx.reportScrapes(
        results.map((result) => ({
          url: result.link,
          result: result.rawContent ?? "Unable to scrape page content.",
        })),
      );

    } else if (nextAction.type === "answer") {
      return await answerQuestion(ctx, {
        isFinal: false,
        langfuseTraceId: opts.langfuseTraceId,
        functionId: "agent-answer-question",
        onFinish: opts.onFinish,
      });
    }

    ctx.incrementStep();
    step++;
  }

  return await answerQuestion(ctx, {
    isFinal: true,
    langfuseTraceId: opts.langfuseTraceId,
    functionId: "agent-answer-question-final",
    onFinish: opts.onFinish,
  });
}
