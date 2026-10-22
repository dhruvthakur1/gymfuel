import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: { NODE_ENV: 'test', JWT_SECRET: 'test-secret', CLIENT_URL: 'http://localhost:5173' },
    // Each test file gets its own in-memory MongoDB; the first run downloads the binary.
    hookTimeout: 120_000,
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
