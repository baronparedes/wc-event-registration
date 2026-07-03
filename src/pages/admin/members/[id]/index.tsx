import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { SectionCard } from '@/components/ui/SectionCard';
import { ROUTE_PATHS, TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants';
import { useAdminMemberQuery, useUpdateMemberMutation } from '@/hooks/domain/members';
import type { AdminMember, UpdateMemberInput } from '@/lib/domain/members';
import { updateMemberSchema } from '@/lib/domain/members';

const DEFAULT_VALUES: UpdateMemberInput = {
  full_name: '',
  first_name: '',
  last_name: '',
  nickname: '',
  email: '',
  phone: '',
  date_of_birth: '',
  role: '',
  category: '',
};

function toFormValues(member: AdminMember): UpdateMemberInput {
  return {
    full_name: member.full_name,
    first_name: member.first_name ?? '',
    last_name: member.last_name ?? '',
    nickname: member.nickname ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    date_of_birth: member.date_of_birth ?? '',
    role: member.role,
    category: member.category,
  };
}

export function AdminMemberDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const memberQuery = useAdminMemberQuery(id);
  const updateMemberMutation = useUpdateMemberMutation();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const firstName = useWatch({ control, name: 'first_name' });
  const lastName = useWatch({ control, name: 'last_name' });
  const derivedFullName = [firstName ?? '', lastName ?? '']
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (memberQuery.data) {
      reset(toFormValues(memberQuery.data));
    }
  }, [memberQuery.data, reset]);

  async function onSubmit(values: UpdateMemberInput) {
    if (!id) return;

    try {
      await updateMemberMutation.mutateAsync({ id, ...values });
      toast.success(TOAST_MESSAGES.member.updated);
      navigate(ROUTE_PATHS.adminMembers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TOAST_MESSAGES.member.updateFailed);
    }
  }

  if (!id) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Edit Member" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Member ID is missing.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (memberQuery.isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage={UI_MESSAGES.loading.member}>
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Edit Member" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">{UI_MESSAGES.errors.memberNotFound}</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const member = memberQuery.data;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Members', to: ROUTE_PATHS.adminMembers },
          { label: member.full_name },
        ]}
        navLinks={<ActionLink to={ROUTE_PATHS.adminMembers}>Back to Members</ActionLink>}
        title="Edit Member"
        description="Update the member profile, contact details, and admin metadata."
      />

      <AdminPageShell.Content>
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <SectionCard
            title="Member Profile"
            subtitle="Member ID stays read-only because it is used for lookup and registration linking."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormInputField
                id="member-id"
                label="Member ID"
                value={memberQuery.data.member_id}
                onChange={() => undefined}
                readOnly
                disabled
              />
              <FormInputField
                id="full-name"
                label="Full Name"
                value={derivedFullName}
                onChange={() => undefined}
                error={errors.full_name?.message}
                readOnly
                disabled
                helperText="Auto-generated from First Name + Last Name"
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
          </SectionCard>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.adminMembers)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || updateMemberMutation.isPending}>
              {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
