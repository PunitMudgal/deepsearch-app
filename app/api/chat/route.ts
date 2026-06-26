import type { UIMessage } from "ai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { Langfuse } from "langfuse";
import { z } from "zod";
import { env } from "@/env";
import { model } from "@/models";
import { auth } from "@/server/auth";
import { upsertChat } from "@/server/chat";
import { checkAndRecordRequest } from "@/server/rate-limit";
import { scrapePages } from "@/server/search/scrape-pages";
import { searchTavily } from "@/server/search/tavily";

export const maxDuration = 60;

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
  secretKey: env.LANGFUSE_SECRET_KEY,
  publicKey: env.LANGFUSE_PUBLIC_KEY,
  baseUrl: env.LANGFUSE_BASE_URL,
});

const getSystemPrompt = () => {
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
};

function getChatTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return "New chat";
  }

  const textPart = firstUserMessage.parts.find((part) => part.type === "text");

  if (!textPart || textPart.type !== "text" || !textPart.text.trim()) {
    return "New chat";
  }

  return textPart.text.trim().slice(0, 100);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rateLimitResult = await checkAndRecordRequest(session.user.id);

  if (!rateLimitResult.allowed) {
    return new Response("Too many requests. Please try again tomorrow.", {
      status: 429,
    });
  }

  const body = (await request.json()) as {
    messages: UIMessage[];
    chatId: string;
    isNewChat: boolean;
  };

  const { messages, chatId, isNewChat } = body;
  const title = getChatTitle(messages);

  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  trace.update({
    sessionId: chatId,
  });

  const upsertInitialSpan = trace.span({
    name: "upsert-chat-initial",
    input: {
      userId: session.user.id,
      chatId,
      title,
      messageCount: messages.length,
      isNewChat,
    },
  });

  try {
    await upsertChat({
      userId: session.user.id,
      chatId,
      title,
      messages,
    });

    upsertInitialSpan.end({
      output: { success: true, chatId },
    });
  } catch (error) {
    upsertInitialSpan.end({
      output: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }

  const stream = createUIMessageStream({
    originalMessages: messages,
    generateId,
    execute: async ({ writer }) => {
      if (isNewChat) {
        writer.write({
          type: "data-newChatCreated",
          data: {
            type: "NEW_CHAT_CREATED",
            chatId,
          },
        });
      }

      const result = streamText({
        model,
        system: getSystemPrompt(),
        messages: await convertToModelMessages(messages),
        stopWhen: stepCountIs(8),
        experimental_telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        tools: {
          searchWeb: tool({
            description:
              "Search the web for up-to-date or hard-to-verify information. Use only when the answer needs current data or you lack reliable knowledge — not for every message.",
            inputSchema: z.object({
              query: z
                .string()
                .describe(
                  "A focused search query for the specific information you need",
                ),
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
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: updatedMessages }) => {
      const finishTitle = getChatTitle(updatedMessages);

      const upsertFinishSpan = trace.span({
        name: "upsert-chat-on-finish",
        input: {
          userId: session.user.id,
          chatId,
          title: finishTitle,
          messageCount: updatedMessages.length,
        },
      });

      try {
        await upsertChat({
          userId: session.user.id,
          chatId,
          title: finishTitle,
          messages: updatedMessages,
        });

        upsertFinishSpan.end({
          output: { success: true, chatId },
        });
      } catch (error) {
        upsertFinishSpan.end({
          output: {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
        console.error("Failed to save chat:", error);
      }

      await langfuse.flushAsync();
    },
    onError: (error) => {
      console.error(error);
      if (error instanceof Error) {
        return error.message;
      }

      return "Something went wrong while generating a response.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
