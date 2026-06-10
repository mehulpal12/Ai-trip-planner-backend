import request from 'supertest';
import app from './app.js'; // Adjust if your app entry point is located elsewhere
import prisma from './config/db.js';
import 'dotenv/config';

describe('User API Endpoints', () => {
  let accessToken: string;
  let refreshToken: string;
  let testUserId: string;

  // Use a highly unique email to avoid unique constraint conflicts across multiple local runs
  const testUser = {
    name: "Mehul Test User",
    email: `developer-${Date.now()}@example.com`,
    password: "SecurePassword123!"
  };

  afterAll(async () => {
    // Clean up our generated test user from the database
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  }, 30000);

  // --- 1. POST /api/users/register ---
  it('POST /api/users/register - Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    
    testUserId = res.body.data.id;
  });

  // --- 2. POST /api/users/login ---
  it('POST /api/users/login - Should login cleanly and return both auth tokens inside data wrapper', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    
    // Assert against your controller's exact nested payload structure
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');

    // Extract values for the following stateful tests
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  // --- 3. GET /api/users/profile (Unauthorized Guard Check) ---
  it('GET /api/users/profile - Should block request with 401 if no authorization header is sent', async () => {
    const res = await request(app)
      .get('/api/users/profile');

    expect(res.statusCode).toEqual(401);
  });

  // --- 4. GET /api/users/profile (Authorized Access) ---
  it('GET /api/users/profile - Should fetch profile successfully using bearer token', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
  });

  // --- 5. POST /api/users/refresh-token ---
  it('POST /api/users/refresh-token - Should reissue a fresh access token using valid body token payload', async () => {
    const res = await request(app)
      .post('/api/users/refresh-token')
      .send({ refreshToken });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');

    // Dynamically cycle token so downstream requests remain operational
    accessToken = res.body.data.accessToken;
  });

  // --- 6. GET /api/users/:id (Self/Admin Authorization Guard) ---
  it('GET /api/users/:id - Should fetch a specific user record by context ID string', async () => {
    const res = await request(app)
      .get(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testUserId);
  });

  // --- 7. POST /api/users/logout ---
  it('POST /api/users/logout - Should sign user out and invalidate current state', async () => {
    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});