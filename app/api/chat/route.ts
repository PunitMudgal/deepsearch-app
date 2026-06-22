import type { UIMessage } from "ai";
import { convertToModelMessages, streamText } from "ai";
import { model } from "@/models";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages: Array<UIMessage>;
  };

  const { messages } = body;

  const result = streamText({
    model,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
