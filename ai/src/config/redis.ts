import { createClient } from "redis";

// Since you are running locally on Windows, use 127.0.0.1 
// if you are connecting to Docker's exposed 6379 port!
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redisClient = createClient({
  url: redisUrl
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
redisClient.on("ready", () => console.log("🎯 Redis Client Ready and Connected!"));

// ❌ DO NOT CALL redisClient.connect() HERE anymore. Leave it out.