export function createLogger(isDev: boolean) {
  return {
    debug: (...args: unknown[]) => {
      if (isDev) {
        console.debug('[DEBUG]', ...args)
      }
    },
    info: (...args: unknown[]) => {
      if (isDev) {
        console.info('[INFO]', ...args)
      }
    },
    warn: (...args: unknown[]) => {
      if (isDev) {
        console.warn('[WARN]', ...args)
      }
    },
    error: (...args: unknown[]) => {
      if (isDev) {
        console.error('[ERROR]', ...args)
      }
    },
  }
}

export const logger = createLogger(import.meta.env.DEV)
