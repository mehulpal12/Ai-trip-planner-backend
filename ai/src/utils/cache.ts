import { redisClient } from "../config/redis.js";

export async function setCache(
  key: string,
  value: unknown,
  ttl = 3600
) {
  await redisClient.set(
    key,
    JSON.stringify(value),
    {
      EX: ttl,
    }
  );
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redisClient.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

export function generateItineraryCacheKey(
  destination: string,
  days: number,
  budget: number,
  travelStyle: string
) {
  return `itinerary:${destination}:${days}:${budget}:${travelStyle}`;
}