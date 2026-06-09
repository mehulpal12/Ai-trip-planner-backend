import type { ConnectionOptions } from 'bullmq';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection: ConnectionOptions = {
  // Clean, raw host and port integers. No "redis://" prefixes here!
  host: process.env.REDIS_HOST || '127.0.0.1', 
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

export const QUEUE_NAME = 'itinerary-generation';