import type { UIMessage } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "@/env";
import { auth } from "@/server/auth";
import { upsertChat } from "@/server/chat";
import { streamFromDeepSearch } from "@/server/deep-search";
import { checkAndRecordRequest } from "@/server/rate-limit";
import type { OurMessageAnnotation } from "@/lib/agent-annotations";
import {
  checkRateLimit,
  GLOBAL_LLM_RATE_LIMIT_CONFIG,
  recordRateLimit,
} from "@/server/redis/rate-limit";

export const maxDuration = 60;

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
  secretKey: env.LANGFUSE_SECRET_KEY,
  publicKey: env.LANGFUSE_PUBLIC_KEY,
  baseUrl: env.LANGFUSE_BASE_URL,
});

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

  const rateLimitCheck = await checkRateLimit(GLOBAL_LLM_RATE_LIMIT_CONFIG);

  if (!rateLimitCheck.allowed) {
    console.log("Rate limit exceeded, waiting...");
    const isAllowed = await rateLimitCheck.retry();

    if (!isAllowed) {
      return new Response("Rate limit exceeded", {
        status: 429,
      });
    }
  }

  await recordRateLimit(GLOBAL_LLM_RATE_LIMIT_CONFIG);

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

      const result = await streamFromDeepSearch({
        messages,
        writeMessageAnnotation: (annotation: OurMessageAnnotation) => {
          writer.write({
            type: "data-newAction",
            data: annotation,
          });
        },
        telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
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
