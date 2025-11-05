import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: false, // Disable test isolation to avoid serialization issues
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
