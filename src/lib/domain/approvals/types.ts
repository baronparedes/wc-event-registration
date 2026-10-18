export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalEntityType = 'form_submission' | 'service_excuse';

export interface ApprovalRequest {
  id: string;
  entity_type: ApprovalEntityType;
  entity_id: string;
  status: ApprovalStatus;
  title: string;
  summary: string | null;
  requester_user_id: string | null;
  requester_name: string;
  requester_email: string | null;
  requester_avatar_object_key?: string | null;
  assigned_to_email: string | null;
  assigned_to_user_id: string | null;
  decided_by_user_id: string | null;
  decided_by_email: string | null;
  decided_at: string | null;
  decision_notes: string | null;
  access_token: string;
  token_expires_at: string;
  token_used_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApprovalReviewData {
  approval: {
    id: string;
    entity_type: ApprovalEntityType;
    entity_id: string;
    status: ApprovalStatus;
    title: string;
    summary: string | null;
    requester_name: string;
    requester_email: string | null;
    requester_avatar_object_key?: string | null;
    assigned_to_email: string | null;
    decided_at: string | null;
    decided_by_email: string | null;
    decision_notes: string | null;
    token_expires_at: string;
    is_expired: boolean;
    created_at: string;
    metadata: Record<string, unknown>;
  };
  entity_details: Record<string, unknown> | null;
}

export interface SubmitApprovalDecisionInput {
  token?: string;
  approval_id?: string;
  decision: 'approved' | 'rejected';
  notes?: string | null;
  reviewer_email?: string | null;
}

export interface ApprovalDecisionResponse {
  success: boolean;
  message: string;
  status: ApprovalStatus;
  result?: unknown;
}

export interface FetchApprovalsFilters {
  status?: ApprovalStatus | 'all';
  entity_type?: ApprovalEntityType | 'all';
  search?: string;
}
