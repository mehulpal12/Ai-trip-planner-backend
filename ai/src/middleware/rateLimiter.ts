import { type Request, type Response, type NextFunction } from "express";
import { redisClient } from "../config/redis.js";

const WINDOW_SIZE = 15 * 60; // 15 minutes (900 seconds)
const MAX_REQUESTS = 30;     // Max AI generations allowed

export const aiRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id || req.headers["x-test-user-id"] as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const key = `rate-limit:ai:${userId}`;

    // 1. Atomically increment the request count in Redis first
    const currentRequests = await redisClient.incr(key);

    // 2. If it's the very first request in this window, set the 15-minute expiration
    if (currentRequests === 1) {
      await redisClient.expire(key, WINDOW_SIZE);
    }

    // 3. Calculate how many requests the user has left
    // Math.max ensures that if they somehow go over, it doesn't display negative numbers
    const remainingRequests = Math.max(0, MAX_REQUESTS - currentRequests);

    // 4. Set standard API Rate-Limiting Headers (Excellent for debugging in Postman!)
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", remainingRequests);

    // 5. If they cross the maximum allowable threshold, block them
    if (currentRequests > MAX_REQUESTS) {
      const ttl = await redisClient.ttl(key);

      return res.status(429).json({
        success: false,
        message: "AI request limit exceeded. Please try again later.",
        maxRequests: MAX_REQUESTS,
        remainingRequests: 0, // Explicitly 0 since they are locked out
        retryAfter: ttl,       // Seconds left until the 15-minute block resets
      });
    }

    // 6. Optional: Attach remaining count to the request object 
    // if you want to use it down the line inside your controllers
    (req as any).remainingAiRequests = remainingRequests;

    // Proceed to the AI generation controller
    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    // Fail-safe: If Redis goes down, don't break the application for users
    next();
  }
};