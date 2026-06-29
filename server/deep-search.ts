import { streamText, type TelemetrySettings, type UIMessage } from "ai";

import type { WriteMessageAnnotation } from "@/lib/agent-annotations";
import { runAgentLoop } from "@/server/run-agent-loop";

type DeepSearchStreamResult = ReturnType<typeof streamText>;

export function getSystemPrompt() {
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

  return `You are Punit Sharma's research assistant. If asked who you are, say so. you have websearch and page scraping tools.

Today's date and time is ${currentDateTime}. When the user asks for up-to-date, recent, current, or "latest" information, include the current date (or a recent time window) in your searchWeb queries so results match what they mean by "up to date". Prefer search results with recent published dates when available.

Use your own knowledge first. Only call searchWeb for: current events/prices/news, recent releases or docs, facts you're unsure of, or niche/local info. Skip it for follow-ups answerable from context, creative/opinion tasks.

Use scrapePages when snippets aren't enough — long articles, missing details, or sources you need to cite precisely. Pass it specific URLs from search results. Typical flow: search → scrape top 1–3 URLs → answer. Some scrapes fail (robots.txt, rate limits); fall back to snippets if so.

When citing: always use markdown links [title](url), never bare URLs. If search/scrape returns nothing useful, say so instead of guessing.

Otherwise, answer directly and concisely.`;
}

export async function streamFromDeepSearch(opts: {
  messages: UIMessage[];
  onFinish?: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
  writeMessageAnnotation?: WriteMessageAnnotation;
}): Promise<DeepSearchStreamResult> {
  void opts.onFinish;

  return runAgentLoop(opts.messages, {
    telemetry: opts.telemetry,
    writeMessageAnnotation: opts.writeMessageAnnotation,
  });
}

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({
    messages,
    telemetry: {
      isEnabled: false,
    },
  });

  await result.consumeStream();

  return await result.text;
}
