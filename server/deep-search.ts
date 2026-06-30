import { streamText, type UIMessage } from "ai";

import type { WriteMessageAnnotation } from "@/lib/agent-annotations";
import { runAgentLoop } from "@/server/run-agent-loop";

import type { RequestHints } from "@/server/request-hints";
import { getRequestPromptFromHints } from "@/server/request-hints";

type DeepSearchStreamResult = ReturnType<typeof streamText>;

export function getSystemPrompt(requestHints: RequestHints = {}) {
  const now = new Date();
  const currentDateTime = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  });

  const locationPrompt = getRequestPromptFromHints(requestHints);

  return `You are DeepSearch, a research assistant with web search and page scraping capabilities. Answer the user's question directly. Do not introduce yourself or mention who built you unless the user explicitly asks.
${locationPrompt ? `\n${locationPrompt}\n` : ""}
Today's date and time is ${currentDateTime}. When the user asks for up-to-date, recent, current, or "latest" information, include the current date (or a recent time window) in your searchWeb queries so results match what they mean by "up to date". Prefer search results with recent published dates when available.

Use your own knowledge first. Only search when you need: current events/prices/news, recent releases or docs, facts you're unsure of, or niche/local info. Skip searching for follow-ups answerable from context or creative/opinion tasks.

Each search automatically scrapes the top results, giving you full page content alongside snippets. Some pages may fail to scrape (robots.txt, rate limits); use snippets when that happens.

When citing: always use markdown links [title](url), never bare URLs. If search returned nothing useful, say so instead of guessing.

Otherwise, answer directly and concisely.`;
}

export async function streamFromDeepSearch(opts: {
  messages: UIMessage[];
  requestHints?: RequestHints;
  onFinish?: Parameters<typeof streamText>[0]["onFinish"];
  langfuseTraceId?: string;
  writeMessageAnnotation?: WriteMessageAnnotation;
}): Promise<DeepSearchStreamResult> {
  return runAgentLoop(opts.messages, {
    langfuseTraceId: opts.langfuseTraceId,
    writeMessageAnnotation: opts.writeMessageAnnotation,
    onFinish: opts.onFinish,
    requestHints: opts.requestHints,
  });
}

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({
    messages,
  });

  await result.consumeStream();

  return await result.text;
}
