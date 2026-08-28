import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pfinanc',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'pfinanc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secure_pfinanc_family_secret_key_2026_jwt',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    appName: process.env.OPENROUTER_APP_NAME || 'PFinanc',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
