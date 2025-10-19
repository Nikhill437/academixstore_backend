import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  issuer: 'educational-book-app',
  audience: 'educational-book-users',
  algorithm: 'HS256',
};

export const refreshTokenConfig = {
  secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};

export default jwtConfig;