export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
  methodNotAllowed: 405,
  conflict: 409,
  tooManyRequests: 429,
  internalServerError: 500,
} as const;

export const HTTP_HEADERS = {
  contentType: 'Content-Type',
  authorization: 'Authorization',
  retryAfter: 'Retry-After',
  vary: 'Vary',
  origin: 'Origin',
  contentDisposition: 'Content-Disposition',
} as const;

export const MIME_TYPES = {
  json: 'application/json',
} as const;

export const AUTH = {
  bearerPrefix: 'Bearer ',
} as const;

export const CORS = {
  allowMethods: 'POST, OPTIONS',
  allowHeaders: 'Content-Type, Authorization',
  exposeHeaders: 'Content-Disposition',
  nullOrigin: 'null',
} as const;

export const ENVIRONMENT = {
  production: 'production',
  local: 'local',
} as const;

export const ENV_KEYS = {
  edgeTokenEncryptionSecret: 'EDGE_TOKEN_ENCRYPTION_SECRET',
} as const;

export const LOCALHOST_HOSTNAMES = ['localhost', '127.0.0.1', '::1'] as const;

export const RATE_LIMIT = {
  cleanupIntervalMs: 60_000,
  // Multiplier applied to rate limits for suspicious requests (missing/bot User-Agent).
  // Reduces abuse surface for non-browser clients attempting to bypass CORS.
  suspiciousRequestMultiplier: 0.2,
} as const;

export const RATE_LIMIT_PRESETS = {
  submitRegistration: {
    windowMs: 60_000,
    maxHits: 20,
  },
  bulkUpsertAttendanceAnswers: {
    windowMs: 60_000,
    maxHits: 6,
  },
  bulkUpsertMembers: {
    windowMs: 60_000,
    maxHits: 60,
  },
  checkInAttendee: {
    windowMs: 60_000,
    maxHits: 180,
  },
  listUnregisteredMembers: {
    windowMs: 60_000,
    maxHits: 120,
  },
  updateAttendanceSettings: {
    windowMs: 60_000,
    maxHits: 60,
  },
  searchAttendees: {
    windowMs: 60_000,
    maxHits: 120,
  },
  listAttendees: {
    windowMs: 60_000,
    maxHits: 30,
  },
  attendanceCsvExport: {
    windowMs: 60_000,
    maxHits: 12,
  },
  memberLookup: {
    windowMs: 60_000,
    maxHits: 60,
  },
  cancelRegistration: {
    windowMs: 60_000,
    maxHits: 30,
  },
  createMember: {
    windowMs: 60_000,
    maxHits: 60,
  },
  exportRegistrationsCsv: {
    windowMs: 60_000,
    maxHits: 5,
  },
  exportUnregisteredMembersCsv: {
    windowMs: 60_000,
    maxHits: 12,
  },
  getPublicEvent: {
    windowMs: 60_000,
    maxHits: 30,
  },
  getPublicEventFields: {
    windowMs: 60_000,
    maxHits: 30,
  },
  getPublicEventListing: {
    windowMs: 60_000,
    maxHits: 30,
  },
  downloadRegistrationsTemplate: {
    windowMs: 60_000,
    maxHits: 12,
  },
  bulkUpsertRegistrations: {
    windowMs: 60_000,
    maxHits: 6,
  },
  cron: {
    upcomingSundayExcusedExportEmail: {
      windowMs: 60_000,
      maxHits: 1,
    },
  },
} as const;

export const SUSPICIOUS_USER_AGENT_PATTERNS = [
  /^(curl|wget|python|perl|ruby|java|go|node|requests)/i,
  /^mozilla\/\d+\.\d+ \(compatible; ?(bot|crawler|spider|scraper)/i,
  /^(bot|crawler|spider|scraper|indexer)(?:\s|$)/i,
] as const;

export const ERROR_CODES = {
  unauthorized: 'UNAUTHORIZED',
  rateLimited: 'RATE_LIMITED',
  invalidRequest: 'INVALID_REQUEST',
} as const;

export const POSTGRES_ERROR_CODES = {
  uniqueViolation: '23505',
} as const;
