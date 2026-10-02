import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const deleteViewRequestSchema = z.object({
  id: z.string().uuid(),
});

type DeleteViewRequest = z.infer<typeof deleteViewRequestSchema>;

export async function handleDeleteAttendanceSavedView(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'delete-attendance-saved-view',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    schema: deleteViewRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const payload: DeleteViewRequest = guard.data;
    const { id } = payload;
    const supabase = guard.client;

    const { error } = await supabase.from('attendance_saved_views').delete().eq('id', id);

    if (error) {
      return errorResponse(corsHeaders, 500, 'Failed to delete view');
    }

    return successResponse(corsHeaders, { success: true }, 200);
  } catch (err) {
    console.error('[delete-attendance-saved-view] Unexpected error', err);
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
}
