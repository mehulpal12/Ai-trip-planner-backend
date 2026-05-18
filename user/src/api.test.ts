import request from 'supertest';
import app from './app.js'; 
import prisma from './config/db.js';
import 'dotenv/config';

describe('User API Endpoints', () => {
  let accessToken: string;
  let refreshToken: string;
  let testUserId: string;
  
  const testUser = {
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    password: "Password123!",
  };

  // Cleanup after tests
  afterAll(async () => {
    // Check if user exists before trying to delete to avoid errors
    const user = await prisma.user.findUnique({ where: { email: testUser.email } });
    if (user) {
      await prisma.user.delete({ where: { email: testUser.email } });
    }
    await prisma.$disconnect();
  });

  // 1. Public Routes
  it('POST /api/users/register - Should register a new user', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    testUserId = res.body.data.id;
  });

  it('POST /api/users/login - Should fail if email is not verified', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toBe('Please verify your email first');
  });

  it('POST /api/users/login - Should login and return tokens after verification', async () => {
    // Verify the user first so login works!
    await prisma.user.update({
      where: { id: testUserId },
      data: { isVerified: true }
    });

    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    // Promote user to ADMIN to test admin routes
    await prisma.user.update({
      where: { id: testUserId },
      data: { role: 'ADMIN' }
    });
  });

  // 2. Protected Routes
  it('GET /api/users/profile - Should fail without token', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toEqual(401);
  });

  it('GET /api/users/profile - Should work with valid token', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.email).toBe(testUser.email);
  });

  // 3. Token Lifecycle
  it('POST /api/users/refresh-token - Should return new access token', async () => {
    const res = await request(app)
      .post('/api/users/refresh-token')
      .send({ refreshToken });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  // 4. Admin / Specific Management
  it('GET /api/users/:id - Should fetch user by ID', async () => {
    const res = await request(app)
      .get(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.id).toBe(testUserId);
  });

  it('POST /api/users/logout - Should return success', async () => {
    const res = await request(app)
      .post('/api/users/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.statusCode).toEqual(200);
  });
});