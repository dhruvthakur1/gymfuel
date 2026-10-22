import { pathToFileURL } from 'node:url';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { User } from './models/User.js';
import { products, users } from './seedData.js';

// Upserts the demo catalogue and accounts. Safe to run repeatedly; pass { reset: true }
// to also wipe products and orders first.
export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([Product.deleteMany({}), Order.deleteMany({})]);
  }

  await Product.bulkWrite(
    products.map((p) => ({ updateOne: { filter: { slug: p.slug }, update: { $set: p }, upsert: true } }))
  );

  for (const { passwordEnv, defaultPassword, ...user } of users) {
    const password = process.env[passwordEnv];
    // Never create a real (non-demo) admin with a password that's published in this repo.
    if (!password && user.role === 'admin' && !user.isDemo && process.env.NODE_ENV === 'production') {
      console.warn(`Skipping ${user.email}: set ${passwordEnv} to create it`);
      continue;
    }
    const passwordHash = await User.hashPassword(password || defaultPassword);
    await User.updateOne({ email: user.email }, { $set: { ...user, passwordHash } }, { upsert: true });
  }

  return { products: products.length, users: users.length };
}

// `npm run seed` (add `-- --reset` to wipe products and orders first).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDb, disconnectDb } = await import('./db.js');
  const { config } = await import('./config.js');
  if (!config.mongoUri) {
    console.error('Set MONGODB_URI to seed a real database (the dev server seeds its in-memory DB automatically).');
    process.exit(1);
  }
  await connectDb();
  const result = await seedDatabase({ reset: process.argv.includes('--reset') });
  console.log(`Seeded ${result.products} products and ${result.users} users`);
  await disconnectDb();
}
