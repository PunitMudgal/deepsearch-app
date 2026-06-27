import { tavily } from "@tavily/core";

import { env } from "@/env";

const tvly = tavily({ apiKey: env.TAVILY_API_KEY });

export async function searchTavily(query: string, abortSignal?: AbortSignal) {
  if (abortSignal?.aborted) {
    throw abortSignal.reason ?? new Error("Aborted");
  }

  const response = await tvly.search(query, {
    maxResults: env.SEARCH_RESULTS_COUNT,
  });

  return response.results.map((result) => ({
    title: result.title,
    link: result.url,
    snippet: result.content,
    publishedDate: result.publishedDate || null,
  }));
}
