import type { UIMessage } from "ai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "@/env";
import type { OurMessageAnnotation } from "@/lib/agent-annotations";
import { auth } from "@/server/auth";
import { type StoredUIMessage, upsertChat } from "@/server/chat";
import { streamFromDeepSearch } from "@/server/deep-search";
import { checkAndRecordRequest } from "@/server/rate-limit";
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

function attachAnnotationsToLastMessage(
  chatMessages: UIMessage[],
  annotations: OurMessageAnnotation[],
): StoredUIMessage[] {
  if (chatMessages.length === 0 || annotations.length === 0) {
    return chatMessages;
  }

  const lastIndex = chatMessages.length - 1;
  const lastMessage = chatMessages[lastIndex];

  if (!lastMessage || lastMessage.role !== "assistant") {
    return chatMessages;
  }

  return [
    ...chatMessages.slice(0, lastIndex),
    {
      ...lastMessage,
      annotations,
    },
  ];
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

  const annotations: OurMessageAnnotation[] = [];
  let resolveMessages: ((messages: StoredUIMessage[]) => void) | null = null;
  const messagesReady = new Promise<StoredUIMessage[]>((resolve) => {
    resolveMessages = resolve;
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
            chatId,
          },
        });
      }

      const writeMessageAnnotation = (annotation: OurMessageAnnotation) => {
        annotations.push(annotation);
        writer.write({
          type: "data-newAction",
          data: annotation,
        });
      };

      const result = await streamFromDeepSearch({
        messages,
        langfuseTraceId: trace.id,
        writeMessageAnnotation,
        onFinish: async () => {
          const messagesWithAnnotations = await messagesReady;
          const lastMessage =
            messagesWithAnnotations[messagesWithAnnotations.length - 1];

          if (!lastMessage) {
            return;
          }

          lastMessage.annotations = annotations;

          const finishTitle = getChatTitle(messagesWithAnnotations);

          const upsertFinishSpan = trace.span({
            name: "upsert-chat-on-finish",
            input: {
              userId: session.user.id,
              chatId,
              title: finishTitle,
              messageCount: messagesWithAnnotations.length,
            },
          });

          try {
            await upsertChat({
              userId: session.user.id,
              chatId,
              title: finishTitle,
              messages: messagesWithAnnotations,
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
      });

      writer.merge(result.toUIMessageStream());
    },
    onFinish: async ({ messages: updatedMessages }) => {
      resolveMessages?.(
        attachAnnotationsToLastMessage(updatedMessages, annotations),
      );
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
