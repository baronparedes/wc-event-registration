import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { SectionCard } from '@/components/ui/SectionCard';
import { ROUTE_PATHS, TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  useAdminMemberQuery,
  useRestoreMemberMutation,
  useSoftDeleteMemberMutation,
  useUpdateMemberMutation,
} from '@/hooks/domain/members';
import { canWriteAdminData } from '@/lib/domain/auth';
import type { AdminMember, UpdateMemberInput } from '@/lib/domain/members';
import { updateMemberSchema } from '@/lib/domain/members';

import { MemberLifecycleActions } from './components/MemberLifecycleActions';
import { MetadataEntriesEditor } from './components/MetadataEntriesEditor';

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
  metadata_entries: [],
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
    metadata_entries: Object.entries(member.extra_metadata).map(([key, value]) => ({
      key,
      value,
    })),
  };
}

export function AdminMemberDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: authState } = useAdminAuthQuery();

  const memberQuery = useAdminMemberQuery(id, { includeInactive: true });
  const updateMemberMutation = useUpdateMemberMutation();
  const deleteMemberMutation = useSoftDeleteMemberMutation();
  const restoreMemberMutation = useRestoreMemberMutation();

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

  const {
    fields: metadataFields,
    append: appendMetadata,
    remove: removeMetadata,
  } = useFieldArray({ control, name: 'metadata_entries' });

  const firstName = useWatch({ control, name: 'first_name' });
  const lastName = useWatch({ control, name: 'last_name' });
  const derivedFullName = [firstName ?? '', lastName ?? '']
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
  const canWrite = canWriteAdminData(authState?.adminRole);

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

  async function onDeleteMember() {
    if (!id) return;

    try {
      await deleteMemberMutation.mutateAsync({ id });
      toast.success(TOAST_MESSAGES.member.deleted);
      navigate(ROUTE_PATHS.adminMembers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TOAST_MESSAGES.member.deleteFailed);
    }
  }

  async function onRestoreMember() {
    if (!id) return;

    try {
      await restoreMemberMutation.mutateAsync({ id });
      toast.success(TOAST_MESSAGES.member.restored);
      memberQuery.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TOAST_MESSAGES.member.restoreFailed);
    }
  }

  if (!id) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title={canWrite ? 'Edit Member' : 'View Member'} />
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
        <AdminPageShell.Header title={canWrite ? 'Edit Member' : 'View Member'} />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">{UI_MESSAGES.errors.memberNotFound}</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const member = memberQuery.data;
  const isDeletedMember = !member.is_active;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Members', to: ROUTE_PATHS.adminMembers },
          { label: member.full_name },
        ]}
        title={canWrite ? 'Edit Member' : 'View Member'}
        description={
          canWrite
            ? 'Update the member profile, contact details, and admin metadata.'
            : 'View the member profile, contact details, and admin metadata.'
        }
      />

      <AdminPageShell.Content>
        {isDeletedMember && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This member is soft deleted and excluded from registration member lookup.
          </div>
        )}
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
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="last-name"
                label="Last Name"
                registration={register('last_name')}
                error={errors.last_name?.message}
                required
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="nickname"
                label="Nickname"
                registration={register('nickname')}
                error={errors.nickname?.message}
                required
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="date-of-birth"
                label="Date of Birth"
                registration={register('date_of_birth')}
                error={errors.date_of_birth?.message}
                type="date"
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="email"
                label="Email"
                registration={register('email')}
                error={errors.email?.message}
                type="email"
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="phone"
                label="Phone"
                registration={register('phone')}
                error={errors.phone?.message}
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="role"
                label="Role"
                registration={register('role')}
                error={errors.role?.message}
                required
                disabled={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="category"
                label="Category"
                registration={register('category')}
                error={errors.category?.message}
                required
                disabled={!canWrite || isDeletedMember}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Additional Metadata"
            subtitle="Custom key-value fields stored alongside this member's profile. Keys should be unique and use snake_case."
          >
            <MetadataEntriesEditor
              fields={metadataFields}
              register={register}
              errors={errors}
              remove={removeMetadata}
              append={appendMetadata}
              disabled={!canWrite || isDeletedMember}
            />
          </SectionCard>

          <div className="flex items-center justify-end gap-3">
            {canWrite && (
              <MemberLifecycleActions
                isDeletedMember={isDeletedMember}
                memberFullName={member.full_name}
                isDeleting={deleteMemberMutation.isPending}
                isRestoring={restoreMemberMutation.isPending}
                onDeleteMember={onDeleteMember}
                onRestoreMember={onRestoreMember}
              />
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTE_PATHS.adminMembers)}
            >
              {canWrite ? 'Cancel' : 'Back to Members'}
            </Button>
            {canWrite && (
              <Button
                type="submit"
                disabled={isDeletedMember || !isDirty || updateMemberMutation.isPending}
              >
                {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </form>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
