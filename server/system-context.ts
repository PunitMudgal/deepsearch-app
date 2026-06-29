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

function getInitialQuestionFromMessages(messages: UIMessage[]): string {
  const userMessage = [...messages].reverse().find((message) => message.role === "user");
  const textPart = userMessage?.parts.find((part) => part.type === "text");

  if (!textPart || textPart.type !== "text") {
    return "";
  }

  return textPart.text;
}

const toQueryResult = (query: QueryResultSearchResult) =>
  [`### ${query.date} - ${query.title}`, query.url, query.snippet].join("\n\n");

export class SystemContext {
  /**
   * The current step in the loop
   */
  private step = 0;

  /**
   * The history of all queries searched
   */
  private queryHistory: QueryResult[] = [];

  /**
   * The history of all URLs scraped
   */
  private scrapeHistory: ScrapeResult[] = [];

  /**
   * The user's initial question for this research loop
   */
  private initialQuestion: string;

  constructor(initialQuestion: string) {
    this.initialQuestion = initialQuestion;
  }

  static fromMessages(messages: UIMessage[]): SystemContext {
    return new SystemContext(getInitialQuestionFromMessages(messages));
  }

  getInitialQuestion(): string {
    return this.initialQuestion;
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
