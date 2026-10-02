import { faker } from '@faker-js/faker';
import '@testing-library/jest-dom/vitest';
import dotenv from 'dotenv';
import path from 'path';
import { afterAll, beforeAll } from 'vitest';

const FAKER_SEED = Number(process.env.FAKER_SEED ?? 20260928);

// Seed once per test file; re-seeding per test would replay values already used by module-scope fixtures.
faker.seed(FAKER_SEED);

// Load environment variables from .env.example if not already set
if (!process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '.env.example'), quiet: true });
}

// Stub fetch if not available in test environment
if (!globalThis.fetch) {
  globalThis.fetch = async () => {
    throw new Error('fetch not available');
  };
}

// Setup any global test utilities or environment variables
beforeAll(() => {
  // Environment variables are loaded from .env.example by dotenv above
});

afterAll(() => {
  // Cleanup
});

const createStorageMock = () => {
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
};

// Define them globally before tests run with independent storage stores
Object.defineProperty(global, 'localStorage', { value: createStorageMock() });
Object.defineProperty(global, 'sessionStorage', { value: createStorageMock() });
