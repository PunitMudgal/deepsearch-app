import type { UIMessage } from "ai";
import { streamText } from "ai";

import type { WriteMessageAnnotation } from "@/lib/agent-annotations";
import type { RequestHints } from "@/server/request-hints";
import { scrapePages } from "@/server/search/scrape-pages";
import { searchTavily } from "@/server/search/tavily";
import { summarizeURL } from "@/server/summarize-url";
import { answerQuestion } from "@/server/answer-question";
import { getNextAction } from "@/server/get-next-action";
import {
  SystemContext,
  type SearchHistoryEntry,
} from "@/server/system-context";

type AgentLoopResult = ReturnType<typeof streamText>;

async function searchScrapeAndSummarize(
  query: string,
  conversationHistory: string,
  langfuseTraceId: string | undefined,
  abortSignal?: AbortSignal,
): Promise<SearchHistoryEntry> {
  if (abortSignal?.aborted) {
    throw abortSignal.reason ?? new Error("Aborted");
  }

  const searchResults = await searchTavily(query, abortSignal);
  const urls = searchResults.map((result) => result.link);

  const scrapeResult = await scrapePages(urls);
  const scrapedContentByUrl = new Map(
    scrapeResult.results.map(({ url, result: crawlResult }) => [
      url,
      crawlResult.success
        ? crawlResult.data
        : `Error: ${crawlResult.error}`,
    ]),
  );

  const results = await Promise.all(
    searchResults.map(async (result) => {
      const date = result.publishedDate ?? "Unknown date";
      const title = result.title;
      const url = result.link;
      const snippet = result.snippet;
      const scrapedContent =
        scrapedContentByUrl.get(url) ?? "Unable to scrape page content.";

      const summary = await summarizeURL(
        {
          query,
          conversationHistory,
          metadata: {
            date,
            title,
            url,
            snippet,
          },
          scrapedContent,
        },
        { langfuseTraceId },
      );

      return {
        date,
        title,
        url,
        snippet,
        summary,
      };
    }),
  );

  return {
    query,
    results,
  };
}

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
        ctx.incrementStep();
        step++;
        continue;
      }

      const searchEntry = await searchScrapeAndSummarize(
        nextAction.query,
        ctx.getConversationHistory(),
        opts.langfuseTraceId,
        opts.abortSignal,
      );

      ctx.reportSearch(searchEntry);
    } else if (nextAction.type === "answer") {
      return await answerQuestion(ctx, {
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
