import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  monthIndex: z.number().int().min(0).max(11), // 0-11
  userId: z.string().uuid().optional(),
});

type GetMemberExcusedScheduleRequest = z.infer<typeof requestSchema>;

export type ExcusedMemberRecord = {
  userId: string;
  memberId: string;
  requestDate: string; // The date of the Sunday/service (YYYY-MM-DD)
  services: string; // The services they are excused from
  reason: string; // The reason they are excused
  status: 'approved' | 'pending';
};

type ServiceExcuseRow = {
  excuse_id: string;
  user_id: string;
  member_id: string;
  sunday_date: string;
  services: string[] | string | null;
  services_str?: string | null;
  reason: string | null;
  status: string;
};

export async function handleGetMemberExcusedSchedule(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-member-excused-schedule',
    method: 'POST',
    requireAuth: true,
    publicRateLimit: {
      scope: 'get-member-excused-schedule',
      windowMs: RATE_LIMIT_PRESETS.getExcusedMembers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.getExcusedMembers.maxHits,
    },
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const {
      year,
      monthIndex,
      userId: requestedUserId,
    }: GetMemberExcusedScheduleRequest = guard.data;
    const supabase = guard.client;
    const authUserId = guard.userId;

    if (!authUserId) {
      return errorResponse(corsHeaders, 401, 'Unauthorized');
    }

    let targetUserId = authUserId;
    if (requestedUserId && requestedUserId !== authUserId) {
      const { data: adminRecord, error: adminCheckError } = await supabase
        .from('admins')
        .select('id, role')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      const isAdmin =
        !adminCheckError &&
        adminRecord &&
        ['admin', 'super_admin', 'slod', 'imt'].includes(adminRecord.role);

      if (!isAdmin) {
        return errorResponse(corsHeaders, 403, 'Forbidden');
      }

      targetUserId = requestedUserId;
    }

    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;
    const startDate = `${datePrefix}-01`;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${datePrefix}-${String(daysInMonth).padStart(2, '0')}`;

    console.log('[get-member-excused-schedule] Starting request processing', {
      requestId: guard.requestId,
      authUserId,
      targetUserId,
      year,
      monthIndex,
      startDate,
      endDate,
    });

    const { data: excuses, error: excusesError } = await supabase
      .from('service_excuse_sundays')
      .select('excuse_id, user_id, member_id, sunday_date, services, services_str, reason, status')
      .eq('user_id', targetUserId)
      .gte('sunday_date', startDate)
      .lte('sunday_date', endDate)
      .order('sunday_date', { ascending: true });

    if (excusesError) {
      console.error('[get-member-excused-schedule] Query error', {
        requestId: guard.requestId,
        error: excusesError,
      });
      return errorResponse(
        corsHeaders,
        500,
        'Failed to query matching excused requests',
        excusesError.message,
      );
    }

    const records: ExcusedMemberRecord[] = ((excuses as ServiceExcuseRow[]) ?? []).map((excuse) => {
      let servicesStr = '';
      if (typeof excuse.services_str === 'string') {
        servicesStr = excuse.services_str;
      } else if (Array.isArray(excuse.services)) {
        servicesStr = excuse.services.join(', ');
      } else if (typeof excuse.services === 'string') {
        servicesStr = excuse.services;
      }

      return {
        userId: excuse.user_id,
        memberId: excuse.member_id,
        requestDate: (excuse.sunday_date || '').split('T')[0].trim(),
        services: servicesStr,
        reason: excuse.reason ?? '',
        status: (excuse.status === 'pending' ? 'pending' : 'approved') as 'approved' | 'pending',
      };
    });

    return successResponse(corsHeaders, { records });
  } catch (err) {
    console.error('[get-member-excused-schedule] Unexpected exception', {
      requestId: guard.requestId,
      error: err instanceof Error ? err.stack || err.message : err,
    });
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
}
