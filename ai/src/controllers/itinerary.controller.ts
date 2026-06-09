import { type Request, type Response } from "express";
import { ItineraryInputSchema } from "../types/itinerary.types.js";
import { redisClient } from "../config/redis.js";
import { addItineraryJob, itineraryQueue } from "../queues/itinerary.queue.js";

/**
 * NON-BLOCKING CREATION: Validates input, schedules a job, and returns instantly
 * POST /api/ai/itinerary/:tripId/generate
 */
export async function handleItineraryCreation(req: Request, res: Response): Promise<void> {
  try {
    const validatedInput = ItineraryInputSchema.parse(req.body);
    const { tripId } = req.params;

    if (!tripId) {
      res.status(400).json({ success: false, message: "tripId is required" });
      return;
    }

    // 1. Offload to BullMQ exactly like before (rate-limiting & retries still apply!)
    const job = await addItineraryJob(tripId as string, validatedInput);

    // 2. PAUSE right here and poll the job's state internally
    let jobState = await job.getState();
    const maxTimeoutMs = 45000; // Give it 45 seconds max before giving up
    const startTime = Date.now();

    while (jobState !== "completed" && jobState !== "failed") {
      // Check if the API request is taking too long to prevent absolute thread hanging
      if (Date.now() - startTime > maxTimeoutMs) {
        res.status(504).json({ success: false, message: "Generation timed out" });
        return;
      }

      // Wait 1.5 seconds internally before checking Redis again
      await new Promise((resolve) => setTimeout(resolve, 1500));
      jobState = await job.getState();
    }

    // 3. Fetch the fresh job results from Redis
    const freshJobDetails = await itineraryQueue.getJob(job.id as string);

    if (jobState === "completed" && freshJobDetails) {
      // Send back the EXACT expected data shape to the frontend!
      res.status(200).json({
        success: true,
        ...freshJobDetails.returnvalue // Unpacks { source: "...", data: {...} }
      });
    } else {
      res.status(500).json({
        success: false,
        message: freshJobDetails?.failedReason || "Background job failed processing."
      });
    }

  } catch (error: any) {
    // ... your standard Zod and 500 error catch blocks remain here
  }
}
/**
 * JOB POLLING STATUS: Tracks background execution state for the frontend
 * GET /api/ai/itinerary/jobs/:jobId
 */
export async function handleGetJobStatus(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ success: false, message: "jobId path param is required" });
      return;
    }

    const job = await itineraryQueue.getJob(jobId as string);

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Job tracking reference not found or expired from history records.",
      });
      return;
    }

    const state = await job.getState(); // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
    const progress = job.progress;

    res.status(200).json({
      success: true,
      jobId: job.id,
      status: state,
      progress: progress,
      // If the job finished, the data returned by processItineraryGeneration is here
      result: state === "completed" ? job.returnvalue : undefined,
      error: state === "failed" ? job.failedReason : undefined,
    });
  } catch (error: any) {
    console.error("Error retrieving job lifecycle info:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * READ ALL: Gets all historical itineraries from global Redis cache memory
 * GET /api/ai/itinerary/history
 */
export async function handleGetAllUserItineraries(_: Request, res: Response): Promise<void> {
  try {
    const keys = await redisClient.keys("trip:*:input:*:itinerary");

    if (keys.length === 0) {
      res.status(200).json({ success: true, count: 0, data: [] });
      return;
    }

    const values = await redisClient.mGet(keys);
    const itineraries = [];

    for (let i = 0; i < keys.length; i++) {
      if (!values[i]) continue;
      itineraries.push({
        cacheKey: keys[i],
        data: JSON.parse(values[i]!)
      });
    }

    res.status(200).json({
      success: true,
      count: itineraries.length,
      data: itineraries
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * DELETE ONE: Removes a specific cached itinerary key directly from Redis memory
 * DELETE /api/ai/itinerary/remove-item
 */
export async function handleDeleteSingleItinerary(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.body;

    if (!key) {
      res.status(400).json({ success: false, message: "Missing required 'key' identifier string in body payload" });
      return;
    }

    const deletedCount = await redisClient.del(key);

    if (deletedCount === 0) {
      res.status(404).json({ success: false, message: "Target key not found or already expired" });
      return;
    }

    res.status(200).json({ success: true, message: "Itinerary cache completely deleted." });
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
    const globalKeys = await redisClient.keys("trip:*:input:*:itinerary");

    if (globalKeys.length > 0) {
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