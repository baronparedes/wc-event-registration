import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button, FormInputField, FormSelectField, SlugField } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminFormQuery, useSaveFormMutation } from '@/hooks/domain/forms';
import { adminFormInputSchema, type AdminFormInput } from '@/lib/domain/forms';

export function FormEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: existingForm, isLoading } = useAdminFormQuery(id);
  const saveFormMutation = useSaveFormMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdminFormInput>({
    resolver: zodResolver(adminFormInputSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      status: 'published',
      duplicate_policy: 'block',
      audience: 'members',
      metadata: {},
    },
  });

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

  const onSubmit = async (data: AdminFormInput) => {
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

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Forms', to: ROUTE_PATHS.adminForms },
          { label: isEditing ? 'Edit Form' : 'New Form' },
        ]}
        title={isEditing ? `Edit Form: ${existingForm?.title ?? ''}` : 'Create New Form'}
        description="Set title, slug, audience, and submission policies."
      />

      <AdminPageShell.Content isLoading={isEditing && isLoading}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
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
              slug={watch('slug')}
              sourceValue={watch('title')}
              isEditing={isEditing}
              onSlugChange={(slug) => setValue('slug', slug, { shouldValidate: true })}
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
              registration={register('duplicate_policy')}
              error={errors.duplicate_policy?.message}
              options={[
                { label: 'Block Duplicate Submissions', value: 'block' },
                { label: 'Allow Update Existing Submission', value: 'allow_update' },
                { label: 'Allow Multiple Submissions', value: 'allow_multiple' },
                { label: 'Allow Multiple with Update', value: 'allow_multiple_update' },
              ]}
            />

            <FormSelectField
              label="Status"
              registration={register('status')}
              error={errors.status?.message}
              options={[
                { label: 'Published (Active)', value: 'published' },
                { label: 'Draft', value: 'draft' },
                { label: 'Archived', value: 'archived' },
              ]}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="default"
              disabled={saveFormMutation.isPending}
            >
              {saveFormMutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : 'Next: Manage Fields'}
            </Button>
            <Button
              type="button"
              variant="primaryOutline"
              onClick={() => navigate(ROUTE_PATHS.adminForms)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
