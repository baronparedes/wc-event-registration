import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  monthIndex: z.number().int().min(0).max(11), // 0-11
});

type GetExcusedMembersRequest = z.infer<typeof requestSchema>;

export type ExcusedMemberRecord = {
  userId: string;
  memberId: string;
  requestDate: string; // The date of the Sunday/service (YYYY-MM-DD)
  services: string; // The services they are excused from
  reason: string; // The reason they are excused
};

type ServiceExcuseRow = {
  id: string;
  user_id: string;
  member_id: string;
  request_date: string;
  services: string[] | string | null;
  reason: string | null;
};

export async function handleGetExcusedMembers(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-excused-members',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin', 'slod'],
    publicRateLimit: {
      scope: 'get-excused-members',
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
    const { year, monthIndex }: GetExcusedMembersRequest = guard.data;
    const supabase = guard.client;

    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;
    const startDate = `${datePrefix}-01`;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${datePrefix}-${String(daysInMonth).padStart(2, '0')}`;

    console.log('[get-excused-members] Starting request processing', {
      requestId: guard.requestId,
      year,
      monthIndex,
      datePrefix,
      startDate,
      endDate,
    });

    const { data: excuses, error: excusesError } = await supabase
      .from('service_excuse_requests')
      .select('id, user_id, member_id, request_date, services, reason')
      .eq('status', 'approved')
      .gte('request_date', startDate)
      .lte('request_date', endDate)
      .order('request_date', { ascending: true });

    if (excusesError) {
      console.error('[get-excused-members] Query error', {
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
      if (Array.isArray(excuse.services)) {
        servicesStr = excuse.services.join(', ');
      } else if (typeof excuse.services === 'string') {
        servicesStr = excuse.services;
      }

      return {
        userId: excuse.user_id,
        memberId: excuse.member_id,
        requestDate: excuse.request_date.split('T')[0].trim(),
        services: servicesStr,
        reason: excuse.reason ?? '',
      };
    });

    console.log('[get-excused-members] Finished building response', {
      requestId: guard.requestId,
      recordsCount: records.length,
    });

    return successResponse(corsHeaders, { records });
  } catch (err) {
    console.error('[get-excused-members] Unexpected exception', {
      requestId: guard.requestId,
      error: err instanceof Error ? err.stack || err.message : err,
    });
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
}
