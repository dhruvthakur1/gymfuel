import { afterAll, beforeAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { seedDatabase } from '../src/seed.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';

export const app = createApp();
export const api = () => request(app);

export function setupDatabase() {
  let mongo;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await mongoose.connection.syncIndexes();
  });
  beforeEach(async () => {
    await seedDatabase({ reset: true });
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });
}

export async function login(email, password) {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

export const loginAdmin = () => login('admin@gymfuel.dev', 'ChangeMe-Admin-123');
export const loginDemoAdmin = () => login('demo.admin@gymfuel.dev', 'demoadmin123');
export const loginCustomer = () => login('demo@gymfuel.dev', 'demo12345');

export const address = {
  fullName: 'Test Buyer',
  line1: '12 Rajpur Road',
  city: 'Dehradun',
  state: 'Uttarakhand',
  postalCode: '248001',
  phone: '9876543210',
};

export const productBySlug = (slug) => Product.findOne({ slug });
export const orderById = (id) => Order.findById(id);
