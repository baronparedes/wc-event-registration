export const VALIDATION_PATTERNS = {
  eventSlug: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  fieldKey: /^[a-z0-9_]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  dateYyyyMmDd: /^\d{4}-\d{2}-\d{2}$/,
  datetimeYyyyMmDdThhMm: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  phone: /^(?:\+63[\s-]?|0)?9[\d\s-]{8,}$/,
} as const
