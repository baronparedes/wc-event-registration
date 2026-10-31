import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, CalendarRange } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ContactButtons } from '@/components/ui/ContactButtons';
import { FormInputField } from '@/components/ui/FormInputField';
import { SectionCard } from '@/components/ui/SectionCard';
import { ROUTE_PATHS, TOAST_MESSAGES, UI_MESSAGES } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  useAdminMemberQuery,
  useRestoreMemberMutation,
  useSoftDeleteMemberMutation,
  useUpdateMemberMutation,
  useUploadMemberAvatarMutation,
} from '@/hooks/domain/members';
import { useUserCommitmentHistoryQuery } from '@/hooks/domain/services';
import { canAdminPerform } from '@/lib/domain/auth';
import type { AdminMember, UpdateMemberInput } from '@/lib/domain/members';
import { updateMemberSchema } from '@/lib/domain/members';
import { getLastCommitmentUpdatedAt } from '@/lib/domain/services';
import { formatDateOnly, formatDateTime } from '@/lib/infrastructure';
import { MemberNavigationLinks } from '@/pages/admin/members/components/MemberNavigationLinks';
import { RequestLongLeaveModal } from '@/pages/profile/components/service-attendance';

import { DGroupEditor } from './components/DGroupEditor';
import { EditableMemberAvatar } from './components/EditableMemberAvatar';
import { MemberLifecycleActions } from './components/MemberLifecycleActions';
import { MemberNotes } from './components/MemberNotes';
import { MetadataEntriesEditor } from './components/MetadataEntriesEditor';
import { SundayAvailabilityEditor } from './components/SundayAvailabilityEditor';

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
  const commitmentHistoryQuery = useUserCommitmentHistoryQuery(memberQuery.data?.id ?? id ?? '');
  const updateMemberMutation = useUpdateMemberMutation();
  const deleteMemberMutation = useSoftDeleteMemberMutation();
  const restoreMemberMutation = useRestoreMemberMutation();
  const uploadMemberAvatarMutation = useUploadMemberAvatarMutation();
  const [isLongLeaveModalOpen, setIsLongLeaveModalOpen] = useState(false);

  const lastCommitmentUpdate = getLastCommitmentUpdatedAt(commitmentHistoryQuery.data);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: DEFAULT_VALUES,
    values: memberQuery.data ? toFormValues(memberQuery.data) : undefined,
  });

  const {
    fields: metadataFields,
    append: appendMetadata,
    remove: removeMetadata,
  } = useFieldArray({ control, name: 'metadata_entries' });

  const firstName = useWatch({ control, name: 'first_name' });
  const lastName = useWatch({ control, name: 'last_name' });
  const phone = useWatch({ control, name: 'phone' });
  const derivedFullName = [firstName ?? '', lastName ?? '']
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(authState?.adminRole, 'canReadAdminData');

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
          <AlertBanner variant="error" description="Member ID is missing." />
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
          <AlertBanner variant="error" description={UI_MESSAGES.errors.memberNotFound} />
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
        navLinks={<MemberNavigationLinks memberId={id} />}
        title={canWrite ? 'Edit Member' : 'View Member'}
        description={
          canWrite
            ? 'Update the member profile, contact details, and admin metadata.'
            : 'View the member profile, contact details, and admin metadata.'
        }
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setIsLongLeaveModalOpen(true)}
            className="gap-1.5"
          >
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            File Long Leave
          </Button>
        }
      />

      <AdminPageShell.Content>
        {isDeletedMember && (
          <AlertBanner
            variant="error"
            title="Member Deactivated"
            description="This member is soft deleted and excluded from registration member lookup."
            className="mb-4"
          />
        )}
        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <SectionCard
            title="Member Profile"
            subtitle="Member ID stays read-only because it is used for lookup and registration linking."
            headerAction={
              member.last_activity && (
                <Badge>Last Activity: {formatDateTime(member.last_activity)}</Badge>
              )
            }
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
                labelAdornment={
                  member.has_account ? (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 text-[#178e9f]"
                      aria-label="Verified account"
                    />
                  ) : undefined
                }
                registration={register('email')}
                error={errors.email?.message}
                type="email"
                readOnly={!canWrite || isDeletedMember}
              />
              <FormInputField
                id="phone"
                label="Phone"
                labelAdornment={
                  phone ? (
                    <span
                      className="ml-1 inline-flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ContactButtons phone={phone} size="sm" variant="icon" />
                    </span>
                  ) : undefined
                }
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
              title="Discipleship Group (DGroup)"
              subtitle="Manage discipleship group status, leader information, and multiplication slots."
            >
              <DGroupEditor
                control={control}
                setValue={setValue}
                disabled={!canWrite || isDeletedMember}
              />
            </SectionCard>
          )}

          {(canWrite || canRead) && (
            <SectionCard
              title="Sunday Availability"
              subtitle="Manage member availability across all five Sundays."
              headerAction={
                <Badge
                  variant="outline"
                  title={lastCommitmentUpdate ? formatDateTime(lastCommitmentUpdate) : undefined}
                >
                  {lastCommitmentUpdate
                    ? `Last updated: ${formatDateOnly(lastCommitmentUpdate)}`
                    : 'Never updated'}
                </Badge>
              }
            >
              <SundayAvailabilityEditor
                control={control}
                setValue={setValue}
                disabled={!canWrite || isDeletedMember}
              />
            </SectionCard>
          )}

          {(canWrite || canRead) && (
            <MemberNotes
              memberId={member.id}
              notes={member.notes}
              disabled={!canWrite || isDeletedMember}
            />
          )}

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

      <RequestLongLeaveModal
        isOpen={isLongLeaveModalOpen}
        onClose={() => setIsLongLeaveModalOpen(false)}
        userId={member.id}
        memberName={member.full_name}
        isAdminView={true}
      />
    </AdminPageShell>
  );
}
