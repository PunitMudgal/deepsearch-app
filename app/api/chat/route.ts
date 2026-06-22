import type { UIMessage } from "ai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { model } from "@/models";
import { auth } from "@/server/auth";
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

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages: Array<UIMessage>;
  };

  const { messages } = body;

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

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error(error);
      if (error instanceof Error) {
        return error.message;
      }

      return "Something went wrong while generating a response.";
    },
  });
}
