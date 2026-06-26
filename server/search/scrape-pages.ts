import { cacheWithRedis } from "@/server/redis/redis";
import { bulkCrawlWebsites, type BulkCrawlResponse } from "@/server/search/crawl";

export const scrapePages = cacheWithRedis(
  "scrapePages",
  async (urls: string[]): Promise<BulkCrawlResponse> => {
    return bulkCrawlWebsites({ urls });
  },
);
