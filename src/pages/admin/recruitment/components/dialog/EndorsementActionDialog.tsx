import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, RefreshCw, Send, UserCog } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AlertBanner } from '@/components/ui/AlertBanner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormInputField } from '@/components/ui/FormInputField';
import { FormTextareaField } from '@/components/ui/FormTextareaField';
import { Spinner } from '@/components/ui/Spinner';
import { useUpdateRecruitmentStageMutation } from '@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation';

const endorsementActionFormSchema = z.object({
  leader_name: z.string().trim().min(1, 'Leader name is required'),
  leader_email: z.string().trim().email('Valid email address is required'),
  leader_contact_number: z.string().trim().optional(),
  notes: z.string().trim().max(1000, 'Notes must be 1000 characters or fewer').optional(),
});

type EndorsementActionFormData = z.infer<typeof endorsementActionFormSchema>;

export interface EndorsementActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicantName: string;
  mode: 'change_leader' | 're_request';
  initialLeaderName?: string;
  initialLeaderEmail?: string;
  initialLeaderPhone?: string;
  isEndorsed?: boolean;
}

export function EndorsementActionDialog({
  isOpen,
  onClose,
  applicationId,
  applicantName,
  mode,
  initialLeaderName = '',
  initialLeaderEmail = '',
  initialLeaderPhone = '',
  isEndorsed = false,
}: EndorsementActionDialogProps) {
  const updateStageMutation = useUpdateRecruitmentStageMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EndorsementActionFormData>({
    resolver: zodResolver(endorsementActionFormSchema),
    defaultValues: {
      leader_name: initialLeaderName,
      leader_email: initialLeaderEmail,
      leader_contact_number: initialLeaderPhone,
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        leader_name: initialLeaderName,
        leader_email: initialLeaderEmail,
        leader_contact_number: initialLeaderPhone,
        notes: '',
      });
    }
  }, [isOpen, initialLeaderName, initialLeaderEmail, initialLeaderPhone, reset]);

  const isChangeLeader = mode === 'change_leader';

  const onSubmit = async (values: EndorsementActionFormData) => {
    try {
      await updateStageMutation.mutateAsync({
        action: 'request_endorsement',
        application_id: applicationId,
        leader_name: values.leader_name.trim(),
        leader_email: values.leader_email.trim().toLowerCase(),
        leader_contact_number: values.leader_contact_number?.trim() || null,
        notes: values.notes?.trim() || null,
      });

      toast.success(
        isChangeLeader
          ? `Endorsement request dispatched to ${values.leader_name} (${values.leader_email}).`
          : `Endorsement re-requested for ${applicantName}.`,
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send endorsement request');
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2">
          {isChangeLeader ? (
            <UserCog className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
          )}
          <Dialog.Title>
            {isChangeLeader ? 'Change DGroup Leader' : 'Request Endorsement Again'}
          </Dialog.Title>
        </div>
        <Dialog.Description>
          {isChangeLeader
            ? `Update the assigned DGroup Leader for ${applicantName}.`
            : `Re-dispatch endorsement questionnaire for ${applicantName}.`}
        </Dialog.Description>
      </Dialog.Header>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Body className="space-y-4">
          <AlertBanner
            variant="info"
            icon={<AlertCircle className="h-4 w-4 shrink-0" />}
            title={
              isChangeLeader
                ? isEndorsed
                  ? 'Endorsement Status Reset'
                  : 'Automatic Request Replacement'
                : 'Endorsement Reset'
            }
            description={
              isChangeLeader
                ? isEndorsed
                  ? `This applicant has already been endorsed. Updating the leader will supersede the previous endorsement, reset their status to Pending, and dispatch a new endorsement link to the updated email address.`
                  : `Updating the leader will cancel the current pending request${
                      initialLeaderEmail ? ` to ${initialLeaderEmail}` : ''
                    } and immediately send a new invitation link to the updated email address.`
                : 'Sending a new endorsement request will reset the status to Pending Leader Review and email an endorsement link to the leader.'
            }
          />

          <div className="space-y-3">
            <FormInputField
              id="endorsement-leader-name"
              label="Leader Full Name"
              placeholder="e.g. Bro. John Doe"
              registration={register('leader_name')}
              error={errors.leader_name?.message}
              required
            />

            <FormInputField
              id="endorsement-leader-email"
              label="Leader Email Address"
              type="email"
              placeholder="leader@example.com"
              registration={register('leader_email')}
              error={errors.leader_email?.message}
              required
            />

            <FormInputField
              id="endorsement-leader-phone"
              label="Leader Contact Number (Optional)"
              placeholder="+63 917 123 4567"
              registration={register('leader_contact_number')}
              error={errors.leader_contact_number?.message}
            />

            <FormTextareaField
              id="endorsement-notes"
              label={
                isChangeLeader
                  ? 'Reason for Leader Change (Optional)'
                  : 'Clarification / Context Notes (Optional)'
              }
              placeholder={
                isChangeLeader
                  ? 'e.g. Applicant transitioned to a new DGroup / previous email typo...'
                  : 'e.g. Clarified ministry commitment expectations with leader...'
              }
              rows={3}
              textareaClassName="resize-none"
              registration={register('notes')}
              error={errors.notes?.message}
            />
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>Sending Request...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>{isChangeLeader ? 'Update & Send Link' : 'Send Endorsement Request'}</span>
              </>
            )}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
