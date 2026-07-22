import { POSTGRES_ERROR_CODES } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import type { SupabaseClient } from '@/shared/handler.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import type { AdminAccountRole } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

const upsertViewRequestSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200),
  view_config: z.record(z.unknown()),
});

type UpsertViewRequest = z.infer<typeof upsertViewRequestSchema>;

async function generateViewName(supabase: SupabaseClient, eventId: string): Promise<string> {
  const { count, error } = await supabase
    .from('attendance_saved_views')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) throw error;
  return `View ${(count ?? 0) + 1}`;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'upsert-attendance-saved-view',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin', 'slod'],
    schema: upsertViewRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const payload: UpsertViewRequest = guard.data;
    const { id, event_id, name, view_config } = payload;
    const supabase = guard.client;

    if (!guard.userId) {
      return errorResponse(corsHeaders, 401, 'Unauthorized');
    }

    const { data: adminRecord, error: adminRecordError } = await supabase
      .from('admins')
      .select('role')
      .eq('auth_user_id', guard.userId)
      .maybeSingle<{ role: AdminAccountRole }>();

    if (adminRecordError || !adminRecord) {
      return errorResponse(corsHeaders, 401, 'Unauthorized');
    }

    if (id && adminRecord.role === 'slod') {
      return errorResponse(corsHeaders, 403, 'SLOD cannot update existing saved views');
    }

    const viewName =
      !name || name.startsWith('View ') ? await generateViewName(supabase, event_id) : name;

    if (id) {
      // Update existing view
      const { data: updatedView, error: updateError } = await supabase
        .from('attendance_saved_views')
        .update({
          name: viewName,
          view_config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('event_id', event_id)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === POSTGRES_ERROR_CODES.uniqueViolation) {
          return errorResponse(corsHeaders, 409, 'A view with this name already exists');
        }
        throw updateError;
      }

      return successResponse(corsHeaders, updatedView, 200);
    } else {
      // Create new view
      const { data: newView, error: createError } = await supabase
        .from('attendance_saved_views')
        .insert({
          event_id,
          name: viewName,
          view_config,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === POSTGRES_ERROR_CODES.uniqueViolation) {
          return errorResponse(corsHeaders, 409, 'A view with this name already exists');
        }
        throw createError;
      }

      return successResponse(corsHeaders, newView, 201);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(corsHeaders, 500, message);
  }
});
