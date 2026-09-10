import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button, FormInputField, FormSelectField, SlugField } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminFormQuery, useSaveFormMutation } from '@/hooks/domain/forms';
import { useSlugGeneration } from '@/hooks/utils';
import { type AdminFormInput, adminFormInputSchema } from '@/lib/domain/forms';

import { FormNavigationLinks } from '../components';

export function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: existingForm, isLoading } = useAdminFormQuery(id);
  const saveFormMutation = useSaveFormMutation();

  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isRestoreToDraftConfirmOpen, setIsRestoreToDraftConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<AdminFormInput>({
    resolver: zodResolver(adminFormInputSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      status: 'draft',
      duplicate_policy: 'block',
      audience: 'members',
      metadata: {},
    },
  });

  const { slugValue, onSlugChange } = useSlugGeneration(isEditing, watch, setValue);

  useEffect(() => {
    if (existingForm) {
      reset({
        title: existingForm.title,
        slug: existingForm.slug,
        description: existingForm.description ?? '',
        status: existingForm.status,
        duplicate_policy: existingForm.duplicate_policy,
        audience: existingForm.audience,
        metadata: existingForm.metadata ?? {},
      });
    }
  }, [existingForm, reset]);

  const onSubmit: SubmitHandler<AdminFormInput> = async (data) => {
    try {
      const form = await saveFormMutation.mutateAsync({ id, data });
      if (form?.id) {
        navigate(toRoute('adminFormFields', { id: form.id }));
      } else {
        navigate(ROUTE_PATHS.adminForms);
      }
    } catch (err) {
      console.error('Failed to save form:', err);
    }
  };

  async function handleUpdateStatus(newStatus: 'published' | 'draft' | 'archived') {
    if (!existingForm || !id) return;
    try {
      await saveFormMutation.mutateAsync({
        id,
        data: {
          title: existingForm.title,
          slug: existingForm.slug,
          description: existingForm.description ?? '',
          status: newStatus,
          duplicate_policy: existingForm.duplicate_policy,
          audience: existingForm.audience,
          metadata: existingForm.metadata ?? {},
        },
      });
      toast.success(`Form marked as ${newStatus}`);
    } catch {
      toast.error(`Failed to mark form as ${newStatus}`);
    }
  }

  const navLinks =
    isEditing && id ? <FormNavigationLinks formId={id} currentSection="form" /> : undefined;

  const headerActions =
    isEditing && existingForm ? (
      <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto md:justify-end">
        {existingForm.status !== 'published' && (
          <>
            {existingForm.status === 'archived' ? (
              <Button
                type="button"
                variant="default"
                disabled={saveFormMutation.isPending}
                onClick={() => setIsRestoreToDraftConfirmOpen(true)}
              >
                Move to Draft
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                disabled={saveFormMutation.isPending}
                onClick={() => handleUpdateStatus('published')}
              >
                Publish Form
              </Button>
            )}
          </>
        )}
        {existingForm.status !== 'archived' && (
          <Button
            type="button"
            variant="destructive"
            disabled={saveFormMutation.isPending}
            onClick={() => setIsArchiveConfirmOpen(true)}
          >
            Archive
          </Button>
        )}

        {existingForm.status !== 'archived' && (
          <ConfirmDialog
            isOpen={isArchiveConfirmOpen}
            title="Archive Form"
            description={
              <>
                Are you sure you want to archive{' '}
                <span className="font-medium text-text">"{existingForm.title}"</span>? Archived
                forms are no longer visible to respondents. You can publish the form again to
                restore it.
              </>
            }
            confirmLabel="Archive"
            confirmLoadingLabel="Archiving..."
            confirmVariant="destructive"
            isPending={saveFormMutation.isPending}
            onConfirm={async () => {
              await handleUpdateStatus('archived');
              setIsArchiveConfirmOpen(false);
            }}
            onCancel={() => setIsArchiveConfirmOpen(false)}
          />
        )}

        {existingForm.status === 'archived' && (
          <ConfirmDialog
            isOpen={isRestoreToDraftConfirmOpen}
            title="Move Form to Draft"
            description={
              <>
                Move <span className="font-medium text-text">"{existingForm.title}"</span> back to
                draft? This will keep it hidden from the public until it is published again.
              </>
            }
            confirmLabel="Move to Draft"
            confirmLoadingLabel="Updating..."
            confirmVariant="default"
            isPending={saveFormMutation.isPending}
            onConfirm={async () => {
              await handleUpdateStatus('draft');
              setIsRestoreToDraftConfirmOpen(false);
            }}
            onCancel={() => setIsRestoreToDraftConfirmOpen(false)}
          />
        )}
      </div>
    ) : undefined;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Forms', to: ROUTE_PATHS.adminForms },
          { label: isEditing ? 'Edit Form' : 'New Form' },
        ]}
        navLinks={navLinks}
        title={isEditing ? `Edit Form: ${existingForm?.title ?? ''}` : 'Create New Form'}
        description="Set title, slug, audience, and submission policies."
        actions={headerActions}
      />

      <AdminPageShell.Content isLoading={isEditing && isLoading}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text">Basic Details</h3>

            <FormInputField
              label="Form Title"
              registration={register('title')}
              error={errors.title?.message}
              placeholder="e.g. Area Reservation Form"
              required
            />

            <SlugField
              value={slugValue}
              isEditMode={isEditing}
              onChange={onSlugChange}
              error={errors.slug?.message}
            />

            <div>
              <label className="block text-sm font-medium text-text mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Optional description or instructions for respondents..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold text-text">Form Settings & Policies</h3>

            <FormSelectField
              label="Audience"
              value={useWatch({ control, name: 'audience' })}
              registration={register('audience')}
              error={errors.audience?.message}
              options={[
                { label: 'Members Only', value: 'members' },
                { label: 'Public Only', value: 'public' },
                { label: 'Members and Public', value: 'members_and_public' },
              ]}
            />

            <FormSelectField
              label="Duplicate Submission Policy"
              value={useWatch({ control, name: 'duplicate_policy' })}
              registration={register('duplicate_policy')}
              error={errors.duplicate_policy?.message}
              options={[
                { label: 'Block Duplicate Submissions', value: 'block' },
                { label: 'Allow Update Existing Submission', value: 'allow_update' },
                { label: 'Allow Multiple Submissions', value: 'allow_multiple' },
                { label: 'Allow Multiple with Update', value: 'allow_multiple_update' },
              ]}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="primaryOutline"
              size="lg"
              disabled={saveFormMutation.isPending}
              onClick={() => navigate(ROUTE_PATHS.adminForms)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="lg" disabled={saveFormMutation.isPending}>
              {saveFormMutation.isPending
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Next: Manage Fields'}
            </Button>
          </div>
        </form>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
