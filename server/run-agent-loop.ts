import type { UIMessage } from "ai";
import { streamText } from "ai";

import type { WriteMessageAnnotation } from "@/lib/agent-annotations";
import { scrapePages } from "@/server/search/scrape-pages";
import { searchTavily } from "@/server/search/tavily";
import { answerQuestion } from "@/server/answer-question";
import { getNextAction } from "@/server/get-next-action";
import {
  SystemContext,
  type QueryResult,
  type ScrapeResult,
} from "@/server/system-context";

type AgentLoopResult = ReturnType<typeof streamText>;

async function searchWeb(query: string, abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) {
    throw abortSignal.reason ?? new Error("Aborted");
  }

  const results = await searchTavily(query, abortSignal);

  return results.map((result) => ({
    date: result.publishedDate ?? "Unknown date",
    title: result.title,
    url: result.link,
    snippet: result.snippet,
  }));
}

async function scrapeUrls(urls: string[], abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) {
    throw abortSignal.reason ?? new Error("Aborted");
  }

  const result = await scrapePages(urls);

  if (result.success) {
    return result.results.map(({ url, result: crawlResult }) => ({
      url,
      result: crawlResult.data,
    }));
  }

  return result.results.map(({ url, result: crawlResult }) => ({
    url,
    result: crawlResult.success
      ? crawlResult.data
      : `Error: ${crawlResult.error}`,
  }));
}

export async function runAgentLoop(
  messages: UIMessage[],
  opts: {
    abortSignal?: AbortSignal;
    langfuseTraceId?: string;
    writeMessageAnnotation?: WriteMessageAnnotation;
  } = {},
): Promise<AgentLoopResult> {
  const ctx = SystemContext.fromMessages(messages);
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
        ctx.incrementStep();
        step++;
        continue;
      }

      const results = await searchWeb(nextAction.query, opts.abortSignal);
      const queryResult: QueryResult = {
        query: nextAction.query,
        results,
      };

      ctx.reportQueries([queryResult]);
    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        ctx.incrementStep();
        step++;
        continue;
      }

      const scrapes: ScrapeResult[] = await scrapeUrls(
        nextAction.urls,
        opts.abortSignal,
      );

      ctx.reportScrapes(scrapes);
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, {
        langfuseTraceId: opts.langfuseTraceId,
        functionId: "agent-answer-question",
      });
    }

    ctx.incrementStep();
    step++;
  }

  return answerQuestion(ctx, {
    isFinal: true,
    langfuseTraceId: opts.langfuseTraceId,
    functionId: "agent-answer-question-final",
  });
}
