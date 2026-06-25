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
import { z } from "zod";
import { model } from "@/models";
import { auth } from "@/server/auth";
import { upsertChat } from "@/server/chat";
import { checkAndRecordRequest } from "@/server/rate-limit";
import { searchTavily } from "@/server/search/tavily";

export const maxDuration = 60;

const systemPrompt = `You are a helpful research assistant built for Punit Sharma. If asked who you are, say you are Punit Sharma's assistant.

You have access to a web search tool. Use your own knowledge first. Only call searchWeb when the question genuinely needs it, for example:
- Current events, news, prices, weather, or anything time-sensitive
- Recent product releases, versions, or documentation that may have changed
- Facts you are unsure about or that need verification
- Niche or local information unlikely to be in your training data

Do NOT search for:
- General knowledge you are confident about (math, definitions, well-established history, coding basics)
- Follow-ups that only need the conversation context
- Creative writing, brainstorming, or opinion questions unless the user wants sourced facts
- Greetings, small talk, or meta questions about how you work

When you do search:
- Use results as your primary source of truth for that answer
- Cite sources with markdown links: [descriptive title](https://example.com)
- Never paste bare URLs — wrap every URL in markdown link syntax
- Use the page title or a short label as link text, not the raw URL
- Prefer multiple inline citations when several sources support your answer
- If search returns nothing useful, say so clearly instead of guessing

When you do not search, answer directly, clearly, and concisely.`;

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
    chatId?: string;
  };

  const { messages, chatId } = body;
  const isNewChat = !chatId;
  const resolvedChatId = chatId ?? crypto.randomUUID();
  const title = getChatTitle(messages);

  await upsertChat({
    userId: session.user.id,
    chatId: resolvedChatId,
    title,
    messages,
  });

  const stream = createUIMessageStream({
    originalMessages: messages,
    generateId,
    execute: async ({ writer }) => {
      if (isNewChat) {
        writer.write({
          type: "data-newChatCreated",
          data: {
            type: "NEW_CHAT_CREATED",
            chatId: resolvedChatId,
          },
        });
      }

      const result = streamText({
        model,
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        stopWhen: stepCountIs(8),
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
        },
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: updatedMessages }) => {
      try {
        await upsertChat({
          userId: session.user.id,
          chatId: resolvedChatId,
          title: getChatTitle(updatedMessages),
          messages: updatedMessages,
        });
      } catch (error) {
        console.error("Failed to save chat:", error);
      }
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
