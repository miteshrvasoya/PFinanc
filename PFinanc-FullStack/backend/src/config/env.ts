import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

// Never run a real deployment with a guessable signing secret.
if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production (e.g. `openssl rand -hex 32`).');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pfinanc',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'pfinanc',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: {
    // Dev/test-only fallback; production refuses to start without a real JWT_SECRET (see above).
    secret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5',
    siteUrl: process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
    appName: process.env.OPENROUTER_APP_NAME || 'PFinanc',
  },
  aiProviders: {
    openAiApiKey: process.env.OPENAI_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  },
  // Angel One SmartAPI (https://smartapi.angelone.in). Credentials live only in the backend .env.
  angelOne: {
    baseUrl: (process.env.ANGELONE_BASE_URL || 'https://apiconnect.angelone.in').replace(/\/+$/, ''),
    apiKey: process.env.ANGELONE_API_KEY || '',
    clientCode: process.env.ANGELONE_CLIENT_CODE || '',
    pin: process.env.ANGELONE_PIN || '',
    totpSecret: (process.env.ANGELONE_TOTP_SECRET || '').replace(/\s+/g, ''),
    // Required request headers; Angel One does not verify them for read-only calls, so defaults are fine.
    localIp: process.env.ANGELONE_LOCAL_IP || '127.0.0.1',
    publicIp: process.env.ANGELONE_PUBLIC_IP || '127.0.0.1',
    macAddress: process.env.ANGELONE_MAC_ADDRESS || '00:00:00:00:00:00',
    // The one household allowed to use this broker login. Unset = the oldest household (the installer's).
    householdId: process.env.ANGELONE_HOUSEHOLD_ID || '',
    autoRefreshPrices: process.env.ANGELONE_AUTO_REFRESH !== 'false',
    priceRefreshMinutes: Math.max(5, parseInt(process.env.ANGELONE_PRICE_REFRESH_MINUTES || '15', 10) || 15),
  },
  aiAdvisor: {
    defaultSchedule: process.env.AI_ADVISOR_DEFAULT_SCHEDULE || '30 3 * * *',
    enabled: process.env.AI_ADVISOR_ENABLED !== 'false',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  // Public address of this API as seen from the internet (used to build the MCP connector URL). Optional.
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
};
