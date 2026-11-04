import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';

import {
  RECRUITMENT_CATEGORIES,
  RECRUITMENT_ROLES,
  RECRUITMENT_SERVICE_SLOTS,
  RECRUITMENT_STEPS,
} from './constants';

export type RecruitmentRole = (typeof RECRUITMENT_ROLES)[number];
export type RecruitmentCategory = (typeof RECRUITMENT_CATEGORIES)[number];
export type RecruitmentServiceSlot = (typeof RECRUITMENT_SERVICE_SLOTS)[number];
export type RecruitmentStepNumber = (typeof RECRUITMENT_STEPS)[number]['stepNumber'];
export type RecruitmentStepKey = (typeof RECRUITMENT_STEPS)[number]['key'];
export type RecruitmentApplicationStatus =
  | 'active'
  | 'archived'
  | 'on_hold'
  | 'deployed'
  | 'declined'
  | 'withdrawn';
export type RecruitmentStageStatus =
  | 'locked'
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'on_hold'
  | 'archived'
  | 'declined';
export type RecruitmentSurveyAnswer = 'true' | 'false';

export type RecruitmentEligibilityRules = {
  min_age: number;
  max_age: number;
  requires_glc1_completed: boolean;
  min_dgroup_months: number;
};

export type SurveyQuestionItem = DynamicFieldLike & {
  correct_answer: RecruitmentSurveyAnswer;
  explanation?: string;
};

export type EndorsementQuestionItem = DynamicFieldLike;

export type RecruitmentSettings = {
  id: 1;
  is_recruitment_open: boolean;
  eligibility_rules: RecruitmentEligibilityRules;
  vmt_registration_url: string;
  orientation_instructions: string;
  survey_questions: SurveyQuestionItem[];
  endorsement_questions: EndorsementQuestionItem[];
  updated_at: string;
};

export type RecruitmentApplicationStatusData = {
  id: string;
  auth_user_id: string | null;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  nickname: string;
  phone: string;
  date_of_birth: string;
  gender: 'Male' | 'Female';
  life_stage: string;
  avatar_object_key: string | null;
  desired_role: RecruitmentRole;
  confirmed_role: RecruitmentRole | null;
  personal_details: {
    wedding_anniversary?: string | null;
    occupation: string;
    company_name?: string | null;
  };
  emergency_contact: {
    name: string;
    phone: string;
    relation: string;
  };
  application_history: {
    is_first_time_applicant: boolean;
    previous_application_notes?: string | null;
  };
  spiritual_background: {
    ccf_member_since: string;
    other_ministries?: string | null;
    glc1_status: 'Completed' | 'Ongoing' | 'None';
    glc2_status: 'Completed' | 'Ongoing' | 'None';
  };
  dgroup_info: {
    is_constant_attendee: boolean;
    member_since: string;
    leader_name: string;
    leader_email: string;
    leader_phone: string;
    is_dgroup_leader: boolean;
    leader_since?: string | null;
    dgroup_member_count?: number | null;
  };
  applicant_attested_at: string;
  survey_answers: Record<string, RecruitmentSurveyAnswer>;
  survey_score: number;
  survey_total: number;
  current_step: RecruitmentStepNumber;
  status: RecruitmentApplicationStatus;
  dgroup_approval_id: string | null;
  vmt_registered: boolean;
  ccf_vmt_id: string | null;
  ccf_vmt_date: string | null;
  vmt_registered_at: string | null;
  vmt_verified_by: string | null;
  service_commitments: ApplicantCommitments;
  assigned_rfid_member_id: string | null;
  promoted_user_id: string | null;
  deployed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RecruitmentApplication = RecruitmentApplicationStatusData;

export type RecruitmentPipelineTransaction = {
  id: string;
  application_id: string;
  step_number: RecruitmentStepNumber;
  step_key: RecruitmentStepKey;
  attempt_number: number;
  transaction_type:
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
  from_step: RecruitmentStepNumber | null;
  to_step: RecruitmentStepNumber | null;
  status: RecruitmentStageStatus;
  assigned_reviewer_id: string | null;
  assigned_reviewer_name: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  rubric_data: Record<string, unknown>;
  notes: string | null;
  applicant_visible_notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
};

export type ApplicantCommitments = Partial<
  Record<
    'first_sunday' | 'second_sunday' | 'third_sunday' | 'fourth_sunday' | 'fifth_sunday',
    RecruitmentServiceSlot[]
  >
>;

export type ApplicantRecruitmentView = Pick<
  RecruitmentApplicationStatusData,
  | 'id'
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'nickname'
  | 'avatar_object_key'
  | 'desired_role'
  | 'assigned_rfid_member_id'
  | 'deployed_at'
  | 'current_step'
  | 'status'
  | 'confirmed_role'
  | 'vmt_registered'
  | 'service_commitments'
> & {
  dgroup_approval_status: string | null;
  dgroup_leader_name: string;
  transactions: ApplicantRecruitmentTimelineItem[];
};

export type ApplicantRecruitmentTimelineItem = Pick<
  RecruitmentPipelineTransaction,
  | 'step_number'
  | 'step_key'
  | 'attempt_number'
  | 'status'
  | 'transaction_type'
  | 'scheduled_at'
  | 'completed_at'
  | 'assigned_reviewer_name'
  | 'applicant_visible_notes'
  | 'created_at'
>;

export type RecruiterNote = {
  id: string;
  application_id: string;
  step_number: RecruitmentStepNumber;
  attempt_number: number;
  transaction_id?: string | null;
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  avatar_object_key?: string | null;
  content: string;
  created_at: string;
};

export type RecruitmentApplicationDetail = {
  application: RecruitmentApplication;
  transactions: RecruitmentPipelineTransaction[];
  step_notes: RecruiterNote[];
  dgroup_endorsement?: {
    approval_id: string;
    status: 'pending' | 'approved' | 'rejected';
    decision_notes?: string | null;
    decided_at?: string | null;
    decided_by_email?: string | null;
    attestation_answers?: Record<string, unknown> | null;
  } | null;
};

export type PublicRecruitmentConfig = {
  is_recruitment_open: boolean;
  eligibility_rules: RecruitmentEligibilityRules;
  vmt_registration_url: string;
  orientation_instructions: string;
  survey_questions: DynamicFieldLike[];
};

export type RecruitmentEndorsementReviewDetails = {
  id: string;
  full_name: string;
  nickname: string;
  desired_role: RecruitmentRole;
  created_at: string;
  endorsement_questions: EndorsementQuestionItem[];
  attestation_answers: Record<string, unknown>;
};

export type ReviewerUserItem = {
  id: string;
  name: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  role: string | null;
  avatar_object_key: string | null;
};
