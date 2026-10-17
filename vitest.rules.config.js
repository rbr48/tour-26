import { defineConfig } from 'vitest/config';

// Runs the Firestore rules suite against the local emulator:
//   npm run test:rules
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
