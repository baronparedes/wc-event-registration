import { useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { IdCardLanyard } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { AlertBanner, FormInputField } from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useUpdateMemberIdMutation } from '@/hooks/domain/members';
import { useRfidAutoFocus } from '@/hooks/utils';

interface UpdateMemberIdDialogProps {
  memberId: string;
  memberName: string;
  currentMemberId: string;
  triggerClassName?: string;
}

const updateMemberIdSchema = z.object({
  newMemberId: z.string().trim().min(1, 'Member ID is required'),
});

type UpdateMemberIdValues = z.infer<typeof updateMemberIdSchema>;

export function UpdateMemberIdDialog({
  memberId,
  memberName,
  currentMemberId,
  triggerClassName,
}: UpdateMemberIdDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const updateMutation = useUpdateMemberIdMutation();
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<UpdateMemberIdValues>({
    resolver: zodResolver(updateMemberIdSchema),
    defaultValues: { newMemberId: '' },
  });

  const newMemberIdValue = useWatch({ control, name: 'newMemberId' });
  const trimmedNewId = (newMemberIdValue ?? '').trim();
  const hasChanges = Boolean(trimmedNewId && trimmedNewId !== currentMemberId);
  const isUpdating = updateMutation.isPending;

  useRfidAutoFocus(inputRef, isOpen);

  function handleClose() {
    reset({ newMemberId: '' });
    setIsOpen(false);
  }

  function handleOpen() {
    reset({ newMemberId: '' });
    setIsOpen(true);
  }

  async function onSubmit(values: UpdateMemberIdValues) {
    const targetNewId = values.newMemberId.trim();
    if (!targetNewId || targetNewId === currentMemberId) return;

    try {
      await updateMutation.mutateAsync({
        id: memberId,
        newMemberId: targetNewId,
      });
      toast.success(`Member ID updated to "${targetNewId}".`);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update Member ID.');
    }
  }

  const { ref: formRegisterRef, ...restRegister } = register('newMemberId');

  return (
    <>
      <ActionButton
        type="button"
        onClick={handleOpen}
        title="Update Member ID"
        aria-label="Update Member ID"
        className={triggerClassName}
      >
        <IdCardLanyard className="h-5 w-5" />
      </ActionButton>

      <Dialog isOpen={isOpen} onClose={handleClose} size="md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Header showCloseButton>
            <Dialog.Title>Update Member ID</Dialog.Title>
            <Dialog.Description>
              Enter the new Member ID. This action will update the member&apos;s lookup ID.
            </Dialog.Description>
          </Dialog.Header>

          <Dialog.Body className="space-y-4">
            <AlertBanner
              variant="warning"
              description={
                <div>
                  <p className="font-semibold text-amber-900">Member: {memberName}</p>
                  <p className="font-semibold text-amber-900">
                    Current Member ID: {currentMemberId}
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    This ID is used for lookup and registration linking. Update with caution.
                  </p>
                </div>
              }
            />

            <FormInputField
              inputRef={(el) => {
                formRegisterRef(el);
                inputRef.current = el;
              }}
              id="new-member-id"
              label="New Member ID"
              placeholder="Scan or type new member ID"
              disabled={isUpdating}
              autoComplete="off"
              error={errors.newMemberId?.message}
              registration={{
                ...restRegister,
                ref: formRegisterRef,
              }}
            />
          </Dialog.Body>

          <Dialog.Footer>
            <Button
              type="button"
              variant="primaryOutline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!hasChanges || isUpdating}>
              {isUpdating ? 'Updating...' : 'Confirm Update'}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog>
    </>
  );
}
