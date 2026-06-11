import { Queue } from "bullmq";
import { redisConnection, QUEUE_NAME } from "../config/bullmq.js";
import type { ItineraryInput } from "../types/itinerary.types.js";

// Keep the structure clean and unified
export interface ItineraryJobPayload {
  tripId: string;
  input: ItineraryInput;
}

export const itineraryQueue = new Queue<ItineraryJobPayload>(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // Waits 5s, 10s, 20s...
    },
    removeOnComplete: { age: 3600 }, // Keep in history for 1 hour for safe polling
    removeOnFail: { age: 86400 },    // Keep failures for 24 hours to debug LLM drops
  },
});

/**
 * Pushes a type-safe itinerary generation task into the Redis queue
 */
export async function addItineraryJob(tripId: string, input: ItineraryInput) {
  const uniqueJobId = `itinerary:${tripId}:${Date.now()}`;
  return await itineraryQueue.add(uniqueJobId, { tripId, input });
}
