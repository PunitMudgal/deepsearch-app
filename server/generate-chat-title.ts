import { generateText, isTextUIPart, type UIMessage } from "ai";

import { secondaryModel } from "@/models";
import { createLangfuseTelemetry } from "@/server/langfuse-telemetry";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n");
}

export function getFallbackChatTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return "New chat";
  }

  const text = getMessageText(firstUserMessage).trim();

  if (!text) {
    return "New chat";
  }

  return text.length > 50 ? `${text.slice(0, 50)}...` : text;
}

export async function generateChatTitle(
  messages: UIMessage[],
  opts: { langfuseTraceId: string | undefined } = {
    langfuseTraceId: undefined,
  },
): Promise<string> {
  try {
    const { text } = await generateText({
      model: secondaryModel,
      system: `You are a chat title generator.
You will be given a chat history, and you will need to generate a title for the chat.
The title should be a single sentence that captures the essence of the chat.
The title should be no more than 50 characters.
The title should be in the same language as the chat history.
Return only the title, with no quotes or punctuation at the end.`,
      prompt: `Here is the chat history:

${messages.map((message) => `${message.role}: ${getMessageText(message)}`).join("\n\n")}`,
      experimental_telemetry: createLangfuseTelemetry({
        langfuseTraceId: opts.langfuseTraceId,
        functionId: "generate-chat-title",
      }),
    });

    const trimmed = text.trim();

    if (trimmed) {
      return trimmed.slice(0, 50);
    }
  } catch (error) {
    console.error("Failed to generate chat title:", error);
  }

  return getFallbackChatTitle(messages);
}
