import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { seedDatabase } from './seed.js';
import { paymentMode } from './lib/payments.js';

const inMemory = await connectDb();
if (inMemory) {
  await seedDatabase();
  console.log('Using an in-memory MongoDB with demo data (set MONGODB_URI to use a real database)');
}

const server = createApp().listen(config.port, () => {
  console.log(`GymFuel API listening on http://localhost:${config.port} (payments: ${paymentMode()})`);
});

async function shutdown() {
  server.close();
  await disconnectDb();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
