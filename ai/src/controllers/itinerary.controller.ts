import { type Request, type Response } from "express";
import { ItineraryInputSchema } from "../types/itinerary.types.js";
import { processItineraryGeneration } from "../services/itinerary.service.js";
import { redisClient } from "../config/redis.js";
import { generateItineraryCacheKey } from "../utils/cache.js";

/**
 * CREATE & CACHE: Generates a new itinerary and saves it to global cache memory
 * POST /api/ai/itinerary/generate
 */
export async function handleItineraryCreation(req: Request, res: Response): Promise<void> {
  try {
    const validatedInput = ItineraryInputSchema.parse(req.body);

    // 1. Run the caching + Gemini generation pipeline
    const itineraryData = await processItineraryGeneration(validatedInput);

    res.status(200).json({ success: true, ...itineraryData });
  } catch (error: any) {
    if (error.name === "ZodError") {
       res.status(400).json({ success: false, errors: error.errors });
       return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

/**
 * READ ALL: Gets all historical itineraries still alive across the global cache
 * GET /api/ai/itinerary/history
 */
export async function handleGetAllUserItineraries(_: Request, res: Response): Promise<void> {
  try {
    // 1. Scan the entire Redis memory pool for all active itinerary cache keys
    const globalKeys = await redisClient.keys("itinerary:*");

    if (globalKeys.length === 0) {
      res.status(200).json({ success: true, count: 0, data: [] });
      return;
    }

    // 2. Fetch data blocks for all found keys simultaneously
    const rawItineraries = await redisClient.mGet(globalKeys);
    const activeItineraries = [];

    for (let i = 0; i < globalKeys.length; i++) {
      if (rawItineraries[i]) {
        // Break down the key string (e.g., "itinerary:India:5:5000:Solo") to parse layout parameters
        const segments = globalKeys[i]!.split(":");
        const destination = segments[1] || "Unknown";
        const days = segments[2] ? Number(segments[2]) : 0;
        const budget = segments[3] ? Number(segments[3]) : 0;
        const travelStyle = segments[4] || "Standard";

        activeItineraries.push({
          id: globalKeys[i], // The raw cache key acts as the unique identifier string
          destination,
          days,
          budget,
          travelStyle,
          fullData: {
            source: "redis",
            data: JSON.parse(rawItineraries[i]!)
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      count: activeItineraries.length,
      data: activeItineraries
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE ONE: Removes a single specific cached itinerary key directly from Redis memory
 * DELETE /api/ai/itinerary/remove-item
 */
export async function handleDeleteSingleItinerary(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.body; // e.g., { "key": "itinerary:Japan:7:150000:Adventure" }

    if (!key) {
      res.status(400).json({ success: false, message: "Missing required 'key' identifier string in body payload" });
      return;
    }

    // 1. Delete the targeted raw string value directly from Redis memory
    const deletedCount = await redisClient.del(key);

    if (deletedCount === 0) {
      res.status(404).json({ success: false, message: "Target key not found or already expired" });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Itinerary cache completely deleted."
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE ALL: Wipes out every generated itinerary cache key currently stored in Redis
 * DELETE /api/ai/itinerary/clear-all
 */
export async function handleClearAllUserItineraries(_: Request, res: Response): Promise<void> {
  try {
    // 1. Scan for every single active itinerary string key
    const globalKeys = await redisClient.keys("itinerary:*");

    if (globalKeys.length > 0) {
      // 2. Erase them all out of active memory instantly
      await redisClient.del(globalKeys);
    }

    res.status(200).json({
      success: true,
      message: `Successfully wiped all ${globalKeys.length} cached itineraries from global memory.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}