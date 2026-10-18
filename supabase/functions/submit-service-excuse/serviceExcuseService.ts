import type { SupabaseClient } from '@supabase/supabase-js';

export interface UpsertExcuseParams {
  userId: string;
  memberId: string;
  requestDate: string;
  startDate: string;
  endDate: string;
  isLongLeave: boolean;
  services: string[];
  reason?: string | null;
  status: 'approved' | 'pending';
}

export interface ServiceExcuseRecord {
  id: string;
  user_id: string;
  member_id: string;
  request_date: string;
  start_date: string;
  end_date: string;
  is_long_leave: boolean;
  services: string[];
  reason: string | null;
  status: string;
  approval_request_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function upsertServiceExcuse(
  supabase: SupabaseClient,
  params: UpsertExcuseParams,
): Promise<{ record?: ServiceExcuseRecord; error?: string; errorCode?: string }> {
  // Check if an excuse request already exists for this date/range
  const { data: existing, error: existingError } = await supabase
    .from('service_excuse_requests')
    .select('id, status')
    .eq('user_id', params.userId)
    .eq('request_date', params.requestDate)
    .in('status', ['approved', 'pending'])
    .maybeSingle();

  if (existingError) {
    console.error('Error checking existing excuse:', existingError);
    return {
      error: 'Database error checking existing excuse request',
      errorCode: 'DB_ERROR',
    };
  }

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('service_excuse_requests')
      .update({
        services: params.services,
        reason: params.reason ?? null,
        start_date: params.startDate,
        end_date: params.endDate,
        is_long_leave: params.isLongLeave,
        status: params.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('Error updating excuse request:', updateError);
      return {
        error: 'Failed to update excuse request',
        errorCode: 'DB_UPDATE_ERROR',
      };
    }
    return { record: updated as ServiceExcuseRecord };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('service_excuse_requests')
    .insert({
      user_id: params.userId,
      member_id: params.memberId,
      request_date: params.requestDate,
      start_date: params.startDate,
      end_date: params.endDate,
      is_long_leave: params.isLongLeave,
      services: params.services,
      reason: params.reason ?? null,
      status: params.status,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error('Error inserting excuse request:', insertError);
    return {
      error: 'Failed to submit excuse request',
      errorCode: 'DB_INSERT_ERROR',
    };
  }

  return { record: inserted as ServiceExcuseRecord };
}

export async function linkApprovalToExcuse(
  supabase: SupabaseClient,
  excuseId: string,
  approvalId: string,
): Promise<void> {
  await supabase
    .from('service_excuse_requests')
    .update({ approval_request_id: approvalId })
    .eq('id', excuseId);
}
