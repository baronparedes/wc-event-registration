import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import { submitApprovalDecisionSchema } from './schemas';
import type {
  ApprovalDecisionResponse,
  ApprovalRequest,
  ApprovalReviewData,
  FetchApprovalsFilters,
  SubmitApprovalDecisionInput,
} from './types';

interface ProcessApprovalDecisionPayload {
  action: 'get_review_data' | 'submit_decision';
  token?: string;
  approval_id?: string;
  decision?: 'approved' | 'rejected';
  notes?: string | null;
  reviewer_email?: string | null;
}

interface ProcessApprovalDecisionResponse {
  success: boolean;
  approval?: ApprovalReviewData['approval'];
  entity_details?: Record<string, unknown> | null;
  message?: string;
  status?: ApprovalRequest['status'];
  result?: unknown;
  error?: string;
}

const callProcessApprovalDecision = createEdgeFunctionCaller<
  ProcessApprovalDecisionPayload,
  ProcessApprovalDecisionResponse
>('process-approval-decision');

export async function fetchApprovalRequests(
  filters?: FetchApprovalsFilters,
): Promise<ApprovalRequest[]> {
  let query = supabase
    .from('approval_requests')
    .select('*, requester_user:users!requester_user_id(avatar_object_key)')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.entity_type && filters.entity_type !== 'all') {
    query = query.eq('entity_type', filters.entity_type);
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(
      `title.ilike.${term},requester_name.ilike.${term},requester_email.ilike.${term},summary.ilike.${term}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch approval requests: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    const requesterUser = raw.requester_user as
      | { avatar_object_key?: string | null }
      | null
      | undefined;

    return {
      ...raw,
      requester_avatar_object_key: requesterUser?.avatar_object_key ?? null,
    } as unknown as ApprovalRequest;
  });
}

export async function fetchApprovalRequestById(id: string): Promise<ApprovalRequest> {
  const { data, error } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch approval request: ${error.message}`);
  }

  return data as unknown as ApprovalRequest;
}

export async function fetchApprovalReviewByToken(token: string): Promise<ApprovalReviewData> {
  const response = await callProcessApprovalDecision({
    action: 'get_review_data',
    token,
  });

  if (!response.success || !response.approval) {
    throw new Error(response.error || 'Failed to fetch approval review details');
  }

  return {
    approval: response.approval,
    entity_details: response.entity_details ?? null,
  };
}

export async function submitApprovalDecision(
  input: SubmitApprovalDecisionInput,
): Promise<ApprovalDecisionResponse> {
  const validated = submitApprovalDecisionSchema.parse(input);

  const response = await callProcessApprovalDecision({
    action: 'submit_decision',
    token: validated.token,
    approval_id: validated.approval_id,
    decision: validated.decision,
    notes: validated.notes,
    reviewer_email: validated.reviewer_email,
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to submit approval decision');
  }

  return {
    success: true,
    message: response.message || `Decision recorded as ${validated.decision}`,
    status: response.status || validated.decision,
    result: response.result,
  };
}
