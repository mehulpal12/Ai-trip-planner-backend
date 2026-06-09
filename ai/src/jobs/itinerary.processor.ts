import { Job } from "bullmq";
import { type ItineraryJobPayload } from "../queues/itinerary.queue.js";
import { processItineraryGeneration } from "../services/itinerary.service.js";

/**
 * BullMQ Worker execution processor.
 */
export async function itineraryProcessor(job: Job<ItineraryJobPayload>): Promise<any> {
  const { tripId, input } = job.data;
  
  console.log(`[Queue Processor] Fetching task details for Job: ${job.id}`);
  
  // Track infrastructure milestone markers inside Redis
  await job.updateProgress(10);

  // Calls your original service that performs caching, DB fallback, and NVIDIA AI calls
  const result = await processItineraryGeneration(input, tripId);
  
  await job.updateProgress(100);
  
  // The returned value is securely written to job.returnvalue inside Redis
  return result;
}