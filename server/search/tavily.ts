import { tavily } from "@tavily/core";

import { env } from "@/env";
import { cacheWithRedis } from "@/server/redis/redis";

const tvly = tavily({ apiKey: env.TAVILY_API_KEY });

type TavilySearchResult = {
  title: string;
  link: string;
  snippet: string;
  publishedDate: string | null;
};

const searchTavilyCached = cacheWithRedis(
  "searchTavily",
  async (query: string): Promise<TavilySearchResult[]> => {
    const response = await tvly.search(query, {
      maxResults: env.SEARCH_RESULTS_COUNT,
    });

    return response.results.map((result) => ({
      title: result.title,
      link: result.url,
      snippet: result.content,
      publishedDate: result.publishedDate || null,
    }));
  },
);

export async function searchTavily(query: string, abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) {
    throw abortSignal.reason ?? new Error("Aborted");
  }

  return searchTavilyCached(query);
}
