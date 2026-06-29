import type { UIMessage } from "ai";

import { scrapePages } from "@/server/search/scrape-pages";
import { searchTavily } from "@/server/search/tavily";
import { answerQuestion } from "@/server/answer-question";
import { getNextAction } from "@/server/get-next-action";
import {
  SystemContext,
  type QueryResult,
  type ScrapeResult,
} from "@/server/system-context";

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
  abortSignal?: AbortSignal,
) {
  const ctx = SystemContext.fromMessages(messages);

  while (!ctx.shouldStop()) {
    const nextAction = await getNextAction(ctx);

    if (nextAction.type === "search") {
      if (!nextAction.query) {
        ctx.incrementStep();
        continue;
      }

      const results = await searchWeb(nextAction.query, abortSignal);
      const queryResult: QueryResult = {
        query: nextAction.query,
        results,
      };

      ctx.reportQueries([queryResult]);
    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        ctx.incrementStep();
        continue;
      }

      const scrapes: ScrapeResult[] = await scrapeUrls(
        nextAction.urls,
        abortSignal,
      );

      ctx.reportScrapes(scrapes);
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx);
    }

    ctx.incrementStep();
  }

  return answerQuestion(ctx, { isFinal: true });
}
