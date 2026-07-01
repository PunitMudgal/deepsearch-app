import { createHash } from "node:crypto";

import { env } from "@/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);

export const CACHE_EXPIRY_SECONDS = 60 * 60 * 6; // 6 hours
const CACHE_KEY_SEPARATOR = ":";

export function buildCacheKey(prefix: string, data: unknown): string {
  const hash = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");

  return `${prefix}${CACHE_KEY_SEPARATOR}${hash}`;
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const cachedResult = await redis.get(key);

    if (!cachedResult) {
      return null;
    }

    return JSON.parse(cachedResult) as T;
  } catch (error) {
    console.error(`Redis cache read failed for ${key}:`, error);
    return null;
  }
}

export async function setCachedValue(
  key: string,
  value: unknown,
): Promise<void> {
  try {
    await redis.set(
      key,
      JSON.stringify(value),
      "EX",
      CACHE_EXPIRY_SECONDS,
    );
  } catch (error) {
    console.error(`Redis cache write failed for ${key}:`, error);
  }
}

export const cacheWithRedis = <TFunc extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  fn: TFunc,
): TFunc => {
  return (async (...args: Parameters<TFunc>) => {
    const key = buildCacheKey(keyPrefix, args);
    const cachedResult = await getCachedValue<Awaited<ReturnType<TFunc>>>(key);

    if (cachedResult !== null) {
      console.log(`Cache hit for ${keyPrefix}`);
      return cachedResult;
    }

    const result = await fn(...args);
    await setCachedValue(key, result);

    return result;
  }) as TFunc;
};
