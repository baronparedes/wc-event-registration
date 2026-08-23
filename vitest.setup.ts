import '@testing-library/jest-dom/vitest';
import dotenv from 'dotenv';
import path from 'path';
import { afterAll, beforeAll } from 'vitest';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Stub fetch if not available in test environment
if (!globalThis.fetch) {
  globalThis.fetch = async () => {
    throw new Error('fetch not available');
  };
}

// Setup any global test utilities or environment variables
beforeAll(() => {
  // Environment variables are loaded from .env.local by dotenv above
});

afterAll(() => {
  // Cleanup
});

const localStorageMock = (() => {
  let store: Record<string, string> = {}; // 👈 Explicit type for string key-value pairs
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    length: 0, // 👈 Required by the Storage interface
    key: (index: number): string | null => Object.keys(store)[index] || null, // 👈 Required by the Storage interface
  };
})();

// Define it globally before tests run
Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'sessionStorage', { value: localStorageMock });
