import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import {
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
  RecruitmentApplication,
  RecruitmentApplicationDetail,
  RecruitmentSettings,
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

export async function fetchAdminRecruitmentApplicationsPage(params: {
  offset: number;
  pageSize: number;
  searchTerm?: string;
  status?: RecruitmentApplication['status'];
}): Promise<{ rows: RecruitmentApplication[]; count: number | null }> {
  const { offset, pageSize, searchTerm, status } = params;
  let query = supabase
    .from('recruitment_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) query = query.eq('status', status);
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

export async function fetchAdminRecruitmentApplicationDetail(
  applicationId: string,
): Promise<RecruitmentApplicationDetail> {
  const [applicationResult, transactionsResult] = await Promise.all([
    supabase.from('recruitment_applications').select('*').eq('id', applicationId).single(),
    supabase
      .from('recruitment_pipeline_transactions')
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

  return {
    application: application.data,
    transactions,
  };
}
