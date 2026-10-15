import { assertEquals } from '@std/assert';

import { getSystemPrompt } from '../prompt.ts';
import { createGetEventsTool } from '../tools/getEvents.ts';
import { createGetExcusedMembersTool } from '../tools/getExcusedMembers.ts';
import { createGetUnexcusedVolunteersTool } from '../tools/getUnexcusedVolunteers.ts';
import { createGetUserCommitmentsTool } from '../tools/getUserCommitments.ts';
import { createGetUserDemographicsTool } from '../tools/getUserDemographics.ts';
import { createGetUserServiceActivityTool } from '../tools/getUserServiceActivity.ts';
import type { ToolContext } from '../tools/types.ts';

// Lightweight in-memory mock client builder for tool execution testing
function createMockClient(dataMap: Record<string, Record<string, unknown>[]>) {
  return {
    from: (table: string) => {
      let result: Record<string, unknown>[] = [...(dataMap[table] ?? [])];
      const chain = {
        select: () => chain,
        eq: (field: string, val: unknown) => {
          result = result.filter((row) => {
            const nested = field
              .split('.')
              .reduce(
                (acc: unknown, part: string) =>
                  acc && typeof acc === 'object'
                    ? (acc as Record<string, unknown>)[part]
                    : undefined,
                row,
              );
            return (row[field] ?? nested) === val;
          });
          return chain;
        },
        neq: (field: string, val: unknown) => {
          result = result.filter((row) => {
            const nested = field
              .split('.')
              .reduce(
                (acc: unknown, part: string) =>
                  acc && typeof acc === 'object'
                    ? (acc as Record<string, unknown>)[part]
                    : undefined,
                row,
              );
            return (row[field] ?? nested) !== val;
          });
          return chain;
        },
        ilike: (field: string, pattern: string) => {
          const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
          result = result.filter((row) =>
            String(row[field] ?? '')
              .toLowerCase()
              .includes(cleanPattern),
          );
          return chain;
        },
        gte: (field: string, val: string) => {
          result = result.filter((row) => String(row[field] ?? '') >= val);
          return chain;
        },
        lte: (field: string, val: string) => {
          result = result.filter((row) => String(row[field] ?? '') <= val);
          return chain;
        },
        in: (field: string, vals: unknown[]) => {
          result = result.filter((row) => vals.includes(row[field]));
          return chain;
        },
        order: () => chain,
        range: (from: number, to: number) => {
          result = result.slice(from, to + 1);
          return chain;
        },
        limit: (n: number) => {
          result = result.slice(0, n);
          return chain;
        },
        or: () => chain,
        then: (resolve: (val: { data: Record<string, unknown>[]; error: null }) => unknown) =>
          resolve({ data: result, error: null }),
      };
      return chain;
    },
    rpc: () => Promise.resolve({ data: 5, error: null }),
  } as unknown as ToolContext['client'];
}

const mockOptions = { messages: [] } as never;

Deno.test('System Prompt retains all core rules, table headers, and canonical routes', () => {
  const prompt = getSystemPrompt();

  // Core scope & privacy rules
  assertEquals(prompt.includes('NEVER output real names, emails, or personal identifiers'), true);
  assertEquals(prompt.includes('PRIMARY ROLE RULE'), true);
  assertEquals(prompt.includes('TOOL ABSTRACTION'), true);

  // Absence rules
  assertEquals(prompt.includes('Excused Absences: Volunteers with approved excuse requests'), true);
  assertEquals(prompt.includes('Unexcused Absences: Committed volunteers with no check-in'), true);

  // Scoring formula
  assertEquals(prompt.includes('Attended (+1.0), Unexcused (-1.0), Excused (-0.5)'), true);

  // Canonical admin routes inlined
  assertEquals(prompt.includes('/admin/hub-calendar'), true);
  assertEquals(prompt.includes('/admin/services'), true);
  assertEquals(prompt.includes('/admin/services/attendance/commitment'), true);
  assertEquals(prompt.includes('/admin/members'), true);
  assertEquals(prompt.includes('/admin/events'), true);
  assertEquals(prompt.includes('/admin/forms'), true);
  assertEquals(prompt.includes('/admin/users/roles'), true);
  assertEquals(prompt.includes('/admin/chat'), true);

  // Two-phase creation protocol
  assertEquals(prompt.includes('PHASE 1 (Proposal)'), true);
  assertEquals(prompt.includes('PHASE 2 (Execution)'), true);
});

Deno.test(
  'getUserDemographics returns pure aggregate counts and percentages without tokens',
  async () => {
    const mockUsers = [
      {
        role: 'Usher',
        date_of_birth: '1995-06-15',
        metadata: { gender: 'male' },
        is_active: true,
      },
      {
        role: 'Usher / Greeter',
        date_of_birth: '1988-02-20',
        metadata: { gender: 'lady' },
        is_active: true,
      },
      {
        role: 'Prayer Coach',
        date_of_birth: null,
        metadata: { gender: 'female' },
        is_active: true,
      },
    ];

    const client = createMockClient({ users: mockUsers });
    const tool = createGetUserDemographicsTool({
      client,
      requestId: 'test-req',
      userId: 'test-admin',
    });

    const result = (await tool.execute({}, mockOptions)) as Record<string, unknown>;

    assertEquals(result.total_users, 3);
    assertEquals(result.total_users_with_birthday, 2);
    assertEquals(result.total_users_without_birthday, 1);

    // Gender breakdown is count and percentage only
    const genderBreakdown = result.gender_breakdown as Record<
      string,
      { count: number; percentage: number }
    >;
    assertEquals(genderBreakdown.men.count, 1);
    assertEquals(genderBreakdown.ladies.count, 2);
    assertEquals('tokens' in genderBreakdown.men, false);

    // Role breakdown is count and percentage only
    const roleBreakdown = result.role_breakdown as Record<string, { count: number }>;
    assertEquals(roleBreakdown.Usher.count, 2); // Primary role Usher includes 'Usher / Greeter'
    assertEquals(roleBreakdown['Prayer Coach'].count, 1);
    assertEquals('tokens' in roleBreakdown.Usher, false);
    assertEquals('matching_volunteers' in result, false);
  },
);

Deno.test(
  'getUserDemographics returns matching_volunteers when age/gender filters are applied',
  async () => {
    const mockUsers = [
      {
        role: 'Usher',
        date_of_birth: '2008-01-10',
        metadata: { gender: 'male' },
        user_tokens: [{ token: 'USR_TEEN_01' }],
        is_active: true,
      },
      {
        role: 'Usher',
        date_of_birth: '1995-06-15',
        metadata: { gender: 'female' },
        user_tokens: [{ token: 'USR_ADULT_02' }],
        is_active: true,
      },
      {
        role: 'Prayer Coach',
        date_of_birth: '2009-05-20',
        metadata: { gender: 'lady' },
        user_tokens: [{ token: 'USR_TEEN_03' }],
        is_active: true,
      },
    ];

    const client = createMockClient({ users: mockUsers });
    const tool = createGetUserDemographicsTool({
      client,
      requestId: 'test-req',
      userId: 'test-admin',
    });

    // 1. Filter maxAge = 19 (volunteers below 20 years old)
    const resultBelow20 = (await tool.execute({ maxAge: 19 }, mockOptions)) as Record<
      string,
      unknown
    >;
    assertEquals(resultBelow20.total_matching, 2);
    const below20Volunteers = resultBelow20.matching_volunteers as Array<{
      token: string;
      role: string;
      age: number;
      gender: string;
    }>;
    assertEquals(below20Volunteers.length, 2);
    assertEquals(below20Volunteers.map((v) => v.token).sort(), ['USR_TEEN_01', 'USR_TEEN_03']);

    // 2. Filter maxAge = 19 AND role = 'usher'
    const resultUsherBelow20 = (await tool.execute(
      { maxAge: 19, role: 'usher' },
      mockOptions,
    )) as Record<string, unknown>;
    assertEquals(resultUsherBelow20.total_matching, 1);
    const usherBelow20 = resultUsherBelow20.matching_volunteers as Array<{ token: string }>;
    assertEquals(usherBelow20[0].token, 'USR_TEEN_01');

    // 3. Filter gender = 'ladies'
    const resultLadies = (await tool.execute({ gender: 'ladies' }, mockOptions)) as Record<
      string,
      unknown
    >;
    assertEquals(resultLadies.total_matching, 2);
    const ladies = resultLadies.matching_volunteers as Array<{ token: string }>;
    assertEquals(ladies.map((v) => v.token).sort(), ['USR_ADULT_02', 'USR_TEEN_03']);
  },
);

Deno.test(
  'getUserServiceActivity applies limit capping to prevent unbounded volunteer payloads',
  async () => {
    const mockRecords = Array.from({ length: 30 }, (_, i) => ({
      user_id: `user-${i}`,
      service_date: '2026-10-11',
      time_slot: '9AM',
      checked_in_at: '2026-10-11T09:05:00+08:00',
      is_walk_in: i % 2 === 0,
      is_override: false,
      users: {
        role: 'Usher',
        user_tokens: [{ token: `USR_${String(i).padStart(6, '0')}` }],
      },
    }));

    const client = createMockClient({ service_attendance: mockRecords });
    const tool = createGetUserServiceActivityTool({
      client,
      requestId: 'test-req',
      userId: 'test-admin',
    });

    // Execute with a tight limit of 10
    const result = (await tool.execute(
      {
        activityType: 'active',
        limit: 10,
        targetStartDate: '2026-10-01',
        targetEndDate: '2026-10-31',
      },
      mockOptions,
    )) as {
      volunteers: unknown[];
      summary: { total_active_volunteers: number; returned_count: number };
    };

    assertEquals(result.volunteers.length, 10);
    assertEquals(result.summary.returned_count, 10);
    assertEquals(result.summary.total_active_volunteers, 30);
  },
);

Deno.test('getEvents truncates event description to 160 chars', async () => {
  const longDescription = 'A'.repeat(500);
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Annual Retreat',
      slug: 'annual-retreat',
      description: longDescription,
      starts_at: '2026-11-01T08:00:00Z',
      ends_at: '2026-11-02T17:00:00Z',
      registration_opens_at: null,
      registration_closes_at: null,
      status: 'published',
      registration_mode: 'open',
      location: 'Main Hall',
    },
  ];

  const client = createMockClient({ events: mockEvents });
  const tool = createGetEventsTool({ client, requestId: 'test-req', userId: 'test-admin' });

  const result = (await tool.execute(
    { limit: 5, status: 'all', timeframe: 'all' },
    mockOptions,
  )) as {
    events: Array<{ description: string; admin_url: string }>;
  };

  assertEquals(result.events.length, 1);
  assertEquals(result.events[0].description.length, 163); // 160 chars + '...'
  assertEquals(result.events[0].admin_url, '/admin/events/event-1');
});

Deno.test(
  'getUserCommitments returns clean breakdown counts and slots without nested duplicate tokens',
  async () => {
    const mockUsers = [
      {
        id: 'u-1',
        role: 'Usher',
        metadata: { first_sunday: '9AM, 12NN' },
        is_active: true,
        user_tokens: [{ token: 'USR_000001' }],
      },
      {
        id: 'u-2',
        role: 'Prayer Coach',
        metadata: { first_sunday: '9AM' },
        is_active: true,
        user_tokens: [{ token: 'USR_000002' }],
      },
    ];

    const client = createMockClient({ users: mockUsers });
    const tool = createGetUserCommitmentsTool({
      client,
      requestId: 'test-req',
      userId: 'test-admin',
    });

    const result = (await tool.execute(
      { targetStartDate: '2026-10-04', targetEndDate: '2026-10-04' },
      mockOptions,
    )) as {
      count: number;
      tokens: string[];
      service_breakdown: Record<string, { count: number }>;
      role_breakdown: Record<string, { count: number; tokens: string[] }>;
      sunday_breakdown: Array<{
        date: string;
        count: number;
        service_breakdown: Record<string, { count: number; tokens: string[] }>;
      }>;
    };

    assertEquals(result.count, 2);
    assertEquals(result.tokens, ['USR_000001', 'USR_000002']);

    // Top-level service_breakdown is count-only (no redundant tokens array)
    assertEquals(result.service_breakdown['9AM'].count, 2);
    assertEquals('tokens' in result.service_breakdown['9AM'], false);

    // Role breakdown contains tokens for the role, but no nested service_breakdown or sunday_breakdown
    assertEquals(result.role_breakdown.Usher.count, 1);
    assertEquals(result.role_breakdown.Usher.tokens, ['USR_000001']);
    assertEquals('service_breakdown' in result.role_breakdown.Usher, false);
    assertEquals('sunday_breakdown' in result.role_breakdown.Usher, false);

    // Sunday breakdown has per-slot tokens for that specific Sunday
    assertEquals(result.sunday_breakdown.length, 1);
    assertEquals(result.sunday_breakdown[0].service_breakdown['9AM'].tokens.length, 2);
  },
);

Deno.test(
  'getExcusedMembers returns structured excused_volunteers and count-only breakdowns',
  async () => {
    Deno.env.set('EXCUSE_REQUEST_EVENT_ID', 'event-excuse-123');

    const mockUsers = [
      {
        id: 'u-1',
        member_id: 'MEM-001',
        role: 'Usher',
        is_active: true,
        user_tokens: [{ token: 'USR_000001' }],
      },
    ];

    const mockDateAnswers = [
      {
        registration_id: 'reg-1',
        event_fields: { field_key: 'request_date' },
        registrations: { status: 'confirmed', event_id: 'event-excuse-123', user_id: 'u-1' },
        answer_date: '2026-10-18',
      },
    ];

    const mockRegistrations = [
      {
        id: 'reg-1',
        users: { id: 'u-1', member_id: 'MEM-001' },
        registration_answers: [
          {
            event_fields: { field_key: 'request_date' },
            answer_date: '2026-10-18',
            answer_text: '2026-10-18',
            answer_json: null,
          },
          {
            event_fields: { field_key: 'services' },
            answer_date: null,
            answer_text: '["9AM"]',
            answer_json: null,
          },
          {
            event_fields: { field_key: 'reason' },
            answer_date: null,
            answer_text: 'Out of town',
            answer_json: null,
          },
        ],
      },
    ];

    const client = createMockClient({
      registration_answers: mockDateAnswers,
      registrations: mockRegistrations,
      users: mockUsers,
    });

    const tool = createGetExcusedMembersTool({
      client,
      requestId: 'test-req',
      userId: 'test-admin',
    });

    const result = (await tool.execute(
      { targetStartDate: '2026-10-18', targetEndDate: '2026-10-18' },
      mockOptions,
    )) as {
      count: number;
      tokens: string[];
      excused_volunteers: Array<{ token: string; role: string; reasons: string[] }>;
      role_breakdown: Record<string, { count: number }>;
      service_breakdown: Record<string, { count: number }>;
    };

    assertEquals(result.count, 1);
    assertEquals(result.tokens, ['USR_000001']);

    // excused_volunteers has concise details for markdown table rendering
    assertEquals(result.excused_volunteers.length, 1);
    assertEquals(result.excused_volunteers[0].token, 'USR_000001');
    assertEquals(result.excused_volunteers[0].role, 'Usher');
    assertEquals(result.excused_volunteers[0].reasons, ['Out of town']);

    // Breakdowns are count-only
    assertEquals(result.role_breakdown.Usher.count, 1);
    assertEquals('tokens' in result.role_breakdown.Usher, false);
    assertEquals(result.service_breakdown['9AM'].count, 1);
    assertEquals('tokens' in result.service_breakdown['9AM'], false);
  },
);

Deno.test('getUnexcusedVolunteers returns volunteers list and count-only breakdowns', async () => {
  const mockUsers = [
    {
      id: 'u-1',
      role: 'Usher',
      metadata: { first_sunday: '9AM' },
      is_active: true,
      user_tokens: [{ token: 'USR_000001' }],
    },
  ];

  // u-1 was committed on first_sunday 9AM, but has 0 service_attendance checkins and 0 excuses
  const client = createMockClient({
    users: mockUsers,
    service_attendance: [],
    form_submissions: [],
    forms: [{ id: 'form-excuse', slug: 'volunteer-excuse-request' }],
  });

  const tool = createGetUnexcusedVolunteersTool({
    client,
    requestId: 'test-req',
    userId: 'test-admin',
  });

  const result = (await tool.execute(
    { targetStartDate: '2026-10-04', targetEndDate: '2026-10-04' },
    mockOptions,
  )) as {
    count: number;
    tokens: string[];
    volunteers: Array<{ token: string; role: string; committed_slots: string[] }>;
    role_breakdown: Record<string, { count: number }>;
    service_breakdown: Record<string, { count: number }>;
  };

  assertEquals(result.count, 1);
  assertEquals(result.tokens, ['USR_000001']);
  assertEquals(result.volunteers.length, 1);
  assertEquals(result.volunteers[0].token, 'USR_000001');
  assertEquals(result.volunteers[0].role, 'Usher');
  assertEquals(result.volunteers[0].committed_slots, ['9AM']);

  // Breakdowns are count-only
  assertEquals(result.role_breakdown.Usher.count, 1);
  assertEquals('tokens' in result.role_breakdown.Usher, false);
  assertEquals(result.service_breakdown['9AM'].count, 1);
  assertEquals('tokens' in result.service_breakdown['9AM'], false);
});
