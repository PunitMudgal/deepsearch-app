import type { UIMessage } from "ai";

type QueryResultSearchResult = {
  date: string;
  title: string;
  url: string;
  snippet: string;
};

type QueryResult = {
  query: string;
  results: QueryResultSearchResult[];
};

type ScrapeResult = {
  url: string;
  result: string;
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

const toQueryResult = (query: QueryResultSearchResult) =>
  [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

export class SystemContext {
  private step = 0;
  private queryHistory: QueryResult[] = [];
  private scrapeHistory: ScrapeResult[] = [];
  private messages: UIMessage[];

  constructor(messages: UIMessage[]) {
    this.messages = messages;
  }

  static fromMessages(messages: UIMessage[]): SystemContext {
    return new SystemContext(messages);
  }

  getMessages(): UIMessage[] {
    return this.messages;
  }

  getLatestUserMessage(): string {
    return getLatestUserMessageFromMessages(this.messages);
  }

  getConversationHistory(): string {
    return this.messages
      .map((message) => {
        const text = message.parts
          .filter((part) => part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .filter((partText) => partText.trim().length > 0)
          .join("\n");

        if (!text.trim()) {
          return null;
        }

        const label = message.role === "user" ? "User" : "Assistant";
        return `${label}:\n${text}`;
      })
      .filter((entry): entry is string => entry !== null)
      .join("\n\n");
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
}

export type { QueryResult, QueryResultSearchResult, ScrapeResult };
