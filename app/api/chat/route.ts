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
import { generateChatTitle } from "@/server/generate-chat-title";
import { getRequestHints } from "@/server/request-hints";
import { checkAndRecordRequest } from "@/server/rate-limit";
import {
  checkRateLimit,
  GLOBAL_LLM_RATE_LIMIT_CONFIG,
  recordRateLimit,
} from "@/server/redis/rate-limit";

export const maxDuration = 60;
export const runtime = "nodejs";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
  secretKey: env.LANGFUSE_SECRET_KEY,
  publicKey: env.LANGFUSE_PUBLIC_KEY,
  baseUrl: env.LANGFUSE_BASE_URL,
});

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

  const requestHints = getRequestHints(request);

  const body = (await request.json()) as {
    messages: UIMessage[];
    chatId: string;
    isNewChat: boolean;
  };

  const { messages, chatId, isNewChat } = body;

  const trace = langfuse.trace({
    name: "chat",
    userId: session.user.id,
  });

  trace.update({
    sessionId: chatId,
  });

  const titlePromise = isNewChat
    ? generateChatTitle(messages, { langfuseTraceId: trace.id })
    : Promise.resolve("");

  const upsertInitialSpan = trace.span({
    name: "upsert-chat-initial",
    input: {
      userId: session.user.id,
      chatId,
      title: isNewChat ? "Generating..." : undefined,
      messageCount: messages.length,
      isNewChat,
    },
  });

  try {
    await upsertChat({
      userId: session.user.id,
      chatId,
      ...(isNewChat ? { title: "Generating..." } : {}),
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

      // Start deep search in parallel with title generation
      const deepSearchPromise = streamFromDeepSearch({
        messages,
        requestHints,
        langfuseTraceId: trace.id,
        writeMessageAnnotation,
      });

      // If new chat, update the title in DB and send it via stream as soon as it's ready
      const titleUpdatePromise = isNewChat
        ? (async () => {
            const generatedTitle = await titlePromise;

            // Send title to the frontend immediately via stream data
            writer.write({
              type: "data-newChatTitle",
              data: {
                type: "CHAT_TITLE_UPDATED",
                chatId,
                title: generatedTitle,
              },
            });

            // Update DB with the real title so sidebar fetches see it
            await upsertChat({
              userId: session.user.id,
              chatId,
              title: generatedTitle,
              messages,
            });
          })()
        : Promise.resolve();

      const result = await deepSearchPromise;
      writer.merge(result.toUIMessageStream());

      // Ensure title has been sent before finishing (usually already resolved)
      await titleUpdatePromise;
    },
    onFinish: async ({ messages: updatedMessages }) => {
      const messagesWithAnnotations = attachAnnotationsToLastMessage(
        updatedMessages,
        annotations,
      );

      const upsertFinishSpan = trace.span({
        name: "upsert-chat-on-finish",
        input: {
          userId: session.user.id,
          chatId,
          title: isNewChat ? undefined : undefined,
          messageCount: messagesWithAnnotations.length,
        },
      });

      try {
        // For new chats, title is already updated in DB from execute;
        // just save the updated messages
        await upsertChat({
          userId: session.user.id,
          chatId,
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
