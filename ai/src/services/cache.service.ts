import { redisClient } from "../config/redis.js";

export class CacheService {

  static async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);

    if (!data) return null;

    return JSON.parse(data);
  }

  static async set(
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

  static async delete(key: string) {
    await redisClient.del(key);
  }

}