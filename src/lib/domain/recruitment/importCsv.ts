import { VALIDATION_PATTERNS } from '@/config/constants';

import type { RecruitmentApplicationStatus, RecruitmentRole, RecruitmentStepKey } from './types';

export interface RecruitmentImportPipelineTx {
  step_number: number;
  step_key: RecruitmentStepKey;
  attempt_number: number;
  transaction_type: 'scheduled' | 'completed' | 'skipped';
  status: 'scheduled' | 'completed' | 'skipped';
  scheduled_at?: string | null;
  completed_at?: string | null;
  notes?: string;
}

export interface RecruitmentImportApplicationPayload {
  email: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  full_name?: string;
  nickname: string;
  phone: string;
  date_of_birth: string;
  gender: 'Male' | 'Female';
  life_stage: string;
  desired_role: RecruitmentRole;
  confirmed_role?: RecruitmentRole | null;
  status: RecruitmentApplicationStatus;
  current_step: number;
  created_at?: string;
  applicant_attested_at?: string;
  personal_details: Record<string, unknown>;
  emergency_contact: Record<string, unknown>;
  application_history: Record<string, unknown>;
  spiritual_background: Record<string, unknown>;
  dgroup_info: Record<string, unknown>;
  is_endorsed: boolean;
  transactions: RecruitmentImportPipelineTx[];
}

export interface RecruitmentImportPreviewRow {
  rowNumber: number;
  fullName: string;
  email: string;
  desiredRole: RecruitmentRole;
  status: RecruitmentApplicationStatus;
  inferredStep: number;
  legacyId: string | number | null;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
  warnings: string[];
  payload: RecruitmentImportApplicationPayload;
}

export interface RecruitmentImportPreviewSummary {
  totalRows: number;
  validRowsCount: number;
  duplicateRowsCount: number;
  errorRowsCount: number;
}

export interface ParseRecruitmentCsvResult {
  success: boolean;
  error?: string;
  rows: RecruitmentImportPreviewRow[];
  summary: RecruitmentImportPreviewSummary;
}

function normalizeHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCsvTextToRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      currentCell = '';

      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted value in CSV.');
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function normalizeDateToYMD(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // If already YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // M/D/YYYY or M/D/YY
  const mdyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(trimmed);
  if (mdyMatch) {
    const month = parseInt(mdyMatch[1], 10);
    const day = parseInt(mdyMatch[2], 10);
    let year = parseInt(mdyMatch[3], 10);
    if (mdyMatch[3].length === 2) {
      year = year <= 50 ? 2000 + year : 1900 + year;
    }
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

export function normalizeIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}

export function convertYearsToMonthYear(
  createdDateStr: string | null | undefined,
  yearsVal: string | number | null | undefined,
): string {
  const clean = String(yearsVal ?? '').trim();
  const monthYearPattern = /^\d{4} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/;
  if (monthYearPattern.test(clean)) {
    return clean;
  }

  let createdYear = new Date().getUTCFullYear();
  if (createdDateStr) {
    const parsed = new Date(createdDateStr);
    if (!Number.isNaN(parsed.getTime())) {
      createdYear = parsed.getUTCFullYear();
    }
  }

  const numYears = parseFloat(clean.replace(/[^0-9.]/g, '')) || 0;
  const targetYear = Math.max(1950, Math.round(createdYear - numYears));
  return `${targetYear} Jan`;
}

export function normalizeRecruitmentRole(value: string | null | undefined): RecruitmentRole {
  const clean = (value ?? '').trim().toLowerCase();
  if (clean.includes('prayer') || clean.includes('coach')) return 'Prayer Coach';
  if (clean.includes('backroom')) return 'Backroom Support';
  if (clean.includes('imt')) return 'IMT Support';
  if (clean.includes('vmt')) return 'VMT Support';
  return 'Usher';
}

export function normalizeRecruitmentStatus(
  value: string | null | undefined,
): RecruitmentApplicationStatus {
  const clean = (value ?? '').trim().toLowerCase();
  if (clean.includes('deploy')) return 'deployed';
  if (clean.includes('decline') || clean.includes('reject')) return 'declined';
  if (clean.includes('hold')) return 'on_hold';
  if (clean.includes('withdrawn')) return 'withdrawn';
  if (clean.includes('archive')) return 'archived';
  return 'active';
}

export function parseRecruitmentCsvText(
  csvText: string,
  existingEmails: Set<string> = new Set(),
): ParseRecruitmentCsvResult {
  const normalized = csvText.trim();
  if (!normalized) {
    return {
      success: false,
      error: 'CSV file is empty.',
      rows: [],
      summary: { totalRows: 0, validRowsCount: 0, duplicateRowsCount: 0, errorRowsCount: 0 },
    };
  }

  let rawRows: string[][];
  try {
    rawRows = parseCsvTextToRows(normalized);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse CSV.',
      rows: [],
      summary: { totalRows: 0, validRowsCount: 0, duplicateRowsCount: 0, errorRowsCount: 0 },
    };
  }

  if (rawRows.length < 2) {
    return {
      success: false,
      error: 'CSV must include a header row and at least one data row.',
      rows: [],
      summary: { totalRows: 0, validRowsCount: 0, duplicateRowsCount: 0, errorRowsCount: 0 },
    };
  }

  const headers = rawRows[0].map(normalizeHeaderKey);
  const rows: RecruitmentImportPreviewRow[] = [];
  const seenEmailsInCsv = new Set<string>();

  let duplicateCount = 0;
  let errorCount = 0;
  let validCount = 0;

  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex += 1) {
    const cells = rawRows[rowIndex];
    if (cells.length === 0 || cells.every((c) => !c.trim())) {
      continue;
    }

    const rowMap: Record<string, string> = {};
    headers.forEach((h, i) => {
      rowMap[h] = cells[i] ?? '';
    });

    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        if (rowMap[k] !== undefined && rowMap[k].trim() !== '') {
          return rowMap[k].trim();
        }
      }
      return '';
    };

    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    const legacyId = getVal('id', 'legacy_id', 'applicant_id');
    const email = getVal('email', 'email_address').toLowerCase();
    const firstName = getVal('first_name', 'firstname');
    const middleName = getVal('middle_name', 'middlename') || null;
    const lastName = getVal('last_name', 'lastname', 'surname');
    const nickname = getVal('nickname') || firstName;
    const phone = getVal('mobile_number', 'phone', 'mobile', 'contact_number');
    const dobRaw = getVal('dob', 'date_of_birth', 'birthdate');
    const genderRaw = getVal('gender');
    const lifeStage = getVal('life_stage') || 'Single';
    const roleRaw = getVal('role', 'desired_role');
    const statusRaw = getVal('status');

    if (!email) {
      rowErrors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      rowErrors.push('Invalid email format');
    }

    if (!firstName) rowErrors.push('First name is required');
    if (!lastName) rowErrors.push('Last name is required');
    if (!phone) {
      rowErrors.push('Mobile number is required');
    } else if (!VALIDATION_PATTERNS.phone.test(phone)) {
      rowWarnings.push('Mobile number does not match standard 11-digit Philippine pattern');
    }

    const dob = normalizeDateToYMD(dobRaw);
    if (!dob) {
      rowErrors.push('Valid date of birth (YYYY-MM-DD or MM/DD/YYYY) is required');
    }

    const gender: 'Male' | 'Female' = genderRaw.toLowerCase().startsWith('m') ? 'Male' : 'Female';

    const desiredRole = normalizeRecruitmentRole(roleRaw);
    const status = normalizeRecruitmentStatus(statusRaw);

    const isDuplicate = existingEmails.has(email) || seenEmailsInCsv.has(email);
    if (email) seenEmailsInCsv.add(email);

    const createdRaw = getVal('created', 'created_at', 'submission_date');
    const createdAt = normalizeIsoTimestamp(createdRaw) ?? new Date().toISOString();

    const startedOnRaw = getVal('started_on', 'start_date');
    const startedOn = normalizeDateToYMD(startedOnRaw);

    // Endorsement
    const endorsementInfo = getVal('endorsement_info', 'endorsement_status', 'endorsement');
    const isEndorsed =
      endorsementInfo.toLowerCase().includes('endors') ||
      endorsementInfo.toLowerCase().includes('approv');

    // Milestones / Scheduled dates
    const scheduledInterview = normalizeIsoTimestamp(
      getVal('scheduled_interview_on', 'scheduled_interview', 'interview_on'),
    );
    const scheduledOrientation = normalizeIsoTimestamp(
      getVal('scheduled_orientation_on', 'scheduled_orientation', 'orientation_on'),
    );
    const scheduledObservation = normalizeIsoTimestamp(
      getVal('scheduled_observation_on', 'scheduled_observation', 'observation_on'),
    );
    const scheduledEvaluation = normalizeIsoTimestamp(
      getVal('scheduled_evaluation_on', 'scheduled_evaluation', 'evaluation_on'),
    );
    const scheduledOnboarding = normalizeIsoTimestamp(
      getVal(
        'scheduled_operations_onboarding_on',
        'scheduled_onboarding_on',
        'operations_onboarding_on',
      ),
    );

    // Step inference
    let inferredStep = 1;
    const transactions: RecruitmentImportPipelineTx[] = [
      {
        step_number: 1,
        step_key: 'register',
        attempt_number: 1,
        transaction_type: 'completed',
        status: 'completed',
        completed_at: createdAt,
      },
    ];

    if (status === 'deployed') {
      inferredStep = 9;
      const stepKeys: RecruitmentStepKey[] = [
        'interview',
        'orientation',
        'observation',
        'evaluation',
        'onboarding',
        'vmt_registration',
        'rfid_releasing',
        'deployment',
      ];
      stepKeys.forEach((key, idx) => {
        const stepNum = idx + 2;
        if (stepNum === 6 && desiredRole !== 'Prayer Coach') {
          transactions.push({
            step_number: stepNum,
            step_key: key,
            attempt_number: 1,
            transaction_type: 'skipped',
            status: 'skipped',
          });
        } else {
          transactions.push({
            step_number: stepNum,
            step_key: key,
            attempt_number: 1,
            transaction_type: 'completed',
            status: 'completed',
            completed_at: startedOn ? `${startedOn}T00:00:00Z` : createdAt,
          });
        }
      });
    } else {
      if (scheduledInterview) {
        transactions.push({
          step_number: 2,
          step_key: 'interview',
          attempt_number: 1,
          transaction_type: scheduledOrientation ? 'completed' : 'scheduled',
          status: scheduledOrientation ? 'completed' : 'scheduled',
          scheduled_at: scheduledInterview,
          completed_at: scheduledOrientation ? scheduledInterview : null,
        });
        inferredStep = 2;
      }

      if (scheduledOrientation) {
        transactions.push({
          step_number: 3,
          step_key: 'orientation',
          attempt_number: 1,
          transaction_type: scheduledObservation ? 'completed' : 'scheduled',
          status: scheduledObservation ? 'completed' : 'scheduled',
          scheduled_at: scheduledOrientation,
          completed_at: scheduledObservation ? scheduledOrientation : null,
        });
        inferredStep = 3;
      }

      if (scheduledObservation) {
        transactions.push({
          step_number: 4,
          step_key: 'observation',
          attempt_number: 1,
          transaction_type: scheduledEvaluation ? 'completed' : 'scheduled',
          status: scheduledEvaluation ? 'completed' : 'scheduled',
          scheduled_at: scheduledObservation,
          completed_at: scheduledEvaluation ? scheduledObservation : null,
        });
        inferredStep = 4;
      }

      if (scheduledEvaluation) {
        transactions.push({
          step_number: 5,
          step_key: 'evaluation',
          attempt_number: 1,
          transaction_type: scheduledOnboarding ? 'completed' : 'scheduled',
          status: scheduledOnboarding ? 'completed' : 'scheduled',
          scheduled_at: scheduledEvaluation,
          completed_at: scheduledOnboarding ? scheduledEvaluation : null,
        });
        inferredStep = 5;
      }

      if (scheduledOnboarding && desiredRole === 'Prayer Coach') {
        transactions.push({
          step_number: 6,
          step_key: 'onboarding',
          attempt_number: 1,
          transaction_type: 'scheduled',
          status: 'scheduled',
          scheduled_at: scheduledOnboarding,
        });
        inferredStep = 6;
      }
    }

    // Convert in-years
    const ccfYearsRaw = getVal('ccf_member_in_years', 'ccf_member_years', 'ccf_member_since');
    const dgroupMemberYearsRaw = getVal(
      'how_long_as_a_dgroup_member_in_years',
      'dgroup_member_in_years',
      'dgroup_member_years',
      'dgroup_member_since',
    );
    const dgroupLeaderYearsRaw = getVal(
      'how_long_as_a_dgroup_leader_in_years',
      'dgroup_leader_in_years',
      'dgroup_leader_years',
      'leader_since',
    );

    const isDgroupLeader =
      getVal('is_a_dgroup_leader', 'is_dgroup_leader', 'is_leader').toLowerCase().startsWith('y') ||
      getVal('is_a_dgroup_leader', 'is_dgroup_leader', 'is_leader') === 'true';

    const memberCountRaw = getVal(
      'how_many_members_do_you_have',
      'dgroup_member_count',
      'member_count',
    );

    const glc1Raw = getVal(
      'gcl_1_course_status',
      'glc_1_course_status',
      'glc1_status',
    ).toLowerCase();
    let glc1Status: 'Completed' | 'Ongoing' | 'None' = 'None';
    if (glc1Raw.includes('complet')) {
      glc1Status = 'Completed';
    } else if (glc1Raw.includes('ong')) {
      glc1Status = 'Ongoing';
    }

    const glc2Raw = getVal('glc_2_course_status', 'glc2_status').toLowerCase();
    let glc2Status: 'Completed' | 'Ongoing' | 'None' | null = null;
    if (glc2Raw.includes('complet')) {
      glc2Status = 'Completed';
    } else if (glc2Raw.includes('ong')) {
      glc2Status = 'Ongoing';
    }

    const payload: RecruitmentImportApplicationPayload = {
      email,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      full_name: `${firstName} ${middleName ? `${middleName} ` : ''}${lastName}`,
      nickname,
      phone,
      date_of_birth: dob ?? '2000-01-01',
      gender,
      life_stage: lifeStage,
      desired_role: desiredRole,
      confirmed_role: status === 'deployed' ? desiredRole : null,
      status,
      current_step: inferredStep,
      created_at: createdAt,
      applicant_attested_at: createdAt,
      personal_details: {
        legacy_id: legacyId || null,
        occupation: getVal('occupation') || 'Unspecified',
        company_name: getVal('company_name', 'company') || null,
        wedding_anniversary: normalizeDateToYMD(getVal('wedding_anniversary', 'anniversary')),
        started_on: startedOn,
        imported_at: new Date().toISOString(),
      },
      emergency_contact: {
        name: getVal('emergency_contact_name', 'emergency_name') || 'Emergency Contact',
        phone: getVal('emergency_contact_number', 'emergency_phone') || phone,
        relation: getVal('relation_to_the_applicant', 'emergency_relation', 'relation') || 'Family',
      },
      application_history: {
        is_first_time_applicant:
          getVal(
            'is_this_your_first_time_to_apply_in_the_welcome_center',
            'is_first_time_applicant',
          )
            .toLowerCase()
            .startsWith('y') ||
          getVal(
            'is_this_your_first_time_to_apply_in_the_welcome_center',
            'is_first_time_applicant',
          ) === 'true',
        previous_application_notes:
          getVal('what_happened_to_previous_application', 'previous_application_notes') || null,
      },
      spiritual_background: {
        ccf_member_since: convertYearsToMonthYear(createdAt, ccfYearsRaw),
        other_ministries: getVal('other_ministries') || null,
        glc1_status: glc1Status,
        glc2_status: glc2Status,
      },
      dgroup_info: {
        is_constant_attendee:
          getVal('constant_dgroup_attendee', 'is_constant_attendee')
            .toLowerCase()
            .startsWith('y') ||
          getVal('constant_dgroup_attendee', 'is_constant_attendee') === 'true',
        member_since: convertYearsToMonthYear(createdAt, dgroupMemberYearsRaw),
        leader_name:
          getVal('name_of_dgroup_leader', 'dgroup_leader_name', 'leader_name') || 'DGroup Leader',
        leader_email:
          getVal('email_of_dgroup_leader', 'dgroup_leader_email', 'leader_email').toLowerCase() ||
          'leader@example.com',
        leader_phone:
          getVal('mobile_of_dgroup_leader', 'dgroup_leader_phone', 'leader_phone') || phone,
        is_dgroup_leader: isDgroupLeader,
        leader_since: isDgroupLeader
          ? convertYearsToMonthYear(createdAt, dgroupLeaderYearsRaw)
          : null,
        dgroup_member_count: isDgroupLeader ? parseInt(memberCountRaw, 10) || null : null,
      },
      is_endorsed: isEndorsed,
      transactions,
    };

    const isValid = rowErrors.length === 0 && !isDuplicate;

    if (isDuplicate) {
      duplicateCount += 1;
    } else if (rowErrors.length > 0) {
      errorCount += 1;
    } else {
      validCount += 1;
    }

    rows.push({
      rowNumber: rowIndex,
      fullName: payload.full_name ?? `${firstName} ${lastName}`,
      email,
      desiredRole,
      status,
      inferredStep,
      legacyId: legacyId || null,
      isValid,
      isDuplicate,
      errors: rowErrors,
      warnings: rowWarnings,
      payload,
    });
  }

  return {
    success: true,
    rows,
    summary: {
      totalRows: rows.length,
      validRowsCount: validCount,
      duplicateRowsCount: duplicateCount,
      errorRowsCount: errorCount,
    },
  };
}
