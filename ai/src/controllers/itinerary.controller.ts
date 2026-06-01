import { type Request, type Response } from "express";
import { ItineraryInputSchema } from "../types/itinerary.types.js";
import { processItineraryGeneration } from "../services/itinerary.service.js";
import { redisClient } from "../config/redis.js";

// 1. Existing Controller Handler (Handles itinerary generation)
export async function handleItineraryCreation(req: Request, res: Response): Promise<void> {
  try {
    // Validate HTTP request payload input structural validity
    const validatedInput = ItineraryInputSchema.parse(req.body);

    const itineraryData = await processItineraryGeneration(validatedInput);

    // This now sends back both the source ("redis" or "gemini") and the actual data nicely packaged
    res.status(200).json({
      success: true,
      ...itineraryData 
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
       res.status(400).json({ success: false, errors: error.errors });
       return;
    }
    console.error(error);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
}

// 2. New Handler: Check cache statistics
export async function handleGetCacheStats(_: Request, res: Response): Promise<void> {
  try {
    const keys = await redisClient.keys("itinerary:*");
    res.status(200).json({
      success: true,
      cachedItineraries: keys.length,
      keys,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// 3. New Handler: Clear cache values instantly (Admin utility)
export async function handleClearCache(_: Request, res: Response): Promise<void> {
  try {
    const keys = await redisClient.keys("itinerary:*");
    
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.status(200).json({
      success: true,
      message: `Successfully cleared ${keys.length} cached itineraries.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}