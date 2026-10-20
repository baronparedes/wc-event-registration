import { assertEquals } from '@std/assert';

import { createAnalyzeEventAttendeesTool } from '../analyzeEventAttendees.ts';
import { MOCK_TOOL_OPTIONS, createMockClient, jsonResponse, withMockFetch } from './testHelpers.ts';

Deno.test('analyzeEventAttendees handles member registrations query error', async () => {
  const client = createMockClient();
  const tool = createAnalyzeEventAttendeesTool({ client, requestId: 'req-analyze-1' });

  await withMockFetch(
    () => jsonResponse({ message: 'DB error on member regs' }, 500),
    async () => {
      const result = await tool.execute(
        {
          eventId: 'evt-123',
        },
        MOCK_TOOL_OPTIONS,
      );

      assertEquals(result, {
        error: 'Failed to fetch member registrations: DB error on member regs',
      });
    },
  );
});

Deno.test(
  'analyzeEventAttendees aggregates registrations, check-ins, and member demographics',
  async () => {
    const client = createMockClient();
    const tool = createAnalyzeEventAttendeesTool({ client, requestId: 'req-analyze-2' });

    const mockMemberRegs = [
      {
        status: 'submitted',
        users: {
          date_of_birth: '1995-05-10', // ~31 years old
          role: 'Usher',
          category: 'regular',
          metadata: { gender: 'Male' },
        },
      },
      {
        status: 'cancelled',
        users: {
          date_of_birth: '1970-01-01', // ~56 years old
          role: 'Greeter',
          category: 'lead',
          metadata: { sex: 'female' },
        },
      },
      {
        status: 'submitted',
        users: {
          date_of_birth: null,
          role: null,
          category: null,
          metadata: null,
        },
      },
    ];

    const mockPublicRegs = [
      { status: 'submitted' },
      { status: 'submitted' },
      { status: 'cancelled' },
    ];

    const mockCheckIns = [{ id: 'chk-1' }, { id: 'chk-2' }];

    await withMockFetch(
      (input) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (
          url.pathname.includes('/registrations') &&
          !url.pathname.includes('/public_registrations')
        ) {
          return jsonResponse(mockMemberRegs);
        }
        if (url.pathname.includes('/public_registrations')) {
          return jsonResponse(mockPublicRegs);
        }
        if (url.pathname.includes('/attendance_check_ins')) {
          return jsonResponse(mockCheckIns);
        }
        return jsonResponse([], 404);
      },
      async () => {
        const result = await tool.execute(
          {
            eventId: 'evt-123',
          },
          MOCK_TOOL_OPTIONS,
        );

        if (!result || typeof result !== 'object' || Symbol.asyncIterator in result) {
          throw new Error('Expected object result');
        }

        if ('error' in result) {
          throw new Error(`Unexpected error: ${result.error}`);
        }

        assertEquals(result.summary.totalRegistrations, 6);
        assertEquals(result.summary.totalCheckIns, 2);
        assertEquals(result.summary.attendanceRate, '33.3%');

        // Status counts
        assertEquals(result.registrationCounts.members.submitted, 2);
        assertEquals(result.registrationCounts.members.cancelled, 1);
        assertEquals(result.registrationCounts.public.submitted, 2);
        assertEquals(result.registrationCounts.public.cancelled, 1);

        // Gender
        assertEquals(result.memberDemographics.gender.men, 1);
        assertEquals(result.memberDemographics.gender.ladies, 1);
        assertEquals(result.memberDemographics.gender.unspecified, 1);

        // Age distribution
        assertEquals(result.memberDemographics.age['25-34'], 1);
        assertEquals(result.memberDemographics.age['55+'], 1);
        assertEquals(result.memberDemographics.age['unknown'], 1);

        // Roles & categories
        assertEquals(result.memberDemographics.role['Usher'], 1);
        assertEquals(result.memberDemographics.role['Greeter'], 1);
        assertEquals(result.memberDemographics.role['unspecified'], 1);
        assertEquals(result.memberDemographics.category['regular'], 1);
        assertEquals(result.memberDemographics.category['lead'], 1);
        assertEquals(result.memberDemographics.category['unspecified'], 1);
      },
    );
  },
);
