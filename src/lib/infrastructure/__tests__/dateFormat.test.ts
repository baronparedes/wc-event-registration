import { describe, expect, it, vi } from 'vitest'
import { formatDateOnly, formatDateTime } from '../dateFormat'

describe('dateFormat', () => {
  it('formats valid dates and returns fallbacks for empty or invalid values', () => {
    const dateOnlySpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Jun 23, 2026')
    const dateTimeSpy = vi
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('Jun 23, 2026, 2:30 PM')

    expect(formatDateOnly('2026-06-23T00:00:00.000Z')).toBe('Jun 23, 2026')
    expect(formatDateOnly(null)).toBe('—')
    expect(formatDateOnly('not-a-date')).toBe('—')

    expect(formatDateTime('2026-06-23T14:30:00.000Z')).toBe('Jun 23, 2026, 2:30 PM')
    expect(formatDateTime(null)).toBe('TBD')
    expect(formatDateTime('not-a-date')).toBe('TBD')

    dateOnlySpy.mockRestore()
    dateTimeSpy.mockRestore()
  })
})
