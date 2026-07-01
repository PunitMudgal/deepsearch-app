import type { UIMessage } from "ai";
import { streamText } from "ai";

import type { WriteMessageAnnotation } from "@/lib/agent-annotations";
import type { RequestHints } from "@/server/request-hints";
import { searchTavily } from "@/server/search/tavily";
import { summarizeURL } from "@/server/summarize-url";
import { answerQuestion } from "@/server/answer-question";
import { getNextAction } from "@/server/get-next-action";
import { queryRewriter } from "@/server/query-rewriter";
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

  const results = await Promise.all(
    searchResults.map(async (result) => {
      const date = result.publishedDate ?? "Unknown date";
      const title = result.title;
      const url = result.link;
      const snippet = result.snippet;
      const scrapedContent =
        result.rawContent ?? "Unable to scrape page content.";

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
    const rewrite = await queryRewriter(ctx, {
      langfuseTraceId: opts.langfuseTraceId,
      functionId: `agent-query-rewriter-step-${step}`,
    });

    writeMessageAnnotation({
      type: "NEW_PLAN",
      title: rewrite.title,
      plan: rewrite.plan,
      queries: rewrite.queries,
    });

    const queries = rewrite.queries.filter((query) => query.trim().length > 0);

    if (queries.length > 0) {
      const searchEntries = await Promise.all(
        queries.map((query) =>
          searchScrapeAndSummarize(
            query,
            ctx.getConversationHistory(),
            opts.langfuseTraceId,
            opts.abortSignal,
          ),
        ),
      );

      for (const searchEntry of searchEntries) {
        ctx.reportSearch(searchEntry);
      }
    }

    const nextAction = await getNextAction(ctx, {
      langfuseTraceId: opts.langfuseTraceId,
      functionId: `agent-get-next-action-step-${step}`,
    });

    writeMessageAnnotation({
      type: "NEW_ACTION",
      action: nextAction,
    });

    if (nextAction.type === "answer") {
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
