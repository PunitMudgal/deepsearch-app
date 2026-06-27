import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type StreamTextOnFinishCallback,
  type TelemetrySettings,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { model } from "@/models";
import { scrapePages } from "@/server/search/scrape-pages";
import { searchTavily } from "@/server/search/tavily";

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

const deepSearchTools = {
  searchWeb: tool({
    description:
      "Search the web for up-to-date or hard-to-verify information. Use only when the answer needs current data or you lack reliable knowledge — not for every message.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("A focused search query for the specific information you need"),
    }),
    execute: async ({ query }, { abortSignal }) => {
      return searchTavily(query, abortSignal);
    },
  }),
  scrapePages: tool({
    description:
      "Fetch the full text of web pages as markdown. Use after searchWeb when snippets are insufficient and you need complete page content from specific URLs.",
    inputSchema: z.object({
      urls: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe("URLs to scrape for full page content"),
    }),
    execute: async ({ urls }, { abortSignal }) => {
      if (abortSignal?.aborted) {
        throw abortSignal.reason ?? new Error("Aborted");
      }

      const result = await scrapePages(urls);

      if (result.success) {
        return {
          pages: result.results.map(({ url, result: crawlResult }) => ({
            url,
            markdown: crawlResult.data,
          })),
        };
      }

      return {
        error: result.error,
        pages: result.results.map(({ url, result: crawlResult }) =>
          crawlResult.success
            ? { url, markdown: crawlResult.data }
            : { url, error: crawlResult.error },
        ),
      };
    },
  }),
} satisfies ToolSet;

export async function streamFromDeepSearch(opts: {
  messages: UIMessage[];
  onFinish?: StreamTextOnFinishCallback<typeof deepSearchTools>;
  telemetry: TelemetrySettings;
}) {
  return streamText({
    model,
    system: getSystemPrompt(),
    messages: await convertToModelMessages(opts.messages),
    stopWhen: stepCountIs(8),
    tools: deepSearchTools,
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });
}

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({
    messages,
    onFinish: () => {},
    telemetry: {
      isEnabled: false,
    },
  });

  await result.consumeStream();

  return result.text;
}
