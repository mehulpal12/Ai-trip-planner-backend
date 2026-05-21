import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET: Secret = process.env.ACCESS_TOKEN_SECRET || 'access_fallback';
const REFRESH_SECRET: Secret = process.env.REFRESH_TOKEN_SECRET || 'refresh_fallback';

export const generateTokens = (userId: string, role: string) => {
  const payload = { id: userId, role };

  // Access Token: Short-lived (e.g., 15 minutes to 1 hour)
  const accessOptions: SignOptions = {
    expiresIn: '1d', 
  };

  // Refresh Token: Long-lived (e.g., 7 days)
  const refreshOptions: SignOptions = {
    expiresIn: '7d',
  };

  const accessToken = jwt.sign(payload, ACCESS_SECRET, accessOptions);
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, refreshOptions);

  return { accessToken, refreshToken };
};

// Helper to verify Refresh Token specifically
export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { id: string; role: string };
  } catch (error) {
    return null;
  }
};
