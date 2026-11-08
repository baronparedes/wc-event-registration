import { useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type DefaultValues, type FieldPath, useForm } from 'react-hook-form';

import { Button, FormErrorSummary, StepIndicator, WizardStep } from '@/components/ui';
import { useFormErrorFocus, useWizardStepScroll } from '@/hooks/utils';
import {
  type DynamicFieldLike,
  type DynamicFieldResponseValues,
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
} from '@/lib/domain/dynamic-fields';
import { isFieldVisible } from '@/lib/domain/field-visibility';
import { type PublicRecruitmentConfig, type RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { createApplicantFormSchema } from '../schema';
import { ApplicantAttestationSection } from './ApplicantAttestationSection';
import { ApplicantVerificationSection } from './ApplicantVerificationSection';
import { ApplicationHistorySection } from './ApplicationHistorySection';
import { BiblicalSurveySection } from './BiblicalSurveySection';
import { EmergencyContactSection } from './EmergencyContactSection';
import { PersonalAndWorkSection } from './PersonalAndWorkSection';
import { SpiritualAndDGroupSection } from './SpiritualAndDGroupSection';
import {
  type ApplicantAttestationForm,
  applicantAttestationSchema,
} from './applicantAttestationSchema';

type ApplicantApplicationWizardProps = {
  config: PublicRecruitmentConfig;
  isSubmitting: boolean;
  onBackToGates: () => void;
  onSubmit: (application: RecruitmentStep1Input) => void;
};

const applicationSections = [
  [
    'avatar_image_base64',
    'first_name',
    'middle_name',
    'last_name',
    'nickname',
    'email',
    'phone',
    'date_of_birth',
    'gender',
    'life_stage',
    'personal_details.wedding_anniversary',
    'personal_details.occupation',
    'personal_details.company_name',
    'desired_role',
    'emergency_contact.name',
    'emergency_contact.phone',
    'emergency_contact.relation',
    'application_history.is_first_time_applicant',
    'application_history.previous_application_notes',
  ],
  [
    'spiritual_background.ccf_member_since',
    'spiritual_background.other_ministries',
    'spiritual_background.glc1_status',
    'spiritual_background.glc2_status',
    'dgroup_info.is_constant_attendee',
    'dgroup_info.member_since',
    'dgroup_info.leader_name',
    'dgroup_info.leader_email',
    'dgroup_info.leader_phone',
    'dgroup_info.is_dgroup_leader',
    'dgroup_info.leader_since',
    'dgroup_info.dgroup_member_count',
  ],
].map((paths) => paths as FieldPath<RecruitmentStep1Input>[]);

function getDefaultValues(): DefaultValues<RecruitmentStep1Input> {
  return {
    avatar_image_base64: null,
    desired_role: '' as unknown as RecruitmentStep1Input['desired_role'],
    gender: '' as unknown as RecruitmentStep1Input['gender'],
    life_stage: '',
    email: '',
    first_name: '',
    middle_name: null,
    last_name: '',
    nickname: '',
    phone: '',
    date_of_birth: '',
    personal_details: { occupation: '', wedding_anniversary: null, company_name: '' },
    emergency_contact: { name: '', phone: '', relation: '' },
    application_history: { is_first_time_applicant: true, previous_application_notes: '' },
    spiritual_background: {
      ccf_member_since: '',
      other_ministries: '',
    },
    dgroup_info: {
      member_since: '',
      leader_name: '',
      leader_email: '',
      leader_phone: '',
      is_dgroup_leader: false,
      leader_since: null,
      dgroup_member_count: null,
    },
    survey_answers: {},
    applicant_attested: true,
  };
}

function getVisibleSurveyFields(fields: DynamicFieldLike[], values: DynamicFieldResponseValues) {
  return fields.filter((field) => isFieldVisible(field, fields, values));
}

type SurveyValidationResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; errorKeys: string[] };

function validateVisibleSurvey(
  fields: DynamicFieldLike[],
  form: ReturnType<typeof useForm<DynamicFieldResponseValues>>,
): SurveyValidationResult {
  const values = form.getValues();
  const visibleFields = getVisibleSurveyFields(fields, values);
  const visibleValues = Object.fromEntries(
    visibleFields
      .filter((field) => field.field_key in values)
      .map((field) => [field.field_key, values[field.field_key]]),
  );
  const result = buildDynamicFieldResponseSchema(visibleFields, {
    requiredMessage: 'Required',
  }).safeParse(visibleValues);

  form.clearErrors();
  if (!result.success) {
    const errorKeys: string[] = [];
    const fieldsWithErrors = new Set<string>();
    for (const issue of result.error.issues) {
      const fieldKey = issue.path[0];
      if (typeof fieldKey === 'string' && !fieldsWithErrors.has(fieldKey)) {
        form.setError(fieldKey, { type: 'validate', message: 'Required' });
        fieldsWithErrors.add(fieldKey);
        errorKeys.push(fieldKey);
      }
    }
    return { success: false, errorKeys };
  }

  return { success: true, data: result.data };
}

function getSectionInvalidKeys(
  sectionFields: FieldPath<RecruitmentStep1Input>[],
  errors: Record<string, unknown>,
): string[] {
  const invalidKeys: string[] = [];
  for (const fieldPath of sectionFields) {
    const parts = fieldPath.split('.');
    let current: unknown = errors;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (current && typeof current === 'object' && 'message' in current) {
      invalidKeys.push(fieldPath);
    }
  }
  return invalidKeys;
}

export function ApplicantApplicationWizard({
  config,
  isSubmitting,
  onBackToGates,
  onSubmit,
}: ApplicantApplicationWizardProps) {
  const [activeSection, setActiveSection] = useState(1);
  const activeSectionRef = useRef<HTMLDivElement | null>(null);
  const { focusFirstError } = useFormErrorFocus();
  const [errorSummary, setErrorSummary] = useState<{
    section: number;
    count: number;
    title?: string;
    firstFieldKeys: string[];
  } | null>(null);

  useWizardStepScroll(activeSection, [
    activeSectionRef,
    activeSectionRef,
    activeSectionRef,
    activeSectionRef,
    activeSectionRef,
  ]);
  const activeSurveyFields = useMemo(
    () =>
      config.survey_questions
        .filter((question) => question.is_active !== false)
        .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0)),
    [config.survey_questions],
  );
  const conditionalSurveyFields = useMemo(
    () =>
      activeSurveyFields.map((field) =>
        field.validation_rules?.visibility_rule ? { ...field, is_required: false } : field,
      ),
    [activeSurveyFields],
  );
  const surveyResolverSchema = useMemo(
    () =>
      buildDynamicFieldResponseSchema(conditionalSurveyFields, {
        requiredMessage: 'Required',
      }),
    [conditionalSurveyFields],
  );
  const applicationSchema = useMemo(
    () => createApplicantFormSchema(config.eligibility_rules),
    [config.eligibility_rules],
  );
  const applicationForm = useForm<RecruitmentStep1Input>({
    resolver: zodResolver(applicationSchema),
    defaultValues: getDefaultValues(),
  });
  const attestationForm = useForm<ApplicantAttestationForm>({
    resolver: zodResolver(applicantAttestationSchema),
    defaultValues: { accepted: false },
  });
  const surveyForm = useForm<DynamicFieldResponseValues>({
    resolver: zodResolver(surveyResolverSchema),
    defaultValues: createDynamicFieldDefaultValues(activeSurveyFields),
  });
  const surveyReviewAnswers = getVisibleSurveyFields(
    activeSurveyFields,
    surveyForm.getValues(),
  ).map((field) => {
    const answer = surveyForm.getValues()[field.field_key];
    return {
      fieldKey: field.field_key,
      question: field.label,
      answer: answer === 'true' ? 'True' : answer === 'false' ? 'False' : 'Not answered',
    };
  });

  const continueFromSection = async () => {
    if (activeSection <= 2) {
      const sectionFields = applicationSections[activeSection - 1];
      const valid = await applicationForm.trigger(sectionFields);
      if (valid) {
        setErrorSummary(null);
        setActiveSection((section) => section + 1);
        return;
      }

      const invalidKeys = getSectionInvalidKeys(
        sectionFields,
        applicationForm.formState.errors as Record<string, unknown>,
      );
      const errorCount = invalidKeys.length || 1;
      setErrorSummary({
        section: activeSection,
        count: errorCount,
        firstFieldKeys: invalidKeys,
      });
      focusFirstError(invalidKeys);
      return;
    }

    if (activeSection === 3) {
      const surveyResult = validateVisibleSurvey(activeSurveyFields, surveyForm);
      if (surveyResult.success) {
        setErrorSummary(null);
        setActiveSection(4);
        return;
      }

      const { errorKeys } = surveyResult;
      const errorCount = errorKeys.length;
      setErrorSummary({
        section: 3,
        count: errorCount,
        title:
          errorCount === 1
            ? '1 unanswered question needs attention before continuing.'
            : `${errorCount} unanswered questions need attention before continuing.`,
        firstFieldKeys: errorKeys,
      });
      focusFirstError(errorKeys);
      return;
    }
  };

  const submitApplication = async () => {
    for (let section = 1; section <= 2; section += 1) {
      const sectionFields = applicationSections[section - 1];
      const valid = await applicationForm.trigger(sectionFields);
      if (!valid) {
        const invalidKeys = getSectionInvalidKeys(
          sectionFields,
          applicationForm.formState.errors as Record<string, unknown>,
        );
        const errorCount = invalidKeys.length || 1;
        setErrorSummary({
          section,
          count: errorCount,
          firstFieldKeys: invalidKeys,
        });
        setActiveSection(section);
        focusFirstError(invalidKeys);
        return;
      }
    }

    const surveyResult = validateVisibleSurvey(activeSurveyFields, surveyForm);
    if (!surveyResult.success) {
      const { errorKeys } = surveyResult;
      const errorCount = errorKeys.length;
      setErrorSummary({
        section: 3,
        count: errorCount,
        title:
          errorCount === 1
            ? '1 unanswered question needs attention before continuing.'
            : `${errorCount} unanswered questions need attention before continuing.`,
        firstFieldKeys: errorKeys,
      });
      setActiveSection(3);
      focusFirstError(errorKeys);
      return;
    }

    const surveyAnswers = surveyResult.data;

    const mappedSurveyAnswers: Record<string, 'true' | 'false'> = {};
    for (const field of getVisibleSurveyFields(activeSurveyFields, surveyAnswers)) {
      const answer = surveyAnswers[field.field_key];
      if (answer === 'true' || answer === 'false') {
        mappedSurveyAnswers[field.field_key] = answer;
      }
    }

    if (
      Object.keys(mappedSurveyAnswers).length !==
      getVisibleSurveyFields(activeSurveyFields, surveyAnswers).length
    ) {
      surveyForm.setError('root', {
        type: 'validate',
        message: 'Each survey response must be True or False.',
      });
      setErrorSummary({
        section: 3,
        count: 1,
        title: 'Each survey response must be True or False.',
        firstFieldKeys: [],
      });
      setActiveSection(3);
      focusFirstError();
      return;
    }

    const applicationValues = applicationForm.getValues();
    const parsedApplication = applicationSchema.safeParse({
      ...applicationValues,
      dgroup_info: {
        ...applicationValues.dgroup_info,
        is_dgroup_leader: Boolean(applicationValues.dgroup_info.leader_since),
      },
      survey_answers: mappedSurveyAnswers,
      applicant_attested: true,
    });
    if (!parsedApplication.success) {
      const firstInvalidSection = applicationSections.findIndex((paths) =>
        parsedApplication.error.issues.some((issue) =>
          paths.includes(issue.path.join('.') as FieldPath<RecruitmentStep1Input>),
        ),
      );
      const targetSection = firstInvalidSection >= 0 ? firstInvalidSection + 1 : 1;
      const invalidSectionPaths = applicationSections[targetSection - 1];
      const invalidKeys = invalidSectionPaths.filter((path) =>
        parsedApplication.error.issues.some((issue) => issue.path.join('.') === path),
      );
      setErrorSummary({
        section: targetSection,
        count: invalidKeys.length || 1,
        firstFieldKeys: invalidKeys,
      });
      setActiveSection(targetSection);
      focusFirstError(invalidKeys);
      return;
    }

    onSubmit(parsedApplication.data);
  };

  const sectionContent = [
    <div key="personal-emergency" className="space-y-6">
      <PersonalAndWorkSection form={applicationForm} />
      <hr className="border-border" aria-hidden="true" />
      <EmergencyContactSection form={applicationForm} />
      <hr className="border-border" aria-hidden="true" />
      <ApplicationHistorySection form={applicationForm} />
    </div>,
    <SpiritualAndDGroupSection key="spiritual-dgroup" form={applicationForm} />,
    <BiblicalSurveySection key="biblical-survey" fields={activeSurveyFields} form={surveyForm} />,
    <ApplicantAttestationSection
      key="attestation"
      isSubmitting={isSubmitting}
      form={attestationForm}
      onContinue={() => setActiveSection(5)}
      onBack={() => setActiveSection(3)}
    />,
    <ApplicantVerificationSection
      key="verification"
      application={applicationForm.getValues()}
      surveyAnswers={surveyReviewAnswers}
    />,
  ];

  return (
    <div className="space-y-6">
      <StepIndicator
        currentStep={activeSection}
        totalSteps={5}
        labels={['Personal', 'Background', 'Survey', 'Attestation', 'Verification']}
        categoryLabel="Application steps"
      />
      <WizardStep
        title={`Application: Section ${activeSection} of 5`}
        subtitle="Complete each section to submit your Welcome Center application."
      >
        <div className="space-y-6">
          <div ref={activeSectionRef} className="scroll-mt-24">
            {sectionContent[activeSection - 1]}
          </div>
          {errorSummary && errorSummary.section === activeSection && (
            <FormErrorSummary
              errorCount={errorSummary.count}
              title={errorSummary.title}
              onJumpToFirstError={() => focusFirstError(errorSummary.firstFieldKeys)}
              actionLabel={
                activeSection === 3 ? 'Jump to first unanswered question' : 'Jump to first error'
              }
            />
          )}
          {activeSection < 4 && (
            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  setErrorSummary(null);
                  if (activeSection === 1) {
                    onBackToGates();
                  } else {
                    setActiveSection((section) => section - 1);
                  }
                }}
                type="button"
                variant="outline"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => void continueFromSection()}
                type="button"
              >
                Continue <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          )}
          {activeSection === 5 && (
            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  setErrorSummary(null);
                  setActiveSection(4);
                }}
                type="button"
                variant="outline"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </Button>
              <Button
                disabled={isSubmitting}
                onClick={() => void submitApplication()}
                type="button"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </WizardStep>
    </div>
  );
}
