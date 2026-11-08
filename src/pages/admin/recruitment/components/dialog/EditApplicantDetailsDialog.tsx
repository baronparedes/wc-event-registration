import { useId } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button, Dialog, FormInputField, FormSelectField, Spinner } from '@/components/ui';
import { useUpdateRecruitmentStageMutation } from '@/hooks/domain/recruitment';
import {
  type EditApplicantProfileInput,
  type RecruitmentApplication,
  editApplicantProfileSchema,
} from '@/lib/domain/recruitment';

interface EditApplicantDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  application: RecruitmentApplication;
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

const LIFE_STAGE_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
];

export function EditApplicantDetailsDialog({
  isOpen,
  onClose,
  application,
}: EditApplicantDetailsDialogProps) {
  const formId = useId();
  const updateStageMutation = useUpdateRecruitmentStageMutation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EditApplicantProfileInput>({
    resolver: zodResolver(editApplicantProfileSchema),
    defaultValues: {
      first_name: application.first_name,
      middle_name: application.middle_name || '',
      last_name: application.last_name,
      nickname: application.nickname,
      email: application.email,
      phone: application.phone,
      date_of_birth: application.date_of_birth,
      gender: application.gender,
      life_stage: application.life_stage,
      occupation: application.personal_details.occupation,
      company_name: application.personal_details.company_name || '',
      wedding_anniversary: application.personal_details.wedding_anniversary || '',
      emergency_name: application.emergency_contact.name,
      emergency_phone: application.emergency_contact.phone,
      emergency_relation: application.emergency_contact.relation,
    },
  });

  const watchedGender = useWatch({ control, name: 'gender' });
  const watchedLifeStage = useWatch({ control, name: 'life_stage' });

  const onSubmit = async (values: EditApplicantProfileInput) => {
    try {
      await updateStageMutation.mutateAsync({
        action: 'update_profile',
        application_id: application.id,
        profile: {
          first_name: values.first_name.trim(),
          middle_name: values.middle_name?.trim() || null,
          last_name: values.last_name.trim(),
          nickname: values.nickname.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim(),
          date_of_birth: values.date_of_birth,
          gender: values.gender,
          life_stage: values.life_stage,
          personal_details: {
            occupation: values.occupation.trim(),
            company_name: values.company_name?.trim() || null,
            wedding_anniversary:
              values.life_stage === 'Married' ? values.wedding_anniversary?.trim() || null : null,
          },
          emergency_contact: {
            name: values.emergency_name.trim(),
            phone: values.emergency_phone.trim(),
            relation: values.emergency_relation.trim(),
          },
        },
      });

      toast.success('Applicant details updated successfully');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update applicant details');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="2xl">
      <Dialog.Header>
        <Dialog.Title>Edit Applicant Details</Dialog.Title>
        <Dialog.Description>
          Update applicant personal info, contact numbers, or fix typos.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Identity Fields */}
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Identity & Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormInputField
                label="First Name"
                required
                registration={register('first_name')}
                error={errors.first_name?.message}
              />
              <FormInputField
                label="Middle Name"
                registration={register('middle_name')}
                error={errors.middle_name?.message}
              />
              <FormInputField
                label="Last Name"
                required
                registration={register('last_name')}
                error={errors.last_name?.message}
              />
              <FormInputField
                label="Nickname"
                required
                registration={register('nickname')}
                error={errors.nickname?.message}
              />
              <FormInputField
                label="Email"
                type="email"
                required
                registration={register('email')}
                error={errors.email?.message}
              />
              <FormInputField
                label="Mobile Phone"
                required
                registration={register('phone')}
                error={errors.phone?.message}
              />
            </div>
          </div>

          {/* Demographics */}
          <div className="border-t border-border pt-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Demographics & Work
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormInputField
                label="Date of Birth"
                type="date"
                required
                registration={register('date_of_birth')}
                error={errors.date_of_birth?.message}
              />
              <FormSelectField
                label="Gender"
                placeholder=""
                required
                value={watchedGender}
                onChange={(val) =>
                  setValue('gender', val as 'Male' | 'Female', { shouldValidate: true })
                }
                options={GENDER_OPTIONS}
                error={errors.gender?.message}
              />
              <FormSelectField
                label="Life Stage"
                placeholder=""
                required
                value={watchedLifeStage}
                onChange={(val) => setValue('life_stage', val, { shouldValidate: true })}
                options={LIFE_STAGE_OPTIONS}
                error={errors.life_stage?.message}
              />
              <FormInputField
                label="Occupation"
                required
                registration={register('occupation')}
                error={errors.occupation?.message}
              />
              <FormInputField
                label="Company Name"
                registration={register('company_name')}
                error={errors.company_name?.message}
              />
              {watchedLifeStage === 'Married' && (
                <FormInputField
                  id="wedding_anniversary"
                  label="Wedding Anniversary"
                  type="date"
                  registration={register('wedding_anniversary')}
                  error={errors.wedding_anniversary?.message}
                />
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-border pt-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted mb-2">
              Emergency Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormInputField
                label="Contact Name"
                required
                registration={register('emergency_name')}
                error={errors.emergency_name?.message}
              />
              <FormInputField
                label="Contact Number"
                required
                registration={register('emergency_phone')}
                error={errors.emergency_phone?.message}
              />
              <FormInputField
                label="Relationship"
                required
                registration={register('emergency_relation')}
                error={errors.emergency_relation?.message}
              />
            </div>
          </div>
        </form>
      </Dialog.Body>

      <Dialog.Footer className="sm:justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onClose}
          disabled={updateStageMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form={formId}
          variant="default"
          size="md"
          disabled={updateStageMutation.isPending}
        >
          {updateStageMutation.isPending && <Spinner size="sm" className="mr-1.5" />}
          Save Details
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
