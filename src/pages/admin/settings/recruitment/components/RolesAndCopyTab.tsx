import { Plus, Trash2 } from 'lucide-react';
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from 'react-hook-form';

import { Button, FormInputField, FormTextareaField, SectionCard } from '@/components/ui';
import { useAppSettingsQuery } from '@/hooks/domain/app-settings';
import { RECRUITMENT_ROLES, type RecruitmentSettingsInput } from '@/lib/domain/recruitment';

interface RolesAndCopyTabProps {
  control: Control<RecruitmentSettingsInput>;
  register: UseFormRegister<RecruitmentSettingsInput>;
  setValue: UseFormSetValue<RecruitmentSettingsInput>;
  errors: FieldErrors<RecruitmentSettingsInput>;
}

export function RolesAndCopyTab({ control, register, setValue, errors }: RolesAndCopyTabProps) {
  const { data: appSettings } = useAppSettingsQuery();
  const categories = useWatch({ control, name: 'categories' }) ?? [];
  const attestation = useWatch({ control, name: 'applicant_attestation' }) ?? [];
  const responsibilities = useWatch({ control, name: 'role_responsibilities' }) ?? {};

  const roleKeys = appSettings?.volunteer_roles
    ? [...appSettings.volunteer_roles]
        .filter((role) => role.is_active && role.key !== 'OIC')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((role) => role.key)
    : [...RECRUITMENT_ROLES];

  const handleAddCategory = () => {
    setValue('categories', [...categories, ''], { shouldDirty: true });
  };

  const handleRemoveCategory = (index: number) => {
    setValue(
      'categories',
      categories.filter((_, idx) => idx !== index),
      { shouldDirty: true },
    );
  };

  const handleCategoryChange = (index: number, value: string) => {
    const next = [...categories];
    next[index] = value;
    setValue('categories', next, { shouldDirty: true });
  };

  const handleAddAttestation = () => {
    setValue('applicant_attestation', [...attestation, ''], { shouldDirty: true });
  };

  const handleRemoveAttestation = (index: number) => {
    setValue(
      'applicant_attestation',
      attestation.filter((_, idx) => idx !== index),
      { shouldDirty: true },
    );
  };

  const handleAttestationChange = (index: number, value: string) => {
    const next = [...attestation];
    next[index] = value;
    setValue('applicant_attestation', next, { shouldDirty: true });
  };

  const handleRoleResponsibilityChange = (roleKey: string, value: string) => {
    setValue(
      'role_responsibilities',
      {
        ...responsibilities,
        [roleKey]: value,
      },
      { shouldDirty: true },
    );
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Role Overview & Responsibilities"
        subtitle="Customize the introduction and per-role descriptions shown to applicants during pre-gate screening. Role availability toggles are managed under System & Service Settings."
      >
        <div className="space-y-4">
          <FormTextareaField
            label="Role Overview Introduction"
            rows={2}
            registration={register('role_overview_intro')}
            error={errors.role_overview_intro?.message}
          />

          <div className="space-y-4 pt-2">
            {roleKeys.map((roleKey) => (
              <FormTextareaField
                key={roleKey}
                label={`${roleKey} Responsibilities (Markdown supported)`}
                rows={4}
                value={responsibilities[roleKey] ?? ''}
                onChange={(event) => handleRoleResponsibilityChange(roleKey, event.target.value)}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Recruitment Categories"
        subtitle="Ministry life-stage / demographic categories available for volunteer recruitment."
        headerAction={
          <Button type="button" variant="outline" size="sm" onClick={handleAddCategory}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Add Category
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <FormInputField
                  label={`Category ${idx + 1}`}
                  value={cat}
                  onChange={(event) => handleCategoryChange(idx, event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveCategory(idx)}
                disabled={categories.length <= 1}
                aria-label={`Remove category ${idx + 1}`}
              >
                <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Privacy Waiver & Applicant Attestation"
        subtitle="Legal privacy notice and spiritual/character commitment statements agreed to by applicants."
      >
        <div className="space-y-5">
          <FormTextareaField
            label="Privacy Waiver Notice"
            rows={4}
            registration={register('privacy_waiver_notice')}
            error={errors.privacy_waiver_notice?.message}
          />

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">
                  Applicant Attestation Statements
                </h3>
                <p className="text-xs text-muted">
                  Numbered commitments displayed on the Applicant Attestation step.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddAttestation}>
                <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Add Statement
              </Button>
            </div>

            <div className="space-y-2.5">
              {attestation.map((statement, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1">
                    <FormInputField
                      label={`Statement ${idx + 1}`}
                      value={statement}
                      onChange={(event) => handleAttestationChange(idx, event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-6"
                    onClick={() => handleRemoveAttestation(idx)}
                    disabled={attestation.length <= 1}
                    aria-label={`Remove statement ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <FormTextareaField
            label="Attestation Confirmation Text"
            rows={2}
            registration={register('applicant_attestation_confirmation')}
            error={errors.applicant_attestation_confirmation?.message}
          />
        </div>
      </SectionCard>
    </div>
  );
}
