import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Controller, type FieldPath, useForm } from 'react-hook-form';
import ReactMarkdown from 'react-markdown';
import { z } from 'zod';

import { Button, Dialog, FormSelectField, StepIndicator, WizardStep } from '@/components/ui';
import { RECRUITMENT_ROLES } from '@/lib/domain/recruitment';
import { PrivacyPolicyPage } from '@/pages/privacy';

import {
  RECRUITMENT_PRIVACY_WAIVER_NOTICE,
  RECRUITMENT_ROLE_OVERVIEW_INTRO,
  RECRUITMENT_ROLE_RESPONSIBILITIES,
} from '../copy';

const preGateSchema = z.object({
  roles_acknowledged: z.boolean().refine(Boolean, 'Please confirm that you understand the roles.'),
  glc1_completed: z.boolean().refine(Boolean, 'GLC Level 1 completion is required.'),
  privacy_acknowledged: z.boolean().refine(Boolean, 'Please agree to the notice to continue.'),
  dgroup_attendance: z.string().refine((value) => value === 'yes', {
    message: 'Applicants must be part of a regularly attended DGroup for more than six months.',
  }),
  age_range: z.string().refine((value) => value === '18-45', {
    message: 'Applications are currently open to applicants ages 18 to 45.',
  }),
});

type PreGateValues = z.infer<typeof preGateSchema>;
type PreGateFormInput = {
  roles_acknowledged: boolean;
  glc1_completed: boolean;
  privacy_acknowledged: boolean;
  dgroup_attendance: string;
  age_range: string;
};

type RecruitmentPreGateSectionProps = {
  onContinue: () => void;
};

const yesNoOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const ageRangeOptions = [
  { value: '18-45', label: '18 to 45 years old' },
  { value: '46-59', label: '46 to 59 years old (currently closed)', disabled: true },
  { value: '60+', label: '60 years old and up (currently closed)', disabled: true },
];

export function RecruitmentPreGateSection({ onContinue }: RecruitmentPreGateSectionProps) {
  const [activeGate, setActiveGate] = useState(1);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const form = useForm<PreGateFormInput, unknown, PreGateValues>({
    resolver: zodResolver(preGateSchema),
    defaultValues: {
      roles_acknowledged: false,
      glc1_completed: false,
      privacy_acknowledged: false,
      dgroup_attendance: '',
      age_range: '',
    },
  });
  const { errors } = form.formState;
  const gateFields: FieldPath<PreGateFormInput>[][] = [
    ['roles_acknowledged', 'glc1_completed'],
    ['privacy_acknowledged'],
    ['dgroup_attendance'],
    ['age_range'],
  ];
  const gateTitles = [
    'Roles',
    'Data Privacy and Liability Waiver',
    'DGroup Eligibility',
    'Demographics',
  ];

  const handleContinue = async () => {
    const isGateValid = await form.trigger(gateFields[activeGate - 1]);
    if (!isGateValid) return;

    if (activeGate === gateFields.length) {
      const areAllGatesValid = await form.trigger();
      if (areAllGatesValid) onContinue();
      return;
    }

    setActiveGate((gate) => gate + 1);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h1 className="font-heading text-xl font-semibold text-text">Before you apply</h1>
        <p className="text-sm text-muted">
          Review the requirements and confirm your eligibility before starting the application.
        </p>
      </header>

      <div className="space-y-6">
        <StepIndicator
          currentStep={activeGate}
          totalSteps={4}
          labels={['Roles', 'Privacy', 'DGroup', 'Demographics']}
          categoryLabel="Eligibility steps"
        />

        <WizardStep title={`Step ${activeGate}: ${gateTitles[activeGate - 1]}`}>
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              void handleContinue();
            }}
          >
            {activeGate === 1 && (
              <section className="space-y-4" aria-labelledby="roles-heading">
                <div>
                  <h2 id="roles-heading" className="font-heading text-lg font-semibold text-text">
                    Roles
                  </h2>
                  <p className="mt-1 text-sm text-muted">{RECRUITMENT_ROLE_OVERVIEW_INTRO}</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {RECRUITMENT_ROLES.filter((role) => role !== 'Backroom Support').map((role) => (
                    <article key={role} className="border-b border-border pb-3 last:border-0">
                      <h2 className="text-lg font-semibold text-primary">{role}</h2>
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mt-2 text-sm leading-relaxed text-muted first:mt-1">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
                              {children}
                            </ul>
                          ),
                          li: ({ children }) => <li className="pl-0.5">{children}</li>,
                          strong: ({ children }) => (
                            <strong className="font-semibold text-text">{children}</strong>
                          ),
                        }}
                      >
                        {RECRUITMENT_ROLE_RESPONSIBILITIES[role]}
                      </ReactMarkdown>
                    </article>
                  ))}
                </div>
                <label className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 text-sm text-text">
                  <input
                    className="mt-0.5 h-4 w-4 min-h-0 shrink-0 self-start rounded border-border text-primary focus:ring-primary"
                    type="checkbox"
                    {...form.register('roles_acknowledged')}
                  />
                  <span>I have read and understood the roles available at the Welcome Center.</span>
                </label>
                {errors.roles_acknowledged?.message && (
                  <p className="text-sm text-danger">{errors.roles_acknowledged.message}</p>
                )}
                <label className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 text-sm text-text">
                  <input
                    className="mt-0.5 h-4 w-4 min-h-0 shrink-0 self-start rounded border-border text-primary focus:ring-primary"
                    type="checkbox"
                    {...form.register('glc1_completed')}
                  />
                  <span>I confirm that I have completed CCF&apos;s GLC Level 1 (Book 1 to 4).</span>
                </label>
                {errors.glc1_completed?.message && (
                  <p className="text-sm text-danger">{errors.glc1_completed.message}</p>
                )}
              </section>
            )}

            {activeGate === 2 && (
              <section className="space-y-4" aria-labelledby="privacy-heading">
                <div>
                  <h2 id="privacy-heading" className="font-heading text-lg font-semibold text-text">
                    Data Privacy and Liability Waiver
                  </h2>
                  <p className="mt-2 border-l-2 border-accent bg-surface px-4 py-3 text-sm leading-relaxed text-text">
                    {RECRUITMENT_PRIVACY_WAIVER_NOTICE}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyPolicyOpen(true)}
                    className="mt-2 inline-flex text-sm font-medium text-primary underline"
                  >
                    Read the privacy policy
                  </button>
                </div>
                <label className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-3 text-sm text-text">
                  <input
                    className="mt-0.5 h-4 w-4 min-h-0 shrink-0 self-start rounded border-border text-primary focus:ring-primary"
                    type="checkbox"
                    {...form.register('privacy_acknowledged')}
                  />
                  <span>I agree.</span>
                </label>
                {errors.privacy_acknowledged?.message && (
                  <p className="text-sm text-danger">{errors.privacy_acknowledged.message}</p>
                )}
              </section>
            )}

            {activeGate === 3 && (
              <section className="space-y-4" aria-label="DGroup eligibility">
                <p className="text-sm text-muted">
                  Applicants must be part of a DGroup and attend consistently for more than six
                  months.
                </p>
                <Controller
                  control={form.control}
                  name="dgroup_attendance"
                  render={({ field }) => (
                    <FormSelectField
                      id="dgroup-attendance"
                      label="Are you part of a DGroup and constantly attending for more than 6 months?"
                      value={field.value}
                      onChange={field.onChange}
                      options={yesNoOptions}
                      error={errors.dgroup_attendance?.message}
                    />
                  )}
                />
              </section>
            )}

            {activeGate === 4 && (
              <section className="space-y-5" aria-label="Demographics">
                <Controller
                  control={form.control}
                  name="age_range"
                  render={({ field }) => (
                    <FormSelectField
                      id="age-range"
                      label="Select demographics"
                      value={field.value}
                      onChange={field.onChange}
                      options={ageRangeOptions}
                      error={errors.age_range?.message}
                    />
                  )}
                />
              </section>
            )}

            {Object.values(errors).some(Boolean) && (
              <p role="alert" className="text-sm text-danger">
                Please review the eligibility checks above before continuing.
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
              <Button
                disabled={activeGate === 1}
                onClick={() => setActiveGate((gate) => Math.max(1, gate - 1))}
                type="button"
                variant="outline"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </Button>
              <Button type="submit">
                {activeGate === 4 ? 'Continue to application' : 'Continue'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </WizardStep>
      </div>
      <Dialog
        isOpen={isPrivacyPolicyOpen}
        onClose={() => setIsPrivacyPolicyOpen(false)}
        size="5xl"
        ariaLabel="Privacy Policy"
      >
        <Dialog.Header showCloseButton>
          <Dialog.Title>Privacy Policy</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body scrollable>
          <PrivacyPolicyPage embedded />
        </Dialog.Body>
      </Dialog>
    </div>
  );
}
