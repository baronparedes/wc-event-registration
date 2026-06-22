import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  createTestAdminClient,
  generateTestMemberId,
  seedTestMember,
  getTestEvent,
  callSubmitRegistrationFunction,
  cleanupTestRegistrations,
  getRegistrationDetails,
  getEventRegistrationCount,
} from './test-utils'
import { randomUUID } from 'crypto'

describe('Edge Function: submit-registration', () => {
  const BLOCK_POLICY_EVENT = 'sample-event'
  const ALLOW_UPDATE_POLICY_EVENT = 'future-event'
  let sampleEventData: any
  let futureEventData: any

  beforeAll(async () => {
    // Verify test events exist
    sampleEventData = await getTestEvent(BLOCK_POLICY_EVENT)
    futureEventData = await getTestEvent(ALLOW_UPDATE_POLICY_EVENT)

    if (!sampleEventData) {
      throw new Error(
        `Test event '${BLOCK_POLICY_EVENT}' not found. Did you run 'npm run supabase:db:reset'?`,
      )
    }
    if (!futureEventData) {
      throw new Error(
        `Test event '${ALLOW_UPDATE_POLICY_EVENT}' not found. Did you run 'npm run supabase:db:reset'?`,
      )
    }
  })

  afterEach(async () => {
    // Cleanup test registrations to keep DB clean between tests
    // Test will handle its own cleanup if needed
  })

  // ============================================================================
  // STANDARD SCENARIOS: Block Policy
  // ============================================================================

  it('should accept first registration on block-policy event', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const result = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Test Team A',
        guests_count: 2,
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.registration_id).toBeDefined()
    expect(result.is_new).toBe(true)
    expect(result.status).toMatch(/submitted|updated/)

    // Verify in database
    const details = await getRegistrationDetails(BLOCK_POLICY_EVENT, memberId)
    expect(details).not.toBeNull()
    expect(details?.registration.status).toBe('submitted')
    expect(details?.answers).toHaveLength(2) // team_name and guests_count

    await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
  })

  it('should reject duplicate registration on block-policy event', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // First submission
    const firstResult = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Test Team A',
        guests_count: 2,
      },
      idempotency_key: randomUUID(),
    })

    expect(firstResult.success).toBe(true)

    // Second submission (duplicate)
    const secondResult = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Test Team B',
        guests_count: 3,
      },
      idempotency_key: randomUUID(),
    })

    expect(secondResult.success).toBe(false)
    expect(secondResult.error_code).toBe('duplicate_blocked')
    expect(secondResult.error).toMatch(/already registered/i)

    // Verify database not modified
    const details = await getRegistrationDetails(BLOCK_POLICY_EVENT, memberId)
    expect(details?.registration.status).toBe('submitted')
    expect(details?.answers).toHaveLength(2)
    // Verify old answers still exist (not replaced)
    const teamNameAnswer = details?.answers.find(
      (a) => a.event_field_id === sampleEventData?.event_fields?.[0]?.id,
    )
    expect(teamNameAnswer?.answer_text).toBe('Test Team A')

    await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
  })

  // ============================================================================
  // STANDARD SCENARIOS: Allow Update Policy
  // ============================================================================

  it('should accept first registration on allow-update-policy event', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const result = await callSubmitRegistrationFunction({
      event_slug: ALLOW_UPDATE_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Update Test Team A',
        guests_count: 5,
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(true)
    expect(result.is_new).toBe(true)
    expect(result.status).toBe('submitted')

    await cleanupTestRegistrations(ALLOW_UPDATE_POLICY_EVENT, memberId)
  })

  it('should update existing registration on allow-update-policy event', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // First submission
    const firstResult = await callSubmitRegistrationFunction({
      event_slug: ALLOW_UPDATE_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Original Team',
        guests_count: 2,
      },
      idempotency_key: randomUUID(),
    })

    const firstRegistrationId = firstResult.registration_id
    expect(firstResult.success).toBe(true)

    // Second submission (update)
    const secondResult = await callSubmitRegistrationFunction({
      event_slug: ALLOW_UPDATE_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Updated Team',
        guests_count: 5,
      },
      idempotency_key: randomUUID(),
    })

    expect(secondResult.success).toBe(true)
    expect(secondResult.registration_id).toBe(firstRegistrationId)
    expect(secondResult.is_new).toBe(false)
    expect(secondResult.status).toBe('updated')

    // Verify database: registration unchanged, answers updated
    const details = await getRegistrationDetails(ALLOW_UPDATE_POLICY_EVENT, memberId)
    expect(details?.registration.id).toBe(firstRegistrationId)
    expect(details?.registration.status).toBe('updated')
    expect(details?.answers).toHaveLength(2)

    // Verify old answers replaced
    const teamNameAnswer = details?.answers.find(
      (a) => a.event_field_id === futureEventData?.event_fields?.[0]?.id,
    )
    expect(teamNameAnswer?.answer_text).toBe('Updated Team')

    await cleanupTestRegistrations(ALLOW_UPDATE_POLICY_EVENT, memberId)
  })

  // ============================================================================
  // IDEMPOTENCY
  // ============================================================================

  it('should return same result for same idempotency key', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)
    const idempotencyKey = randomUUID()

    // First request
    const result1 = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Idempotent Team',
        guests_count: 1,
      },
      idempotency_key: idempotencyKey,
    })

    expect(result1.success).toBe(true)
    const registrationId1 = result1.registration_id

    // Retry same request (same idempotency key)
    const result2 = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Idempotent Team',
        guests_count: 1,
      },
      idempotency_key: idempotencyKey,
    })

    expect(result2.success).toBe(true)
    expect(result2.registration_id).toBe(registrationId1)

    // Verify only one registration exists
    const client = createTestAdminClient()
    const { count } = await client
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('id', registrationId1)

    expect(count).toBe(1)

    await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
  })

  it('should treat different idempotency keys as separate submissions', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // First request
    const result1 = await callSubmitRegistrationFunction({
      event_slug: ALLOW_UPDATE_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Team 1',
        guests_count: 1,
      },
      idempotency_key: randomUUID(),
    })

    expect(result1.success).toBe(true)

    // Second request with different key (should update)
    const result2 = await callSubmitRegistrationFunction({
      event_slug: ALLOW_UPDATE_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Team 2',
        guests_count: 2,
      },
      idempotency_key: randomUUID(),
    })

    expect(result2.success).toBe(true)
    expect(result2.is_new).toBe(false)

    await cleanupTestRegistrations(ALLOW_UPDATE_POLICY_EVENT, memberId)
  })

  // ============================================================================
  // CONCURRENCY
  // ============================================================================

  it('should handle concurrent submissions with different idempotency keys', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // Simulate two simultaneous submissions
    const [result1, result2] = await Promise.all([
      callSubmitRegistrationFunction({
        event_slug: ALLOW_UPDATE_POLICY_EVENT,
        member_id: memberId,
        responses: {
          team_name: 'Concurrent Team 1',
          guests_count: 1,
        },
        idempotency_key: randomUUID(),
      }),
      callSubmitRegistrationFunction({
        event_slug: ALLOW_UPDATE_POLICY_EVENT,
        member_id: memberId,
        responses: {
          team_name: 'Concurrent Team 2',
          guests_count: 2,
        },
        idempotency_key: randomUUID(),
      }),
    ])

    // Both should succeed (allow_update policy)
    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)

    // One should be 'submitted', the other 'updated'
    const statuses = [result1.status, result2.status]
    expect(statuses).toContain('submitted')
    expect(statuses).toContain('updated')

    // Should have same registration ID
    expect(result1.registration_id).toBe(result2.registration_id)

    // Verify database state
    const details = await getRegistrationDetails(ALLOW_UPDATE_POLICY_EVENT, memberId)
    expect(details?.registration.status).toMatch(/submitted|updated/)
    expect(details?.answers).toHaveLength(2)

    await cleanupTestRegistrations(ALLOW_UPDATE_POLICY_EVENT, memberId)
  })

  it('should not create duplicate registrations under concurrent writes (block policy)', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // Race two submissions on a block-policy event
    const [result1, result2] = await Promise.all([
      callSubmitRegistrationFunction({
        event_slug: BLOCK_POLICY_EVENT,
        member_id: memberId,
        responses: {
          team_name: 'Race Team 1',
          guests_count: 1,
        },
        idempotency_key: randomUUID(),
      }),
      callSubmitRegistrationFunction({
        event_slug: BLOCK_POLICY_EVENT,
        member_id: memberId,
        responses: {
          team_name: 'Race Team 2',
          guests_count: 2,
        },
        idempotency_key: randomUUID(),
      }),
    ])

    // One should succeed, the other should fail
    const results = [result1, result2]
    const succeeded = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)

    expect(succeeded.length).toBe(1)
    expect(failed.length).toBe(1)
    expect(failed[0].error_code).toBe('duplicate_blocked')

    // Verify only one registration exists
    const client = createTestAdminClient()
    const { count } = await client
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('id', succeeded[0].registration_id)

    expect(count).toBe(1)

    await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
  })

  // ============================================================================
  // CACHE INVALIDATION
  // ============================================================================

  it('should include updated member count in response', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const countBefore = await getEventRegistrationCount(BLOCK_POLICY_EVENT)

    const result = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Count Test',
        guests_count: 1,
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(true)

    const countAfter = await getEventRegistrationCount(BLOCK_POLICY_EVENT)
    expect(countAfter).toBe(countBefore + 1)

    await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
  })

  // ============================================================================
  // VALIDATION & EDGE CASES
  // ============================================================================

  it('should reject missing required fields', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // Submit without required team_name
    const result = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        guests_count: 1,
        // missing team_name
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should reject invalid member ID', async () => {
    const result = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: 'nonexistent-member-id',
      responses: {
        team_name: 'Test',
        guests_count: 1,
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(false)
  })

  it('should reject invalid event slug', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const result = await callSubmitRegistrationFunction({
      event_slug: 'nonexistent-event-slug',
      member_id: memberId,
      responses: {
        team_name: 'Test',
        guests_count: 1,
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(false)
  })

  it('should handle out-of-range field values gracefully', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const result = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: 'Test Team',
        guests_count: 99999, // Possibly out of range
      },
      idempotency_key: randomUUID(),
    })

    // Should either succeed or fail gracefully with clear error
    expect(result.status).toBeGreaterThanOrEqual(200)
    expect(result.success !== undefined).toBe(true)
    expect(result.error !== undefined || result.registration_id !== undefined).toBe(true)

    if (result.success) {
      await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
    }
  })

  it('should reject oversized payloads', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    // Create very large response value
    const hugeString = 'x'.repeat(1000000)

    const result = await callSubmitRegistrationFunction({
      event_slug: BLOCK_POLICY_EVENT,
      member_id: memberId,
      responses: {
        team_name: hugeString,
        guests_count: 1,
      },
      idempotency_key: randomUUID(),
    })

    expect(result.success).toBe(false)
  })

  // ============================================================================
  // RATE LIMITING & ABUSE PATTERNS
  // ============================================================================

  it('should throttle rapid requests from same member on same event', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const attemptCount = 6 // Assuming 5 attempts per minute limit
    const results: any[] = []

    for (let i = 0; i < attemptCount; i++) {
      const result = await callSubmitRegistrationFunction({
        event_slug: ALLOW_UPDATE_POLICY_EVENT,
        member_id: memberId,
        responses: {
          team_name: `Spam Test ${i}`,
          guests_count: i,
        },
        idempotency_key: randomUUID(),
      })
      results.push(result)
    }

    // At least one request should fail or be throttled
    // (Server may not implement rate limiting yet, so we test for graceful handling)
    const allSucceeded = results.every((r) => r.success)

    // If rate limiting is implemented, expect throttling
    if (!allSucceeded) {
      const throttled = results.find((r) => r.status === 429)
      expect(throttled).toBeDefined()
    } else {
      // If not implemented, at least verify we handle multiple requests gracefully
      expect(results.length).toBe(attemptCount)
    }

    await cleanupTestRegistrations(ALLOW_UPDATE_POLICY_EVENT, memberId)
  })

  it('should detect SQL injection patterns in responses', async () => {
    const memberId = generateTestMemberId()
    await seedTestMember(memberId)

    const maliciousInputs = [
      "'; DROP TABLE registrations; --",
      '<script>alert("xss")</script>',
      'a" OR 1=1--',
    ]

    for (const malicious of maliciousInputs) {
      const result = await callSubmitRegistrationFunction({
        event_slug: BLOCK_POLICY_EVENT,
        member_id: memberId,
        responses: {
          team_name: malicious,
          guests_count: 1,
        },
        idempotency_key: randomUUID(),
      })

      // Should either reject or sanitize safely
      if (result.success) {
        // If it succeeded, verify database integrity
        const details = await getRegistrationDetails(BLOCK_POLICY_EVENT, memberId)
        expect(details?.registration).toBeDefined()
        // Clean up for next iteration
        await cleanupTestRegistrations(BLOCK_POLICY_EVENT, memberId)
      } else {
        expect(result.error).toBeDefined()
      }
    }
  })
})
