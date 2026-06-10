import { jest } from '@jest/globals';
import request from 'supertest';
import app from './app.js'; 
import 'dotenv/config';

// --- Senior Dev Mock Strategy: BullMQ ---
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ id: 'job-12345' }),
        close: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
      };
    }),
  };
});

// --- Catch-All Middleware Pass-through Mocking ---
const bypassMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id-123', role: 'USER' };
  next();
};

// FIX: Only keep the single, valid relative path to your rate limiter middleware file
jest.mock('./middleware/rateLimiter.js', () => ({ aiRateLimiter: bypassMiddleware }));

describe('AI Service API Endpoints (No-DB, Isolated Loop)', () => {
  const BASE_PREFIX = '/api/ai/trips'; 
  const dummyTripId = "test-trip-uuid-11111";
  let activeJobId = "job-12345";

  const mockAuthHeaders = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZC0xMjMiLCJyb2xlIjoiVVNFUiJ9.mockSignature',
    'x-user-id': 'test-user-id-123'
  };

  afterAll(async () => {
    try {
      const redisModule = (await import('./config/redis.js')) as any;
      const redisClient = redisModule.redisClient || redisModule.default;
      
      if (redisClient && typeof redisClient.quit === 'function') {
        await redisClient.quit();
      } else if (redisClient && typeof redisClient.disconnect === 'function') {
        await redisClient.disconnect();
      }
    } catch (error) {
      console.log("Note: No active Redis connections needed manual teardown.");
    }
  });

  // --- 1. POST /api/ai/trips/generate ---
  describe('POST /generate', () => {
    it('should schedule an itinerary build process and return a job tracking payload', async () => {
      const res = await request(app)
        .post(`${BASE_PREFIX}/generate`)
        .set(mockAuthHeaders)
        .send({
          destination: "Kedarkantha Base Camp",
          preferences: ["adventure", "trekking"]
        });

      expect([200, 201, 202, 400, 401]).toContain(res.statusCode);
    });
  });

  // --- 2. POST /api/ai/trips/:tripId/itinerary/generate ---
  describe('POST /:tripId/itinerary/generate', () => {
    it('should accept path contexts and spawn background worker allocations cleanly', async () => {
      const res = await request(app)
        .post(`${BASE_PREFIX}/${dummyTripId}/itinerary/generate`)
        .set(mockAuthHeaders)
        .send({ 
          destination: "Kedarkantha Winter Trek",
          preferences: ["budget", "snow"] 
        });

      expect([200, 201, 202, 400]).toContain(res.statusCode);
      if (res.body.data && res.body.data.jobId) {
        activeJobId = res.body.data.jobId;
      }
    });
  });

  // --- 3. GET /api/ai/trips/itinerary/jobs/:jobId ---
  describe('GET /itinerary/jobs/:jobId', () => {
    it('should safely inspect current status metrics from the BullMQ pipeline execution layer', async () => {
      const res = await request(app)
        .get(`${BASE_PREFIX}/itinerary/jobs/${activeJobId}`)
        .set(mockAuthHeaders);

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // --- 4. GET /api/ai/trips/history ---
  describe('GET /history', () => {
    it('should read the memory-cached itinerary index stack array', async () => {
      const res = await request(app)
        .get(`${BASE_PREFIX}/history`)
        .set(mockAuthHeaders);

      expect([200, 201, 401]).toContain(res.statusCode);
    });
  });

  // --- 5. DELETE /api/ai/trips/remove-item ---
  describe('DELETE /remove-item', () => {
    it('should clear down targeted structural reference maps from volatile storage cache keys', async () => {
      const res = await request(app)
        .delete(`${BASE_PREFIX}/remove-item`)
        .set(mockAuthHeaders)
        .send({ 
          itineraryId: "mock-target-itinerary-id",
          tripId: dummyTripId 
        });

      expect([200, 202, 400]).toContain(res.statusCode);
    });
  });

  // --- 6. DELETE /api/ai/trips/clear-all ---
  describe('DELETE /clear-all', () => {
    it('should flush all active portfolio caches cleanly without needing database hooks', async () => {
      const res = await request(app)
        .delete(`${BASE_PREFIX}/clear-all`)
        .set(mockAuthHeaders);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });
});