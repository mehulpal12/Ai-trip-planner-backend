// src/worker-runner.ts
import dotenv from 'dotenv';
dotenv.config();

// Simply importing the worker file kicks off the subscription loop connection to Redis
import './workers/itinerary.worker.js';

console.log('🤖 Background Worker Instance running standalone and waiting for jobs...');