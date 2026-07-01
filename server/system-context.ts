import type { UIMessage } from "ai";

import type { RequestHints } from "@/server/request-hints";

export type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

export type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

export type ScrapeResult = {
  url: string;
  result: string;
};

const toQueryResult = (query: QueryResultSearchResult) =>
  [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

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
  private queryHistory: QueryResult[] = [];
  private scrapeHistory: ScrapeResult[] = [];
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

  reportQueries(queries: QueryResult[]) {
    this.queryHistory.push(...queries);
  }

  reportScrapes(scrapes: ScrapeResult[]) {
    this.scrapeHistory.push(...scrapes);
  }

  getQueryHistory(): string {
    return this.queryHistory
      .map((query) =>
        [
          `## Query: "${query.query}"`,
          ...query.results.map(toQueryResult),
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getScrapeHistory(): string {
    return this.scrapeHistory
      .map((scrape) =>
        [
          `## Scrape: "${scrape.url}"`,
          `<scrape_result>`,
          scrape.result,
          `</scrape_result>`,
        ].join("\n\n"),
      )
      .join("\n\n");
  }

  getSearchHistory(): string {
    return [
      this.getQueryHistory(),
      this.getScrapeHistory(),
    ]
      .filter(Boolean)
      .join("\n\n");
  }
}
