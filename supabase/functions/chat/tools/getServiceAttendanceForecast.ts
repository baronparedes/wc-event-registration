import { tool } from 'ai';
import { z } from 'chat-zod';

import { getPrimaryRole } from './roles.ts';
import { describeDateRange, formatDate, getPhNow, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

type TimeSlot = '9AM' | '12NN' | '3PM';
type RoleForecast = {
  target: number;
  committed: number;
  excused: number;
  expectedTurnup: number;
};
type SlotForecast = {
  totalTarget: number;
  totalCommitted: number;
  totalExcused: number;
  totalExpectedTurnup: number;
  totalNeeded: number;
  totalSurplus: number;
  roles: Record<string, RoleForecast>;
};

type SlotRoleTargets = Record<string, number>;

type VolunteerTargetsBySlot = {
  '9AM': SlotRoleTargets;
  '12NN': SlotRoleTargets;
  '3PM': SlotRoleTargets;
};

// Default targets aligned with frontend (fallback if none provided)
const DEFAULT_VOLUNTEER_ROLE_TARGETS: SlotRoleTargets = {
  Usher: 10,
  'IMT Support': 2,
  'VMT Support': 2,
  'Backroom Support': 2,
};

const DEFAULT_VOLUNTEER_TARGETS_BY_SLOT: VolunteerTargetsBySlot = {
  '9AM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
  '12NN': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
  '3PM': { ...DEFAULT_VOLUNTEER_ROLE_TARGETS },
};

const DEFAULT_TURNUP_RATE = 0.8;

type ExcusedMemberRecord = {
  userId: string;
  memberId: string;
  requestDate: string;
  services: string; // "9AM, 12NN"
  reason: string;
};

export function createGetServiceAttendanceForecastTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve natural-language timeframes (e.g. "next Sunday", "August") to a concrete date before calling this tool. Defaults to next Sunday.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'End of the date range in YYYY-MM-DD format. Resolve natural-language timeframes to a concrete date before calling this tool.',
      ),
    targetsOverride: z
      .record(z.string(), z.record(z.string(), z.number()))
      .optional()
      .describe(
        'Optional override for volunteer target numbers. Format should be { "9AM": { "Usher": 12, "IMT Support": 2 }, "12NN": { ... } }.',
      ),
  });

  return tool({
    description:
      'Forecast volunteer attendance for Sunday services, specifically to answer questions like "Do I have enough volunteers next Sunday?". Returns expected turnup, committed counts, excused counts, needed volunteers (deficits), and surplus per service slot based on historical attendance rates and targets. Uses "Usher", "IMT Support", "VMT Support", and "Backroom Support" targets.',
    inputSchema: schema,
    execute: async ({ targetStartDate, targetEndDate, targetsOverride }) => {
      const now = getPhNow();
      // Default to upcoming sunday if not provided
      const range = resolveDateRange(targetStartDate, targetEndDate, 'previous_sunday', now);

      console.log('[chat:tool:getServiceAttendanceForecast] Executing', {
        targetStartDate,
        targetEndDate,
        resolvedRange: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        requestId,
      });

      if (!range) {
        return { error: 'Could not resolve a date range for the forecast query.' };
      }

      const targetsToUse =
        (targetsOverride as VolunteerTargetsBySlot) || DEFAULT_VOLUNTEER_TARGETS_BY_SLOT;

      try {
        // 1. Fetch Active Members (where their schedules are stored in metadata)
        const { data: users, error: usersError } = await client
          .from('users')
          .select('id, member_id, role, metadata')
          .eq('is_active', true);

        if (usersError) {
          console.error('[chat:tool:getServiceAttendanceForecast] Users query error', usersError);
          return { error: `Failed to retrieve users: ${usersError.message}` };
        }

        // Parse schedules from metadata for the target date range
        // Since we don't know the exact sundays easily, we will generate the sunday keys for the range
        // and match against the users' schedule.
        const SUNDAY_KEYS = [
          'first_sunday',
          'second_sunday',
          'third_sunday',
          'fourth_sunday',
          'fifth_sunday',
        ];

        type MemberSchedule = {
          user_id: string;
          member_id: string | null;
          role: string;
          service_date: string;
          time_slots: TimeSlot[];
        };
        const schedules: MemberSchedule[] = [];

        // Find all sundays in the range
        const sundays: { dateStr: string; key: string }[] = [];
        const currDate = new Date(range.start);

        // Align to start of first month
        let monthIter = currDate.getMonth();

        let sundayIndex = 0;

        const iterLimit = new Date(range.end);

        while (currDate <= iterLimit) {
          if (currDate.getMonth() !== monthIter) {
            monthIter = currDate.getMonth();

            sundayIndex = 0;
          }
          if (currDate.getDay() === 0) {
            // Sunday
            const key = SUNDAY_KEYS[sundayIndex] || 'fifth_sunday';
            sundays.push({ dateStr: formatDate(currDate), key });
            sundayIndex++;
          }
          currDate.setDate(currDate.getDate() + 1);
        }

        for (const user of users) {
          const metadata = (user.metadata as Record<string, unknown>) || {};
          const role = typeof user.role === 'string' ? user.role : '';

          for (const sunday of sundays) {
            const scheduleStr = metadata[sunday.key];
            if (typeof scheduleStr === 'string' && scheduleStr.trim().length > 0) {
              const times = scheduleStr
                .split(',')
                .map((t) => t.trim().toUpperCase().replace(' ', ''));
              const slots: TimeSlot[] = [];
              for (const t of times) {
                if (t === '9AM' || t === '12NN' || t === '3PM') {
                  slots.push(t as TimeSlot);
                }
              }
              if (slots.length > 0) {
                schedules.push({
                  user_id: user.id,
                  member_id: user.member_id,
                  role,
                  service_date: sunday.dateStr,
                  time_slots: slots,
                });
              }
            }
          }
        }

        // 2. Fetch Excused Members for the months covered by the date range
        let excusedRecords: ExcusedMemberRecord[] = [];
        const startMonth = range.start.getMonth();
        const startYear = range.start.getFullYear();
        const endMonth = range.end.getMonth();
        const endYear = range.end.getFullYear();

        // Build list of year/month to fetch
        const monthsToFetch = [];
        let currYear = startYear;
        let currMonth = startMonth;
        while (currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
          monthsToFetch.push({ year: currYear, monthIndex: currMonth });
          currMonth++;
          if (currMonth > 11) {
            currMonth = 0;
            currYear++;
          }
        }

        const authHeader = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
        const edgeFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-excused-members`;

        for (const m of monthsToFetch) {
          try {
            const res = await fetch(edgeFunctionUrl, {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ year: m.year, monthIndex: m.monthIndex }),
            });
            if (res.ok) {
              const data = (await res.json()) as { records?: ExcusedMemberRecord[] };
              if (data?.records && Array.isArray(data.records)) {
                excusedRecords = excusedRecords.concat(data.records);
              }
            }
          } catch (e) {
            console.error(
              '[chat:tool:getServiceAttendanceForecast] Failed to fetch excused members',
              e,
            );
          }
        }

        // 3. Fetch Historical Stats to calculate Turnup Rate
        // The stats RPC requires start and end dates. We'll use a 3-month lookback window.
        const lookbackStart = new Date(range.start);
        lookbackStart.setMonth(lookbackStart.getMonth() - 3);
        const lookbackStartStr = formatDate(lookbackStart);
        const lookbackEndStr = formatDate(now > range.start ? range.start : now);

        const { data: statsData, error: statsError } = await client.rpc(
          'get_member_service_attendance_stats',
          {
            p_start_date: lookbackStartStr,
            p_end_date: lookbackEndStr,
            p_page: 0,
            p_page_size: 10000,
            p_search_query: '',
          },
        );

        if (statsError) {
          console.error('[chat:tool:getServiceAttendanceForecast] Stats query error', statsError);
        }

        const statsMap = new Map<string, { turnupRate: number }>();
        if (statsData) {
          for (const s of statsData) {
            const scheduled = s.total_count || 0;
            let rate = DEFAULT_TURNUP_RATE;
            if (scheduled > 0) {
              // Turnup rate is checkins + overrides + manual entries / scheduled
              rate = Math.min(
                1,
                Math.max(
                  0,
                  (s.total_checkins + s.total_overrides + s.total_manual_entries) / scheduled,
                ),
              );
            } else if (s.total_walkins > 0) {
              rate = 1.0;
            }
            statsMap.set(s.user_id, { turnupRate: rate });
          }
        }

        // 4. Calculate Forecast
        // Group by Date -> Slot -> Role

        type RoleForecast = {
          target: number;
          committed: number;
          excused: number;
          expectedTurnup: number;
        };

        type SlotForecast = {
          totalTarget: number;
          totalCommitted: number;
          totalExcused: number;
          totalExpectedTurnup: number;
          totalNeeded: number;
          totalSurplus: number;
          roles: Record<string, RoleForecast>;
        };

        const forecastByDate: Record<string, Record<string, SlotForecast>> = {};

        for (const schedule of schedules || []) {
          const dateKey = schedule.service_date;
          if (!forecastByDate[dateKey]) {
            forecastByDate[dateKey] = {
              '9AM': createEmptySlotForecast(targetsToUse['9AM']),
              '12NN': createEmptySlotForecast(targetsToUse['12NN']),
              '3PM': createEmptySlotForecast(targetsToUse['3PM']),
            };
          }

          const userRole = schedule.role;

          const normalizedRole = getPrimaryRole(userRole);
          const userTurnup = statsMap.get(schedule.user_id)?.turnupRate ?? DEFAULT_TURNUP_RATE;

          for (const slot of schedule.time_slots) {
            if (slot !== '9AM' && slot !== '12NN' && slot !== '3PM') continue;

            // Check if excused
            const isExcused = excusedRecords.some(
              (r) =>
                r.userId === schedule.user_id &&
                r.requestDate === dateKey &&
                (r.services.includes(slot) || r.services.includes('ALL')),
            );

            const slotF = forecastByDate[dateKey][slot];
            if (!slotF.roles[normalizedRole]) {
              slotF.roles[normalizedRole] = {
                target: 0,
                committed: 0,
                excused: 0,
                expectedTurnup: 0,
              };
            }

            const roleF = slotF.roles[normalizedRole];
            roleF.committed++;
            slotF.totalCommitted++;

            if (isExcused) {
              roleF.excused++;
              slotF.totalExcused++;
            } else {
              roleF.expectedTurnup += userTurnup;
              slotF.totalExpectedTurnup += userTurnup;
            }
          }
        }

        // Finalize calculations (rounding and deficits)
        const summaryByDate: Record<string, Record<string, SlotForecast>> = {};
        for (const [date, slots] of Object.entries(forecastByDate)) {
          summaryByDate[date] = {};
          for (const [slotKey, slotF] of Object.entries(slots)) {
            let slotNeeded = 0;
            let slotSurplus = 0;
            let finalSlotTurnup = 0;

            for (const roleF of Object.values(slotF.roles)) {
              roleF.expectedTurnup = Math.round(roleF.expectedTurnup);
              finalSlotTurnup += roleF.expectedTurnup;

              const needed = Math.max(0, roleF.target - roleF.expectedTurnup);
              const surplus = Math.max(0, roleF.expectedTurnup - roleF.target);

              slotNeeded += needed;
              slotSurplus += surplus;
            }

            slotF.totalExpectedTurnup = finalSlotTurnup;
            slotF.totalNeeded = slotNeeded; // Total deficit
            slotF.totalSurplus = slotSurplus;

            summaryByDate[date][slotKey] = slotF;
          }
        }

        return {
          timeframe: describeDateRange(range),
          forecasts_by_date: summaryByDate,
          note: 'Total Needed represents the deficit (how many more volunteers are required to meet the target). Expected turnup is based on historical attendance.',
        };
      } catch (err) {
        console.error('[chat:tool:getServiceAttendanceForecast] Unexpected error', err);
        return { error: 'An unexpected error occurred while calculating the forecast.' };
      }
    },
  });
}

function createEmptySlotForecast(targets?: SlotRoleTargets): SlotForecast {
  const roles: Record<string, RoleForecast> = {};
  let totalTarget = 0;
  if (targets) {
    for (const [role, target] of Object.entries(targets)) {
      roles[role] = {
        target,
        committed: 0,
        excused: 0,
        expectedTurnup: 0,
      };
      totalTarget += target;
    }
  }
  return {
    totalTarget,
    totalCommitted: 0,
    totalExcused: 0,
    totalExpectedTurnup: 0,
    totalNeeded: 0,
    totalSurplus: 0,
    roles,
  };
}
