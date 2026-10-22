import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config.js';
import { paymentMode } from './lib/payments.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import webhookRoutes from './routes/webhooks.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render and most hosts sit behind one proxy; needed for rate limiting by IP.
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (curl, health checks) and the configured frontends.
        if (!origin || config.clientUrls.includes(origin)) return callback(null, true);
        callback(null, false);
      },
    })
  );
  if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // Mounted before express.json() because Stripe needs the raw body to verify signatures.
  app.use('/api/webhooks', webhookRoutes);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      payments: paymentMode(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
