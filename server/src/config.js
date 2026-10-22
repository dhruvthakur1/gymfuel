import 'dotenv/config';

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

function required(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (!isProd && devFallback !== undefined) return devFallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

// Kept as a plain mutable object so tests can toggle payment settings.
export const config = {
  env,
  isProd,
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma-separated list of allowed frontend origins. The first one is used for Stripe redirects.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  currency: (process.env.CURRENCY || 'inr').toLowerCase(),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

if (isProd && !config.mongoUri) {
  throw new Error('Missing required environment variable: MONGODB_URI');
}
