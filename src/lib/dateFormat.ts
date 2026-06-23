/**
 * Format an ISO date string to a localized date-only string.
 * Used for displaying event dates and registration windows.
 *
 * @param isoString - ISO date string or null
 * @param fallback - String to return if isoString is null/invalid (default: '—')
 * @returns Formatted date string (e.g., "Jun 23, 2026")
 */
export function formatDateOnly(isoString: string | null, fallback = '—'): string {
  if (!isoString) return fallback
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format an ISO datetime string to a localized datetime string.
 * Used for displaying full datetime with time component.
 *
 * @param isoString - ISO datetime string or null
 * @param fallback - String to return if isoString is null/invalid (default: 'TBD')
 * @returns Formatted datetime string (e.g., "Jun 23, 2026, 2:30 PM")
 */
export function formatDateTime(isoString: string | null, fallback = 'TBD'): string {
  if (!isoString) return fallback
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed.toLocaleString()
}
