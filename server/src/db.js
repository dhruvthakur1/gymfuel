import mongoose from 'mongoose';
import { config } from './config.js';

let memoryServer;

// Connects to MONGODB_URI, or outside production starts a throwaway in-memory MongoDB
// so the app runs with zero setup. Returns true when the in-memory database was used.
export async function connectDb() {
  let uri = config.mongoUri;
  let inMemory = false;

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    inMemory = true;
  }

  await mongoose.connect(uri);
  await mongoose.connection.syncIndexes();
  return inMemory;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
