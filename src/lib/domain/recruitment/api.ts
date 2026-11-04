import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import type { RecruitmentCsvRecord } from './csv';
import {
  type AddRecruiterNotePayload,
  type AdminUpdateStageInput,
  type RecruitmentSettingsInput,
  type RecruitmentStep1Input,
  applicantRecruitmentViewSchema,
  publicRecruitmentConfigSchema,
  recruitmentApplicationRecordSchema,
  recruitmentPipelineTransactionSchema,
  recruitmentSettingsRecordSchema,
} from './schemas';
import type {
  ApplicantRecruitmentView,
  PublicRecruitmentConfig,
  RecruiterNote,
  RecruitmentApplication,
  RecruitmentApplicationDetail,
  RecruitmentSettings,
  RecruitmentStepNumber,
  ReviewerUserItem,
} from './types';

type RecruitmentEdgeResponse = {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
  application_id?: string;
  current_step?: number;
  already_completed?: boolean;
  settings?: unknown;
};

const callSubmitRecruitmentApplication = createEdgeFunctionCaller<
  RecruitmentStep1Input,
  RecruitmentEdgeResponse
>('submit-recruitment-application');

const callUpdateRecruitmentStage = createEdgeFunctionCaller<
  AdminUpdateStageInput,
  RecruitmentEdgeResponse
>('update-recruitment-stage');

const callDeployRecruitmentApplicant = createEdgeFunctionCaller<
  { application_id: string },
  RecruitmentEdgeResponse
>('deploy-recruitment-applicant');

const callUpdateRecruitmentSettings = createEdgeFunctionCaller<
  RecruitmentSettingsInput,
  RecruitmentEdgeResponse
>('update-recruitment-settings');

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (character) => `\\${character}`);
}

export async function fetchRecruitmentSettings(): Promise<RecruitmentSettings> {
  const { data, error } = await supabase
    .from('recruitment_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) throw new Error(`Failed to fetch recruitment settings: ${error.message}`);

  const result = recruitmentSettingsRecordSchema.safeParse(data);
  if (!result.success) throw new Error('Recruitment settings response is invalid');
  return result.data;
}

export async function fetchPublicRecruitmentConfig(): Promise<PublicRecruitmentConfig> {
  const { data, error } = await supabase.rpc('get_public_recruitment_config');
  if (error) throw new Error(`Failed to fetch public recruitment config: ${error.message}`);

  const result = publicRecruitmentConfigSchema.safeParse(data);
  if (!result.success) throw new Error('Public recruitment config response is invalid');
  return result.data;
}

export async function updateRecruitmentSettings(
  input: RecruitmentSettingsInput,
): Promise<RecruitmentSettings> {
  const response = await callUpdateRecruitmentSettings(input);
  if (!response.success || !response.settings) {
    throw new Error(response.error || 'Failed to update recruitment settings');
  }

  const result = recruitmentSettingsRecordSchema.safeParse(response.settings);
  if (!result.success) throw new Error('Updated recruitment settings response is invalid');
  return result.data;
}

export async function fetchMyRecruitmentApplication(): Promise<ApplicantRecruitmentView | null> {
  const { data, error } = await supabase.rpc('get_my_recruitment_application');
  if (error) throw new Error(`Failed to fetch recruitment application: ${error.message}`);
  if (data === null) return null;

  const result = applicantRecruitmentViewSchema.safeParse(data);
  if (!result.success) throw new Error('Applicant recruitment response is invalid');
  return result.data;
}

export async function submitRecruitmentApplication(
  input: RecruitmentStep1Input,
): Promise<RecruitmentEdgeResponse> {
  const response = await callSubmitRecruitmentApplication(input);
  if (!response.success)
    throw new Error(response.error || 'Failed to submit recruitment application');
  return response;
}

export async function updateRecruitmentStage(
  input: AdminUpdateStageInput,
): Promise<RecruitmentEdgeResponse> {
  const response = await callUpdateRecruitmentStage(input);
  if (!response.success) throw new Error(response.error || 'Failed to update recruitment stage');
  return response;
}

export async function deployRecruitmentApplicant(
  applicationId: string,
): Promise<RecruitmentEdgeResponse> {
  const response = await callDeployRecruitmentApplicant({ application_id: applicationId });
  if (!response.success)
    throw new Error(response.error || 'Failed to deploy recruitment applicant');
  return response;
}

export async function archiveRecruitmentApplicant(params: {
  applicationId: string;
  notes?: string | null;
}): Promise<RecruitmentEdgeResponse> {
  const response = await callUpdateRecruitmentStage({
    action: 'archive_applicant',
    application_id: params.applicationId,
    notes: params.notes ?? null,
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to archive recruitment applicant');
  }
  return response;
}

export async function restoreRecruitmentApplicant(params: {
  applicationId: string;
  notes?: string | null;
}): Promise<RecruitmentEdgeResponse> {
  const response = await callUpdateRecruitmentStage({
    action: 'restore_applicant',
    application_id: params.applicationId,
    notes: params.notes ?? null,
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to restore recruitment applicant');
  }
  return response;
}

export async function addRecruiterNote(
  payload: AddRecruiterNotePayload,
): Promise<RecruitmentEdgeResponse> {
  const response = await callUpdateRecruitmentStage({
    action: 'add_note',
    application_id: payload.application_id,
    step_number: payload.step_number,
    notes: payload.content,
  });
  if (!response.success) {
    throw new Error(response.error || 'Failed to add recruiter note');
  }
  return response;
}

export async function fetchAdminRecruitmentApplicationsPage(params: {
  offset: number;
  pageSize: number;
  searchTerm?: string;
  status?: RecruitmentApplication['status'];
  currentStep?: number;
  role?: string;
}): Promise<{ rows: RecruitmentApplication[]; count: number | null }> {
  const { offset, pageSize, searchTerm, status, currentStep, role } = params;
  let query = supabase
    .from('recruitment_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) query = query.eq('status', status);
  if (currentStep) query = query.eq('current_step', currentStep);
  if (role) {
    query = query.or(`desired_role.eq.${role},confirmed_role.eq.${role}`);
  }
  if (searchTerm?.trim()) {
    const term = escapeOrFilterValue(searchTerm.trim());
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,desired_role.ilike.%${term}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch recruitment applications: ${error.message}`);

  const rows = (data ?? []).map((row) => {
    const result = recruitmentApplicationRecordSchema.safeParse(row);
    if (!result.success) throw new Error('Recruitment application response is invalid');
    return result.data;
  });

  return { rows, count };
}

export async function fetchAdminRecruitmentApplicationsForExport(params?: {
  searchTerm?: string;
  status?: RecruitmentApplication['status'];
  currentStep?: number;
  role?: string;
}): Promise<RecruitmentCsvRecord[]> {
  let query = supabase
    .from('recruitment_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.status) query = query.eq('status', params.status);
  if (params?.currentStep) query = query.eq('current_step', params.currentStep);
  if (params?.role) {
    query = query.or(`desired_role.eq.${params.role},confirmed_role.eq.${params.role}`);
  }
  if (params?.searchTerm?.trim()) {
    const term = escapeOrFilterValue(params.searchTerm.trim());
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,desired_role.ilike.%${term}%`,
    );
  }

  const [appsResult, schedulesResult] = await Promise.all([
    query,
    supabase.from('recruitment_application_latest_schedules_view').select('*'),
  ]);

  if (appsResult.error) {
    throw new Error(
      `Failed to fetch recruitment applications for export: ${appsResult.error.message}`,
    );
  }

  const schedulesMap = new Map<
    string,
    {
      scheduled_interview_on?: string | null;
      scheduled_orientation_on?: string | null;
      scheduled_observation_on?: string | null;
      scheduled_evaluation_on?: string | null;
      scheduled_operations_onboarding_on?: string | null;
    }
  >();

  if (schedulesResult.data) {
    for (const item of schedulesResult.data) {
      if (item.application_id) {
        schedulesMap.set(item.application_id, item);
      }
    }
  }

  return (appsResult.data ?? []).map((row) => {
    const parsed = recruitmentApplicationRecordSchema.safeParse(row);
    if (!parsed.success) throw new Error('Recruitment application record is invalid');
    return {
      ...parsed.data,
      latest_schedules: schedulesMap.get(parsed.data.id) ?? null,
    };
  });
}

export async function fetchAdminRecruitmentApplicationDetail(
  applicationId: string,
): Promise<RecruitmentApplicationDetail> {
  const [applicationResult, transactionsResult, notesResult] = await Promise.all([
    supabase.from('recruitment_applications').select('*').eq('id', applicationId).single(),
    supabase
      .from('recruitment_pipeline_transactions')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true }),
    supabase
      .from('recruitment_step_notes')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true }),
  ]);

  if (applicationResult.error) {
    throw new Error(`Failed to fetch recruitment application: ${applicationResult.error.message}`);
  }
  if (transactionsResult.error) {
    throw new Error(`Failed to fetch recruitment history: ${transactionsResult.error.message}`);
  }

  const application = recruitmentApplicationRecordSchema.safeParse(applicationResult.data);
  if (!application.success) throw new Error('Recruitment application response is invalid');

  const transactions = (transactionsResult.data ?? []).map((transaction) => {
    const result = recruitmentPipelineTransactionSchema.safeParse(transaction);
    if (!result.success) throw new Error('Recruitment history response is invalid');
    return result.data;
  });

  const stepNotes: RecruiterNote[] = (notesResult.data ?? []).map((row) => ({
    id: row.id,
    application_id: row.application_id,
    step_number: row.step_number as RecruitmentStepNumber,
    attempt_number: row.attempt_number,
    transaction_id: row.transaction_id,
    author_id: row.author_id,
    author_name: row.author_name,
    author_role: row.author_role,
    avatar_object_key: row.avatar_object_key,
    content: row.content,
    created_at: row.created_at,
  }));

  let dgroupEndorsement: RecruitmentApplicationDetail['dgroup_endorsement'] = null;
  if (application.data.dgroup_approval_id) {
    const { data: approvalData } = await supabase
      .from('approval_requests')
      .select('id, status, decision_notes, decided_at, decided_by_email, metadata')
      .eq('id', application.data.dgroup_approval_id)
      .maybeSingle();

    if (approvalData) {
      let attestationAnswers: Record<string, unknown> | null = null;
      const rawMeta = approvalData.metadata as Record<string, unknown> | null;
      if (rawMeta && rawMeta.attestation_answers) {
        const rawAnswers = rawMeta.attestation_answers;
        if (typeof rawAnswers === 'object' && rawAnswers !== null) {
          attestationAnswers = rawAnswers as Record<string, unknown>;
        } else if (typeof rawAnswers === 'string') {
          try {
            attestationAnswers = JSON.parse(rawAnswers);
          } catch {
            attestationAnswers = null;
          }
        }
      }

      dgroupEndorsement = {
        approval_id: approvalData.id,
        status: approvalData.status as 'pending' | 'approved' | 'rejected',
        decision_notes: approvalData.decision_notes,
        decided_at: approvalData.decided_at,
        decided_by_email: approvalData.decided_by_email,
        attestation_answers: attestationAnswers,
      };
    }
  }

  return {
    application: application.data,
    transactions,
    step_notes: stepNotes,
    dgroup_endorsement: dgroupEndorsement,
  };
}

export async function fetchReviewerUsers(searchTerm = ''): Promise<ReviewerUserItem[]> {
  const trimmed = searchTerm.trim();
  let query = supabase
    .from('users')
    .select('id, full_name, nickname, email, role, avatar_object_key')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .limit(25);

  if (trimmed) {
    const term = escapeOrFilterValue(trimmed);
    query = query.or(
      `full_name.ilike.%${term}%,nickname.ilike.%${term}%,email.ilike.%${term}%,role.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch reviewer users: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.nickname ? `${row.full_name} (${row.nickname})` : row.full_name,
    full_name: row.full_name,
    nickname: row.nickname,
    email: row.email,
    role: row.role,
    avatar_object_key: row.avatar_object_key,
  }));
}

export async function fetchReviewerUserById(id: string): Promise<ReviewerUserItem | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, nickname, email, role, avatar_object_key')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.nickname ? `${data.full_name} (${data.nickname})` : data.full_name,
    full_name: data.full_name,
    nickname: data.nickname,
    email: data.email,
    role: data.role,
    avatar_object_key: data.avatar_object_key,
  };
}
