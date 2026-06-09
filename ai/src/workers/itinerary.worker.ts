import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAME } from "../config/bullmq.js";
import { itineraryProcessor } from "../jobs/itinerary.processor.js";

console.log("👷 Starting Background Itinerary Consumer Worker Pool...");

export const itineraryWorker = new Worker(
  QUEUE_NAME,
  itineraryProcessor,
  {
    connection: redisConnection,
    // Concurrency throttle prevents crashing through NVIDIA/OpenAI rate limits
    concurrency: 3, 
  }
);

itineraryWorker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} for Trip ${job.data.tripId} processed successfully.`);
  console.log(`🎉 Job ${job.id} for Trip ${job.data.tripId} processed successfully.`);

});

itineraryWorker.on("failed", (job, error) => {
  console.error(`🚨 Job ${job?.id} failed processing. Error Trace: ${error.message}`);
});