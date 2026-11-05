import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'libsodium-wrappers': path.resolve(
        __dirname,
        'node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js'
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
