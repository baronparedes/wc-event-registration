import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormInputField } from '@/components/ui/FormInputField';
import { useCreateMemberMutation } from '@/hooks/domain/members';
import { type CreateMemberInput, createMemberSchema } from '@/lib/domain/members';

const DEFAULT_VALUES: CreateMemberInput = {
  member_id: '',
  first_name: '',
  last_name: '',
  nickname: '',
  email: '',
  phone: '',
  date_of_birth: '',
  role: '',
  category: '',
};

export function AddMemberDialog({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const createMemberMutation = useCreateMemberMutation();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const firstName = useWatch({ control, name: 'first_name' });
  const lastName = useWatch({ control, name: 'last_name' });
  const derivedFullName = [firstName ?? '', lastName ?? '']
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (!isOpen) {
      reset(DEFAULT_VALUES);
    }
  }, [isOpen, reset]);

  async function onSubmit(values: CreateMemberInput) {
    try {
      await createMemberMutation.mutateAsync(values);
      toast.success('Member created successfully.');
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create member.';
      toast.error(errorMessage);
    }
  }

  const isLoading = createMemberMutation.isPending || isSubmitting;

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`whitespace-nowrap ${className}`}
      >
        <Plus className="h-5 w-5" />
        <span className="sm:hidden">Add</span>
        <span className="hidden sm:inline">Add Member</span>
      </Button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} size="5xl">
        <Dialog.Header showCloseButton>
          <Dialog.Title>Add New Member</Dialog.Title>
          <Dialog.Description>Create a new member profile</Dialog.Description>
        </Dialog.Header>
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
          <Dialog.Body scrollable className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-3">
              <FormInputField
                id="member-id"
                label="Member ID"
                registration={register('member_id')}
                error={errors.member_id?.message}
                required
              />
              <FormInputField
                id="first-name"
                label="First Name"
                registration={register('first_name')}
                error={errors.first_name?.message}
                required
              />
              <FormInputField
                id="last-name"
                label="Last Name"
                registration={register('last_name')}
                error={errors.last_name?.message}
                required
              />
              <FormInputField
                id="derived-full-name"
                label="Full Name"
                value={derivedFullName}
                onChange={() => undefined}
                readOnly
                disabled
                helperText="Auto-generated from First Name + Last Name"
              />
              <FormInputField
                id="nickname"
                label="Nickname"
                registration={register('nickname')}
                error={errors.nickname?.message}
                required
              />
              <FormInputField
                id="date-of-birth"
                label="Date of Birth"
                registration={register('date_of_birth')}
                error={errors.date_of_birth?.message}
                type="date"
              />
              <FormInputField
                id="email"
                label="Email"
                registration={register('email')}
                error={errors.email?.message}
                type="email"
              />
              <FormInputField
                id="phone"
                label="Phone"
                registration={register('phone')}
                error={errors.phone?.message}
              />
              <FormInputField
                id="role"
                label="Role"
                registration={register('role')}
                error={errors.role?.message}
                required
              />
              <FormInputField
                id="category"
                label="Category"
                registration={register('category')}
                error={errors.category?.message}
                required
              />
            </div>
          </Dialog.Body>

          <Dialog.Footer>
            <Button
              type="button"
              variant="primaryOutline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading ? 'Creating...' : 'Create Member'}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog>
    </>
  );
}
