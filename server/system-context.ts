import type { UIMessage } from "ai";

import type { RequestHints } from "@/server/request-hints";

type SearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
  scrapedContent: string;
};

type SearchHistoryEntry = {
  query: string;
  results: SearchResult[];
};

function getLatestUserMessageFromMessages(messages: UIMessage[]): string {
  const userMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  const textPart = userMessage?.parts.find((part) => part.type === "text");

  if (!textPart || textPart.type !== "text") {
    return "";
  }

  return textPart.text;
}

export class SystemContext {
  private step = 0;
  private searchHistory: SearchHistoryEntry[] = [];
  private messages: UIMessage[];
  private requestHints: RequestHints;

  constructor(messages: UIMessage[], requestHints: RequestHints = {}) {
    this.messages = messages;
    this.requestHints = requestHints;
  }

  static fromMessages(
    messages: UIMessage[],
    requestHints: RequestHints = {},
  ): SystemContext {
    return new SystemContext(messages, requestHints);
  }

  getRequestHints(): RequestHints {
    return this.requestHints;
  }

  getMessages(): UIMessage[] {
    return this.messages;
  }

  getLatestUserMessage(): string {
    return getLatestUserMessageFromMessages(this.messages);
  }

  getConversationHistory(): string {
    const formattedMessages = this.messages
      .map((message) => {
        const text = message.parts
          .filter((part) => part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .filter((partText) => partText.trim().length > 0)
          .join("\n");

        if (!text.trim()) {
          return null;
        }

        const tag = message.role === "user" ? "user" : "assistant";
        return `<${tag}>\n${text}\n</${tag}>`;
      })
      .filter((entry): entry is string => entry !== null);

    if (formattedMessages.length === 0) {
      return "";
    }

    return `<conversation>\n${formattedMessages.join("\n\n")}\n</conversation>`;
  }

  incrementStep() {
    this.step++;
  }

  shouldStop() {
    return this.step >= 10;
  }

  reportSearch(search: SearchHistoryEntry) {
    this.searchHistory.push(search);
  }

  getSearchHistory(): string {
    return this.searchHistory
      .map((search) =>
        [
          `## Query: "${search.query}"`,
          ...search.results.map((result) =>
            [
              `### ${result.date} - ${result.title}`,
              result.url,
              result.snippet,
              `<scrape_result>`,
              result.scrapedContent,
              `</scrape_result>`,
            ].join("\n\n"),
          ),
        ].join("\n\n"),
      )
      .join("\n\n");
  }
}

export type { SearchHistoryEntry, SearchResult };
