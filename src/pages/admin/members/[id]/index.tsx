import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FormInputField } from '@/components/ui/FormInputField';
import { SectionCard } from '@/components/ui/SectionCard';
import { ROUTE_PATHS, TOAST_MESSAGES, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  useAdminMemberQuery,
  useRestoreMemberMutation,
  useSoftDeleteMemberMutation,
  useUpdateMemberMutation,
  useUploadMemberAvatarMutation,
} from '@/hooks/domain/members';
import { canAdminPerform } from '@/lib/domain/auth';
import type { AdminMember, UpdateMemberInput } from '@/lib/domain/members';
import { updateMemberSchema } from '@/lib/domain/members';

import { EditableMemberAvatar } from './components/EditableMemberAvatar';
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
  const uploadMemberAvatarMutation = useUploadMemberAvatarMutation();

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
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(authState?.adminRole, 'canReadAdminData');

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

  async function onSaveAvatar(imageBase64: string) {
    if (!id) return;

    await uploadMemberAvatarMutation.mutateAsync({ id, image_base64: imageBase64 });
    toast.success('Member photo updated successfully.');
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
        actions={
          <>
            {(canWrite || canRead) && (
              <Button variant="primaryOutline" asChild>
                <Link to={toRoute('memberProfile', { id })}>View Event History</Link>
              </Button>
            )}
          </>
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
            <div className="flex items-center justify-center">
              {canWrite && !isDeletedMember ? (
                <EditableMemberAvatar
                  name={`${member.nickname || ''} ${member.last_name || ''}`.trim()}
                  avatarObjectKey={member.avatar_object_key}
                  isSaving={uploadMemberAvatarMutation.isPending}
                  onSave={onSaveAvatar}
                />
              ) : (
                <Avatar
                  size="xl"
                  name={`${member.nickname || ''} ${member.last_name || ''}`.trim()}
                  avatarObjectKey={member.avatar_object_key}
                  className="mb-4"
                />
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormInputField
                id="member-id"
                label="Member ID"
                value={memberQuery.data.member_id}
                onChange={() => undefined}
                readOnly
              />
              <FormInputField
                id="full-name"
                label="Full Name"
                value={derivedFullName}
                onChange={() => undefined}
                error={errors.full_name?.message}
                readOnly
                helperText="Auto-generated from First Name + Last Name"
              />
              <FormInputField
                id="first-name"
                label="First Name"
                registration={register('first_name')}
                error={errors.first_name?.message}
                required
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="last-name"
                label="Last Name"
                registration={register('last_name')}
                error={errors.last_name?.message}
                required
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="nickname"
                label="Nickname"
                registration={register('nickname')}
                error={errors.nickname?.message}
                required
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="date-of-birth"
                label="Date of Birth"
                registration={register('date_of_birth')}
                error={errors.date_of_birth?.message}
                type="date"
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="email"
                label="Email"
                registration={register('email')}
                error={errors.email?.message}
                type="email"
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="phone"
                label="Phone"
                registration={register('phone')}
                error={errors.phone?.message}
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="role"
                label="Role"
                registration={register('role')}
                error={errors.role?.message}
                required
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="category"
                label="Category"
                registration={register('category')}
                error={errors.category?.message}
                required
                readOnly={!canWrite || isDeletedMember}
              />
            </div>
          </SectionCard>

          {(canWrite || canRead) && (
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
          )}

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
              variant="primaryOutline"
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
