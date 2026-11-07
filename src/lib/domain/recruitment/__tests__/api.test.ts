import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addRecruiterNote,
  archiveRecruitmentApplicant,
  deployRecruitmentApplicant,
  fetchAdminRecruitmentApplicationDetail,
  fetchAdminRecruitmentApplicationsForExport,
  fetchAdminRecruitmentApplicationsPage,
  fetchMyRecruitmentApplication,
  fetchPublicRecruitmentConfig,
  fetchRecruitmentSettings,
  fetchReviewerUserById,
  fetchReviewerUsers,
  restoreRecruitmentApplicant,
  submitRecruitmentApplication,
  updateRecruitmentSettings,
  updateRecruitmentStage,
  uploadRecruitmentApplicantAvatar,
} from '@/lib/domain/recruitment/api';
import type {
  RecruitmentSettingsInput,
  RecruitmentStep1Input,
} from '@/lib/domain/recruitment/schemas';
import type {
  RecruitmentApplication,
  RecruitmentPipelineTransaction,
} from '@/lib/domain/recruitment/types';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  edge: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/infrastructure', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
  logger: { error: mocks.logError },
  createEdgeFunctionCaller: (name: string) => (input: unknown) => mocks.edge(name, input),
}));

type QueryResponse = { data: unknown; error: { message: string } | null; count?: number | null };

function queryFor(
  data: unknown,
  error: QueryResponse['error'] = null,
  count: number | null = null,
) {
  const response: QueryResponse = { data, error, count };
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: Promise.resolve(response).then.bind(Promise.resolve(response)),
  };
}

const applicationId = '22222222-2222-4222-8222-222222222222';
const timestamp = '2026-11-02T00:00:00+00:00';

const stepOne: RecruitmentStep1Input = {
  email: 'applicant@example.com',
  first_name: 'Test Applicant',
  middle_name: null,
  last_name: 'Test Member',
  nickname: 'Test Nick',
  phone: '09171234567',
  date_of_birth: '1995-06-15',
  gender: 'Female',
  life_stage: 'Single',
  desired_role: 'Usher',
  personal_details: { occupation: 'Teacher' },
  emergency_contact: { name: 'Test Contact', phone: '09179876543', relation: 'Sibling' },
  application_history: { is_first_time_applicant: true },
  spiritual_background: {
    ccf_member_since: '2018 Jan',
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2022 Jan',
    leader_name: 'Test Leader',
    leader_email: 'leader@example.com',
    leader_phone: '09171112222',
    is_dgroup_leader: false,
  },
  survey_answers: { survey_q1: 'true' },
  applicant_attested: true,
};

const application: RecruitmentApplication = {
  ...stepOne,
  id: applicationId,
  auth_user_id: null,
  middle_name: null,
  full_name: 'Test Applicant Test Member',
  avatar_object_key: null,
  confirmed_role: null,
  spiritual_background: { ...stepOne.spiritual_background, glc2_status: 'Ongoing' },
  applicant_attested_at: timestamp,
  survey_score: 1,
  survey_total: 1,
  current_step: 1,
  status: 'active',
  dgroup_approval_id: null,
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: { first_sunday: ['9AM'] },
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: timestamp,
  updated_at: timestamp,
};

const transaction: RecruitmentPipelineTransaction = {
  id: '33333333-3333-4333-8333-333333333333',
  application_id: applicationId,
  step_number: 2,
  step_key: 'interview',
  attempt_number: 1,
  transaction_type: 'scheduled',
  from_step: 1,
  to_step: 2,
  status: 'scheduled',
  assigned_reviewer_id: null,
  assigned_reviewer_name: null,
  scheduled_at: timestamp,
  completed_at: null,
  rubric_data: {},
  notes: null,
  applicant_visible_notes: null,
  created_by_user_id: null,
  created_at: timestamp,
};

const question = {
  field_key: 'survey_q1',
  label: 'Test question',
  field_type: 'boolean' as const,
  is_required: true,
  is_active: true,
};
const settingsInput: RecruitmentSettingsInput = {
  is_recruitment_open: true,
  eligibility_rules: {
    min_age: 18,
    max_age: 80,
    requires_glc1_completed: true,
    min_dgroup_months: 6,
  },
  vmt_registration_url: '',
  orientation_instructions: 'Attend orientation',
  survey_questions: [{ ...question, correct_answer: 'true' }],
  endorsement_questions: [question],
};
const settings = { ...settingsInput, id: 1, updated_at: timestamp };
const reviewer = {
  id: applicationId,
  full_name: 'Test Reviewer',
  nickname: 'Test Nick',
  email: 'reviewer@example.com',
  role: 'Usher',
  avatar_object_key: 'avatars/reviewer.jpg',
};

describe('recruitment API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and validates settings and public configuration', async () => {
    const query = queryFor(settings);
    mocks.from.mockReturnValue(query);
    await expect(fetchRecruitmentSettings()).resolves.toEqual(settings);
    expect(mocks.from).toHaveBeenCalledWith('recruitment_settings');
    expect(query.eq).toHaveBeenCalledWith('id', 1);
    const config = {
      is_recruitment_open: settingsInput.is_recruitment_open,
      eligibility_rules: settingsInput.eligibility_rules,
      vmt_registration_url: settingsInput.vmt_registration_url,
      orientation_instructions: settingsInput.orientation_instructions,
      survey_questions: [question],
    };
    mocks.rpc.mockResolvedValue({ data: config, error: null });
    await expect(fetchPublicRecruitmentConfig()).resolves.toEqual(config);
    expect(mocks.rpc).toHaveBeenCalledWith('get_public_recruitment_config');
  });

  it.each([
    { fetch: fetchRecruitmentSettings, label: 'recruitment settings', rpc: false },
    { fetch: fetchPublicRecruitmentConfig, label: 'public recruitment config', rpc: true },
  ])('rejects database errors and invalid $label responses', async ({ fetch, label, rpc }) => {
    mocks.from.mockReturnValue(queryFor(null, { message: 'Unavailable' }));
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Unavailable' } });
    await expect(fetch()).rejects.toThrow(`Failed to fetch ${label}: Unavailable`);
    mocks.from.mockReturnValue(queryFor({}));
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    await expect(fetch()).rejects.toThrow(
      rpc
        ? 'Public recruitment config response is invalid'
        : 'Recruitment settings response is invalid',
    );
  });

  it('updates settings through the Edge Function and validates returned settings', async () => {
    mocks.edge.mockResolvedValue({ success: true, settings });
    await expect(updateRecruitmentSettings(settingsInput)).resolves.toEqual(settings);
    expect(mocks.edge).toHaveBeenCalledWith('update-recruitment-settings', settingsInput);
    mocks.edge.mockResolvedValue({ success: true, settings: {} });
    await expect(updateRecruitmentSettings(settingsInput)).rejects.toThrow(
      'Updated recruitment settings response is invalid',
    );
  });

  it.each([
    [{ success: false, error: 'Forbidden' }, 'Forbidden'],
    [{ success: false }, 'Failed to update recruitment settings'],
    [{ success: true }, 'Failed to update recruitment settings'],
  ])('rejects failed or missing settings responses %j', async (response, message) => {
    mocks.edge.mockResolvedValue(response);
    await expect(updateRecruitmentSettings(settingsInput)).rejects.toThrow(message);
  });

  it('returns a validated applicant view or null when no application exists', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(fetchMyRecruitmentApplication()).resolves.toBeNull();
    const view = {
      ...application,
      dgroup_approval_status: null,
      dgroup_leader_name: 'Test Leader',
      transactions: [],
    };
    mocks.rpc.mockResolvedValue({ data: view, error: null });
    const result = await fetchMyRecruitmentApplication();
    expect(result).toMatchObject({ id: applicationId, transactions: [], current_step: 1 });
    expect(result).not.toHaveProperty('phone');
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_recruitment_application');
  });

  it('propagates applicant-view query errors and logs malformed responses', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Access denied' } });
    await expect(fetchMyRecruitmentApplication()).rejects.toThrow(
      'Failed to fetch recruitment application: Access denied',
    );
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    await expect(fetchMyRecruitmentApplication()).rejects.toThrow(
      'Applicant recruitment response is invalid',
    );
    expect(mocks.logError).toHaveBeenCalledWith(
      'Failed to parse applicant recruitment view',
      expect.objectContaining({ data: {}, error: expect.any(Object) }),
    );
  });

  const mutationCases = [
    {
      label: 'submit recruitment application',
      name: 'submit-recruitment-application',
      run: () => submitRecruitmentApplication(stepOne),
      payload: stepOne,
    },
    {
      label: 'update recruitment stage',
      name: 'update-recruitment-stage',
      run: () => updateRecruitmentStage({ action: 'complete_vmt', application_id: applicationId }),
      payload: { action: 'complete_vmt', application_id: applicationId },
    },
    {
      label: 'deploy recruitment applicant',
      name: 'deploy-recruitment-applicant',
      run: () => deployRecruitmentApplicant(applicationId),
      payload: { application_id: applicationId },
    },
    {
      label: 'archive recruitment applicant',
      name: 'update-recruitment-stage',
      run: () => archiveRecruitmentApplicant({ applicationId }),
      payload: { action: 'archive_applicant', application_id: applicationId, notes: null },
    },
    {
      label: 'restore recruitment applicant',
      name: 'update-recruitment-stage',
      run: () => restoreRecruitmentApplicant({ applicationId }),
      payload: { action: 'restore_applicant', application_id: applicationId, notes: null },
    },
    {
      label: 'add recruiter note',
      name: 'update-recruitment-stage',
      run: () =>
        addRecruiterNote({ application_id: applicationId, step_number: 2, content: 'Note' }),
      payload: { action: 'add_note', application_id: applicationId, step_number: 2, notes: 'Note' },
    },
  ];

  it.each(mutationCases)(
    'forwards the $label payload and returns success',
    async ({ run, name, payload }) => {
      const response = { success: true, application_id: applicationId, current_step: 2 };
      mocks.edge.mockResolvedValue(response);
      await expect(run()).resolves.toEqual(response);
      expect(mocks.edge).toHaveBeenCalledWith(name, payload);
    },
  );

  it.each(mutationCases)(
    'propagates explicit and fallback $label errors',
    async ({ run, label }) => {
      mocks.edge.mockResolvedValue({ success: false, error: 'Rejected' });
      await expect(run()).rejects.toThrow('Rejected');
      mocks.edge.mockResolvedValue({ success: false });
      await expect(run()).rejects.toThrow(`Failed to ${label}`);
      mocks.edge.mockRejectedValue(new Error('Network failed'));
      await expect(run()).rejects.toThrow('Network failed');
    },
  );

  it.each([archiveRecruitmentApplicant, restoreRecruitmentApplicant])(
    'preserves supplied archive and restore notes',
    async (run) => {
      mocks.edge.mockResolvedValue({ success: true });
      await run({ applicationId, notes: 'Administrative note' });
      expect(mocks.edge).toHaveBeenCalledWith(
        'update-recruitment-stage',
        expect.objectContaining({ notes: 'Administrative note' }),
      );
    },
  );

  it('uploads avatars and handles missing keys and failures', async () => {
    const params = { applicationId, imageBase64: 'data:image/png;base64,test' };
    mocks.edge.mockResolvedValue({ success: true, avatar_object_key: 'avatars/test.jpg' });
    await expect(uploadRecruitmentApplicantAvatar(params)).resolves.toBe('avatars/test.jpg');
    expect(mocks.edge).toHaveBeenCalledWith('update-recruitment-stage', {
      action: 'upload_avatar',
      application_id: applicationId,
      image_base64: params.imageBase64,
    });
    mocks.edge.mockResolvedValue({ success: true });
    await expect(uploadRecruitmentApplicantAvatar(params)).resolves.toBe('');
    mocks.edge.mockResolvedValue({ success: false, error: 'Invalid image' });
    await expect(uploadRecruitmentApplicantAvatar(params)).rejects.toThrow('Invalid image');
    mocks.edge.mockResolvedValue({ success: false });
    await expect(uploadRecruitmentApplicantAvatar(params)).rejects.toThrow(
      'Failed to upload applicant avatar',
    );
  });

  it('paginates applications and escapes search filters', async () => {
    const query = queryFor([application], null, 25);
    mocks.from.mockReturnValue(query);
    const result = await fetchAdminRecruitmentApplicationsPage({
      offset: 10,
      pageSize: 5,
      status: 'active',
      currentStep: 2,
      role: 'Usher',
      searchTerm: ' Test,%_ ',
    });
    expect(result).toEqual({ rows: [expect.objectContaining({ id: applicationId })], count: 25 });
    expect(query.range).toHaveBeenCalledWith(10, 14);
    expect(query.order.mock.calls).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(query.eq.mock.calls).toEqual([
      ['status', 'active'],
      ['current_step', 2],
    ]);
    expect(query.or).toHaveBeenCalledWith('desired_role.eq.Usher,confirmed_role.eq.Usher');
    expect(query.or).toHaveBeenCalledWith(
      'full_name.ilike.%Test\\,\\%\\_%,email.ilike.%Test\\,\\%\\_%,phone.ilike.%Test\\,\\%\\_%,desired_role.ilike.%Test\\,\\%\\_%',
    );
  });

  it.each([undefined, '', '  '])('omits empty page filters: %j', async (searchTerm) => {
    const query = queryFor(null);
    mocks.from.mockReturnValue(query);
    await expect(
      fetchAdminRecruitmentApplicationsPage({ offset: 0, pageSize: 10, searchTerm }),
    ).resolves.toEqual({ rows: [], count: null });
    expect(query.eq).not.toHaveBeenCalled();
    expect(query.or).not.toHaveBeenCalled();
  });

  it('resolves approval request status for applications on the page', async () => {
    const approvalId = '44444444-4444-4444-8444-444444444444';
    const appWithApproval = { ...application, dgroup_approval_id: approvalId };
    const appsQuery = queryFor([appWithApproval], null, 1);
    const approvalsQuery = queryFor([{ id: approvalId, status: 'approved' }]);

    mocks.from.mockReturnValueOnce(appsQuery).mockReturnValueOnce(approvalsQuery);

    const result = await fetchAdminRecruitmentApplicationsPage({ offset: 0, pageSize: 10 });
    expect(result.rows[0].dgroup_approval_status).toBe('approved');
    expect(mocks.from).toHaveBeenCalledWith('approval_requests');
    expect(approvalsQuery.in).toHaveBeenCalledWith('id', [approvalId]);
  });

  it('rejects page query failures and malformed application rows', async () => {
    mocks.from.mockReturnValue(queryFor(null, { message: 'Offline' }));
    await expect(
      fetchAdminRecruitmentApplicationsPage({ offset: 0, pageSize: 10 }),
    ).rejects.toThrow('Failed to fetch recruitment applications: Offline');
    mocks.from.mockReturnValue(queryFor([{}]));
    await expect(
      fetchAdminRecruitmentApplicationsPage({ offset: 0, pageSize: 10 }),
    ).rejects.toThrow('Recruitment application response is invalid');
  });

  it('exports filtered applications with matching schedules only', async () => {
    const apps = queryFor([application, { ...application, id: transaction.id }]);
    const schedule = { application_id: applicationId, scheduled_interview_on: timestamp };
    mocks.from
      .mockReturnValueOnce(apps)
      .mockReturnValueOnce(queryFor([schedule, { application_id: null }]));
    const result = await fetchAdminRecruitmentApplicationsForExport({
      status: 'active',
      currentStep: 2,
      role: 'Usher',
      searchTerm: ' Test,%_ ',
    });
    expect(apps.eq.mock.calls).toEqual([
      ['status', 'active'],
      ['current_step', 2],
    ]);
    expect(apps.or).toHaveBeenCalledWith('desired_role.eq.Usher,confirmed_role.eq.Usher');
    expect(apps.or).toHaveBeenCalledWith(
      expect.stringContaining('full_name.ilike.%Test\\,\\%\\_%'),
    );
    expect(result[0].latest_schedules).toEqual(schedule);
    expect(result[1].latest_schedules).toBeNull();
    expect(mocks.from).toHaveBeenCalledWith('recruitment_application_latest_schedules_view');
  });

  it.each([undefined, {}, { searchTerm: '  ' }])(
    'exports without optional filters: %j',
    async (params) => {
      const apps = queryFor(null);
      mocks.from.mockReturnValueOnce(apps).mockReturnValueOnce(queryFor(null));
      await expect(fetchAdminRecruitmentApplicationsForExport(params)).resolves.toEqual([]);
      expect(apps.eq).not.toHaveBeenCalled();
      expect(apps.or).not.toHaveBeenCalled();
    },
  );

  it('exports records without schedules and rejects query and validation errors', async () => {
    mocks.from.mockReturnValueOnce(queryFor([application])).mockReturnValueOnce(queryFor(null));
    await expect(fetchAdminRecruitmentApplicationsForExport()).resolves.toEqual([
      expect.objectContaining({ id: applicationId, latest_schedules: null }),
    ]);
    mocks.from
      .mockReturnValueOnce(queryFor(null, { message: 'Offline' }))
      .mockReturnValueOnce(queryFor([]));
    await expect(fetchAdminRecruitmentApplicationsForExport()).rejects.toThrow(
      'Failed to fetch recruitment applications for export: Offline',
    );
    mocks.from.mockReturnValueOnce(queryFor([{}])).mockReturnValueOnce(queryFor([]));
    await expect(fetchAdminRecruitmentApplicationsForExport()).rejects.toThrow(
      'Recruitment application record is invalid',
    );
  });

  function detailQueries({
    app = application,
    transactions = [transaction],
    notes = [],
  }: { app?: unknown; transactions?: unknown; notes?: unknown } = {}) {
    const appQuery = queryFor(app);
    const historyQuery = queryFor(transactions);
    const notesQuery = queryFor(notes);
    mocks.from
      .mockReturnValueOnce(appQuery)
      .mockReturnValueOnce(historyQuery)
      .mockReturnValueOnce(notesQuery);
    return { appQuery, historyQuery, notesQuery };
  }

  it('loads validated application details, history and recruiter notes', async () => {
    const note = {
      id: 'note-1',
      application_id: applicationId,
      step_number: 2,
      attempt_number: 1,
      transaction_id: transaction.id,
      author_id: null,
      author_name: 'Test Reviewer',
      author_role: 'admin',
      avatar_object_key: null,
      content: 'Interview note',
      created_at: timestamp,
    };
    const queries = detailQueries({ notes: [note] });
    const result = await fetchAdminRecruitmentApplicationDetail(applicationId);
    expect(result).toEqual({
      application: expect.objectContaining({ id: applicationId }),
      transactions: [transaction],
      step_notes: [note],
      dgroup_endorsement: null,
      dgroup_endorsement_history: [],
    });
    expect(queries.appQuery.eq).toHaveBeenCalledWith('id', applicationId);
    expect(queries.historyQuery.eq).toHaveBeenCalledWith('application_id', applicationId);
    expect(queries.notesQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('uses empty arrays for absent history and notes', async () => {
    detailQueries({ transactions: null, notes: null });
    await expect(fetchAdminRecruitmentApplicationDetail(applicationId)).resolves.toMatchObject({
      transactions: [],
      step_notes: [],
      dgroup_endorsement: null,
    });
  });

  it.each([
    ['application', 'Failed to fetch recruitment application: Offline'],
    ['history', 'Failed to fetch recruitment history: Offline'],
  ])('rejects %s query errors', async (target, message) => {
    mocks.from
      .mockReturnValueOnce(
        queryFor(application, target === 'application' ? { message: 'Offline' } : null),
      )
      .mockReturnValueOnce(queryFor([], target === 'history' ? { message: 'Offline' } : null))
      .mockReturnValueOnce(queryFor([]));
    await expect(fetchAdminRecruitmentApplicationDetail(applicationId)).rejects.toThrow(message);
  });

  it.each([
    [{ app: {} }, 'Recruitment application response is invalid'],
    [{ transactions: [{}] }, 'Recruitment history response is invalid'],
  ])('rejects malformed detail data %j', async (params, message) => {
    detailQueries(params);
    await expect(fetchAdminRecruitmentApplicationDetail(applicationId)).rejects.toThrow(message);
  });

  it.each([
    [{ attestation_answers: { agrees: true } }, { agrees: true }],
    [{ attestation_answers: '{"agrees":false}' }, { agrees: false }],
    [{ attestation_answers: '{invalid' }, null],
    [{ attestation_answers: 42 }, null],
    [{ attestation_answers: null }, null],
    [{}, null],
    [null, null],
  ])('reads endorsement answers from metadata %j', async (metadata, expected) => {
    detailQueries({ app: { ...application, dgroup_approval_id: transaction.id } });
    const approval = {
      id: transaction.id,
      status: 'approved',
      decision_notes: 'Approved',
      decided_at: timestamp,
      decided_by_email: 'reviewer@example.com',
      assigned_to_email: 'leader@example.com',
      created_at: timestamp,
      metadata,
    };
    const approvalQuery = queryFor(approval);
    mocks.from.mockReturnValueOnce(approvalQuery);
    const result = await fetchAdminRecruitmentApplicationDetail(applicationId);
    expect(result.dgroup_endorsement).toEqual({
      approval_id: transaction.id,
      status: 'approved',
      decision_notes: 'Approved',
      decided_at: timestamp,
      decided_by_email: 'reviewer@example.com',
      assigned_to_email: 'leader@example.com',
      created_at: timestamp,
      attestation_answers: expected,
    });
    expect(approvalQuery.eq).toHaveBeenCalledWith('entity_id', applicationId);
  });

  it('leaves endorsement null when the linked approval does not exist', async () => {
    detailQueries({ app: { ...application, dgroup_approval_id: transaction.id } });
    mocks.from.mockReturnValueOnce(queryFor(null));
    await expect(fetchAdminRecruitmentApplicationDetail(applicationId)).resolves.toMatchObject({
      dgroup_endorsement: null,
      dgroup_endorsement_history: [],
    });
  });

  it('populates multiple endorsement records in reverse chronological history', async () => {
    const latestApprovalId = '44444444-4444-4444-8444-444444444444';
    detailQueries({ app: { ...application, dgroup_approval_id: latestApprovalId } });
    const approvals = [
      {
        id: latestApprovalId,
        status: 'pending',
        decision_notes: null,
        decided_at: null,
        decided_by_email: null,
        assigned_to_email: 'newleader@example.com',
        created_at: '2026-11-03T00:00:00+00:00',
        metadata: {},
      },
      {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'cancelled',
        decision_notes: 'Superseded by new request',
        decided_at: '2026-11-02T12:00:00+00:00',
        decided_by_email: 'admin@example.com',
        assigned_to_email: 'oldleader@example.com',
        created_at: '2026-11-01T00:00:00+00:00',
        metadata: {},
      },
    ];
    mocks.from.mockReturnValueOnce(queryFor(approvals));
    const result = await fetchAdminRecruitmentApplicationDetail(applicationId);
    expect(result.dgroup_endorsement?.approval_id).toBe(latestApprovalId);
    expect(result.dgroup_endorsement?.status).toBe('pending');
    expect(result.dgroup_endorsement_history).toHaveLength(2);
    expect(result.dgroup_endorsement_history?.[1].status).toBe('cancelled');
  });

  it('searches active reviewers and formats optional nicknames', async () => {
    const query = queryFor([reviewer, { ...reviewer, nickname: null }]);
    mocks.from.mockReturnValue(query);
    const result = await fetchReviewerUsers(' Test,%_ ');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(query.limit).toHaveBeenCalledWith(25);
    expect(query.or).toHaveBeenCalledWith(
      'full_name.ilike.%Test\\,\\%\\_%,nickname.ilike.%Test\\,\\%\\_%,email.ilike.%Test\\,\\%\\_%,role.ilike.%Test\\,\\%\\_%',
    );
    expect(result).toEqual([
      { ...reviewer, name: `${reviewer.full_name} (${reviewer.nickname})` },
      { ...reviewer, nickname: null, name: reviewer.full_name },
    ]);
  });

  it.each([undefined, '  '])('loads reviewers without a search filter: %j', async (search) => {
    const query = queryFor(null);
    mocks.from.mockReturnValue(query);
    await expect(fetchReviewerUsers(search)).resolves.toEqual([]);
    expect(query.or).not.toHaveBeenCalled();
  });

  it('propagates reviewer-list errors', async () => {
    mocks.from.mockReturnValue(queryFor(null, { message: 'Offline' }));
    await expect(fetchReviewerUsers()).rejects.toThrow('Failed to fetch reviewer users: Offline');
  });

  it('does not query an empty reviewer id', async () => {
    await expect(fetchReviewerUserById('')).resolves.toBeNull();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it.each([reviewer.nickname, null])('loads a reviewer with nickname %j', async (nickname) => {
    const query = queryFor({ ...reviewer, nickname });
    mocks.from.mockReturnValue(query);
    await expect(fetchReviewerUserById(reviewer.id)).resolves.toEqual({
      ...reviewer,
      nickname,
      name: nickname ? `${reviewer.full_name} (${nickname})` : reviewer.full_name,
    });
    expect(query.eq).toHaveBeenCalledWith('id', reviewer.id);
  });

  it.each([
    { data: null, error: null },
    { data: reviewer, error: { message: 'Access denied' } },
  ])('returns null for unavailable reviewer: %j', async ({ data, error }) => {
    mocks.from.mockReturnValue(queryFor(data, error));
    await expect(fetchReviewerUserById(reviewer.id)).resolves.toBeNull();
  });
});
