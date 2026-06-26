import '@testing-library/jest-dom/vitest'
import { beforeAll, afterAll } from 'vitest'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

// Stub fetch if not available in test environment
if (!globalThis.fetch) {
  globalThis.fetch = async () => {
    throw new Error('fetch not available')
  }
}

// Setup any global test utilities or environment variables
beforeAll(() => {
  // Environment variables are loaded from .env.local by dotenv above
})

afterAll(() => {
  // Cleanup
})
