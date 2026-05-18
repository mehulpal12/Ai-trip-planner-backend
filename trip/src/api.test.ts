import request from 'supertest';
import app from './app.js'; 
import prisma from './config/db.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

describe('Destination API Endpoints', () => {
  let ownerToken: string;
  let nonOwnerToken: string;
  let testTripId: string;
  let testDestinationId: string;

  const ownerUserId = "test-owner-id";
  const nonOwnerUserId = "test-non-owner-id";

  beforeAll(async () => {
    // Generate valid JWT tokens for tests
    ownerToken = jwt.sign({ id: ownerUserId }, process.env.ACCESS_TOKEN_SECRET || 'skfnsdfhu8435sdf');
    nonOwnerToken = jwt.sign({ id: nonOwnerUserId }, process.env.ACCESS_TOKEN_SECRET || 'skfnsdfhu8435sdf');

    // Clean up any stale test data from a previous run
    await prisma.destination.deleteMany({
      where: {
        trip: {
          createdBy: ownerUserId
        }
      }
    });
    await prisma.trip.deleteMany({
      where: {
        createdBy: ownerUserId
      }
    });

    // Create a trip owned by the test owner user
    const trip = await prisma.trip.create({
      data: {
        title: "Goa Exploration Tour",
        description: "Exploring sunny beaches and local markets in Goa",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-10"),
        createdBy: ownerUserId,
      }
    });
    testTripId = trip.id;
  }, 30000);

  afterAll(async () => {
    // Clean up all created test data
    if (testTripId) {
      await prisma.destination.deleteMany({
        where: { tripId: testTripId }
      });
      await prisma.trip.deleteMany({
        where: { id: testTripId }
      });
    }
    await prisma.$disconnect();
  }, 30000);

  // --- 1. POST /api/v1/trips/:tripId/destinations (Create Destination) ---

  it('POST /api/v1/trips/:tripId/destinations - Should fail if unauthorized (no token)', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${testTripId}/destinations`)
      .send({
        name: "Baga Beach",
        city: "Goa",
        country: "India",
        orderIndex: 1
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/trips/:tripId/destinations - Should fail if user is not the trip owner', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${testTripId}/destinations`)
      .set('Authorization', `Bearer ${nonOwnerToken}`)
      .send({
        name: "Baga Beach",
        city: "Goa",
        country: "India",
        orderIndex: 1
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Forbidden");
  });

  it('POST /api/v1/trips/:tripId/destinations - Should fail if validation fails (missing required city)', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${testTripId}/destinations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: "Baga Beach",
        country: "India",
        orderIndex: 1
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/trips/:tripId/destinations - Should create a destination if owner and payload is valid', async () => {
    const res = await request(app)
      .post(`/api/v1/trips/${testTripId}/destinations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: "Baga Beach",
        city: "Goa",
        country: "India",
        orderIndex: 1
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe("Baga Beach");
    expect(res.body.data.tripId).toBe(testTripId);
    
    testDestinationId = res.body.data.id;
  });

  // --- 2. GET /api/v1/trips/:tripId/destinations (Get Destinations) ---

  it('GET /api/v1/trips/:tripId/destinations - Should fail if unauthorized', async () => {
    const res = await request(app)
      .get(`/api/v1/trips/${testTripId}/destinations`);

    expect(res.statusCode).toEqual(401);
  });

  it('GET /api/v1/trips/:tripId/destinations - Should successfully retrieve destinations for owner', async () => {
    // Insert another destination to test order index
    await prisma.destination.create({
      data: {
        tripId: testTripId,
        name: "Anjuna Beach",
        city: "Goa",
        country: "India",
        orderIndex: 2
      }
    });

    const res = await request(app)
      .get(`/api/v1/trips/${testTripId}/destinations`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    // Anjuna Beach (orderIndex 2) and Baga Beach (orderIndex 1). Baga Beach should be first.
    expect(res.body.data[0].name).toBe("Baga Beach");
  });

  // --- 3. PATCH /api/v1/destinations/:id (Update Destination) ---

  it('PATCH /api/v1/destinations/:id - Should fail if unauthorized', async () => {
    const res = await request(app)
      .patch(`/api/v1/destinations/${testDestinationId}`)
      .send({
        name: "Updated Baga Beach"
      });

    expect(res.statusCode).toEqual(401);
  });

  it('PATCH /api/v1/destinations/:id - Should successfully update destination', async () => {
    const res = await request(app)
      .patch(`/api/v1/destinations/${testDestinationId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: "Beautiful Baga Beach",
        orderIndex: 3
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Beautiful Baga Beach");
    expect(res.body.data.orderIndex).toBe(3);
  });

  // --- 4. DELETE /api/v1/destinations/:id (Delete Destination) ---

  it('DELETE /api/v1/destinations/:id - Should fail if unauthorized', async () => {
    const res = await request(app)
      .delete(`/api/v1/destinations/${testDestinationId}`);

    expect(res.statusCode).toEqual(401);
  });

  it('DELETE /api/v1/destinations/:id - Should successfully delete destination', async () => {
    const res = await request(app)
      .delete(`/api/v1/destinations/${testDestinationId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Destination deleted");

    // Verify it is gone from db
    const deleted = await prisma.destination.findUnique({
      where: { id: testDestinationId }
    });
    expect(deleted).toBeNull();
  });
});
