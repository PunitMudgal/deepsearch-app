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

const systemPrompt = `You are a helpful research assistant with access to a web search tool.

For every user message, you MUST call the searchWeb tool before answering so your responses are grounded in current information from the web.

When you answer:
- Use the search results as your primary source of truth
- Always cite sources with markdown links: [descriptive title](https://example.com)
- Never paste bare URLs in the response — every URL must be wrapped in markdown link syntax
- When referencing a source, use the page title (or a short descriptive label) as the link text, not the raw URL
- Prefer multiple inline citations when several sources support your answer
- If search returns no useful results, say so clearly instead of guessing`;

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
            description: "Search the web for up-to-date information on a topic",
            inputSchema: z.object({
              query: z.string().describe("The query to search the web for"),
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
