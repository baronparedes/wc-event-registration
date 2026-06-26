import { describe, expect, it } from 'vitest'
import { areAllRequirementsMet, getPublishRequirements } from '../metadata'

describe('event publish metadata', () => {
  it('maps publish requirements to filled states', () => {
    const requirements = getPublishRequirements({
      description: '  Annual meetup  ',
      location: 'Main Hall',
      starts_at: '2026-06-23T10:00:00.000Z',
      ends_at: '',
      registration_opens_at: '2026-06-01T00:00:00.000Z',
      registration_closes_at: null,
    })

    expect(requirements).toEqual([
      { key: 'description', label: 'Description', filled: true },
      { key: 'location', label: 'Location', filled: true },
      { key: 'starts_at', label: 'Event Start Date & Time', filled: true },
      { key: 'ends_at', label: 'Event End Date & Time', filled: false },
      { key: 'registration_opens_at', label: 'Registration Opens', filled: true },
      { key: 'registration_closes_at', label: 'Registration Closes', filled: false },
    ])
  })

  it('reports whether all publish requirements are met', () => {
    expect(
      areAllRequirementsMet({
        description: 'Ready',
        location: 'Room 1',
        starts_at: '2026-06-23T10:00:00.000Z',
        ends_at: '2026-06-23T12:00:00.000Z',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-06-22T00:00:00.000Z',
      }),
    ).toBe(true)

    expect(
      areAllRequirementsMet({
        description: 'Ready',
        location: '',
        starts_at: '2026-06-23T10:00:00.000Z',
        ends_at: '2026-06-23T12:00:00.000Z',
        registration_opens_at: '2026-06-01T00:00:00.000Z',
        registration_closes_at: '2026-06-22T00:00:00.000Z',
      }),
    ).toBe(false)
  })
})
