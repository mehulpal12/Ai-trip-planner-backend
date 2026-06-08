import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redisClient = createClient({
  url: redisUrl,
 
});

// Intercept and silence the HELLO error so it doesn't log-spam or crash your terminal
redisClient.on("error", (err) => {
  if (err.message?.includes("unknown command 'HELLO'")) {
    // This is just the older Windows server rejecting the RESP3 greeting.
    // The client will automatically fall back to executing normal commands.
    return;
  }
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => console.log("🔌 Socket connected to native Redis server"));
redisClient.on("ready", () => console.log("🎯 Redis Client Ready and Connected!"));

// Connect to the server
redisClient.connect().catch((err) => {
  if (!err.message?.includes("HELLO")) {
    console.error("Initial connection error:", err);
  }
});