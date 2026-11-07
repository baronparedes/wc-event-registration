import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

type ApplicantVerificationSectionProps = {
  application: RecruitmentStep1Input;
  surveyAnswers: Array<{ fieldKey: string; question: string; answer: string }>;
};

type VerificationRow = {
  label: string;
  value: string;
};

function displayOptionalValue(value: string | null | undefined): string {
  return value?.trim() || 'Not provided';
}

export function ApplicantVerificationSection({
  application,
  surveyAnswers,
}: ApplicantVerificationSectionProps) {
  const {
    personal_details,
    emergency_contact,
    application_history,
    spiritual_background,
    dgroup_info,
  } = application;
  const sections: Array<{ id: string; title: string; rows: VerificationRow[] }> = [
    {
      id: 'personal-work',
      title: 'Personal and Work Information',
      rows: [
        { label: 'First Name', value: application.first_name },
        { label: 'Middle Name', value: displayOptionalValue(application.middle_name) },
        { label: 'Last Name', value: application.last_name },
        { label: 'Nickname', value: application.nickname },
        { label: 'Email', value: application.email },
        { label: 'Mobile Number', value: application.phone },
        { label: 'Date of Birth', value: application.date_of_birth },
        { label: 'Gender', value: application.gender },
        { label: 'Life Stage', value: application.life_stage },
        { label: 'Desired Role', value: application.desired_role },
        { label: 'Occupation', value: personal_details.occupation },
        { label: 'Company Name', value: displayOptionalValue(personal_details.company_name) },
        {
          label: 'Wedding Anniversary',
          value: displayOptionalValue(personal_details.wedding_anniversary),
        },
        {
          label: 'First time applying',
          value: application_history.is_first_time_applicant ? 'Yes' : 'No',
        },
        {
          label: 'Previous application details',
          value: application_history.is_first_time_applicant
            ? 'Not applicable'
            : displayOptionalValue(application_history.previous_application_notes),
        },
      ],
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contact',
      rows: [
        { label: 'Name', value: emergency_contact.name },
        { label: 'Mobile Number', value: emergency_contact.phone },
        { label: 'Relationship', value: emergency_contact.relation },
      ],
    },
    {
      id: 'spiritual-background',
      title: 'Spiritual Background',
      rows: [
        { label: 'CCF Member Since', value: spiritual_background.ccf_member_since },
        {
          label: 'Other Ministries',
          value: displayOptionalValue(spiritual_background.other_ministries),
        },
        { label: 'GLC 1 Course Status', value: spiritual_background.glc1_status },
        {
          label: 'GLC 2 Course Status',
          value: displayOptionalValue(spiritual_background.glc2_status),
        },
      ],
    },
    {
      id: 'dgroup',
      title: 'DGroup Membership and Leadership',
      rows: [
        {
          label: 'Constant DGroup Attendee',
          value: dgroup_info.is_constant_attendee ? 'Yes' : 'No',
        },
        { label: 'DGroup Member Since', value: dgroup_info.member_since },
        { label: 'DGroup Leader Name', value: dgroup_info.leader_name },
        { label: 'DGroup Leader Email', value: dgroup_info.leader_email },
        { label: 'DGroup Leader Mobile Number', value: dgroup_info.leader_phone },
        {
          label: 'DGroup Leader Since',
          value: displayOptionalValue(dgroup_info.leader_since),
        },
        {
          label: 'Number of DGroup Members',
          value:
            dgroup_info.dgroup_member_count == null
              ? 'Not provided'
              : String(dgroup_info.dgroup_member_count),
        },
      ],
    },
    {
      id: 'survey',
      title: 'Biblical Survey',
      rows: surveyAnswers.map(({ fieldKey, question, answer }) => ({
        label: question || fieldKey,
        value: answer,
      })),
    },
  ];

  return (
    <section className="space-y-6" aria-labelledby="applicant-verification-heading">
      <header>
        <h2 id="applicant-verification-heading" className="text-xl font-semibold text-text">
          Verification
        </h2>
        <p className="mt-1 text-sm text-muted">
          Review your application details before submitting.
        </p>
      </header>

      {application.avatar_image_base64 && (
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
          <img
            src={application.avatar_image_base64}
            alt="Applicant photo preview"
            className="h-20 w-20 rounded-full border border-border object-cover shadow-inner"
          />
          <div>
            <h3 className="font-heading text-sm font-semibold text-text">Applicant Photo</h3>
            <p className="text-xs text-muted">Attached to your recruitment application</p>
          </div>
        </div>
      )}

      {sections.map((section) => (
        <section
          key={section.id}
          className="space-y-3 border-b border-border pb-5 last:border-0"
          aria-labelledby={`${section.id}-verification-heading`}
        >
          <h3
            id={`${section.id}-verification-heading`}
            className="font-heading text-base font-semibold text-text"
          >
            {section.title}
          </h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {section.rows.map((row, index) => (
              <div key={`${section.id}-${index}`} className="min-w-0">
                <dt className="text-xs font-medium text-muted">{row.label}</dt>
                <dd className="mt-1 break-words text-sm text-text">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </section>
  );
}
