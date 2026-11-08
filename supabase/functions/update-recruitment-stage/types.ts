import type { User } from '@supabase/supabase-js';

import type { Database, Json } from '../_shared/database.types.ts';
import type { SupabaseClient } from '../_shared/handler.ts';
import type { RecruitmentStageAction, UpdateRecruitmentStageRequest } from './schemas.ts';

export type { SupabaseClient };

export type RecruitmentApplication =
  Database['public']['Tables']['recruitment_applications']['Row'];
export type RecruitmentApplicationUpdate =
  Database['public']['Tables']['recruitment_applications']['Update'];
export type RecruitmentTransactionInsert =
  Database['public']['Tables']['recruitment_pipeline_transactions']['Insert'];
export type RecruitmentTransactionUpdate =
  Database['public']['Tables']['recruitment_pipeline_transactions']['Update'];
export type RecruitmentRole = RecruitmentApplication['confirmed_role'];
export type RecruitmentStepKey = RecruitmentTransactionInsert['step_key'];

export type TransactionStatus =
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'declined';

export type TransactionType =
  | 'scheduled'
  | 'rescheduled'
  | 'completed'
  | 'repeated_step'
  | 'returned_to_observation'
  | 'returned_to_interview'
  | 'skipped'
  | 'on_hold'
  | 'archived'
  | 'restored'
  | 'declined';

export type { Json };

/**
 * Resolved, authorized state shared by every action service. Built once by the
 * router in `handler.ts` after authentication, applicant matching, and account linking.
 */
export type RecruitmentActionContext = {
  supabase: SupabaseClient;
  request: UpdateRecruitmentStageRequest;
  application: RecruitmentApplication;
  authUser: User | null;
  userId: string;
  normalizedEmail: string;
  adminRole: string | null;
  isReviewer: boolean;
  corsHeaders: Record<string, string>;
};

export type RecruitmentActionHandler = (context: RecruitmentActionContext) => Promise<Response>;

export type RecruitmentActionRoute = {
  /** When true, the router rejects non-reviewers with 403 before dispatching. */
  requiresReviewer: boolean;
  handle: RecruitmentActionHandler;
};

export type RecruitmentActionMap = Record<RecruitmentStageAction, RecruitmentActionRoute>;
