import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button, FormInputField } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { VALIDATION_PATTERNS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';

const duplicateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(
      VALIDATION_PATTERNS.eventSlug,
      'Slug must use only lowercase letters, numbers, and hyphens',
    ),
});

type DuplicateFormValues = z.infer<typeof duplicateSchema>;

type DuplicateFormDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  form: AdminForm | null;
  isPending: boolean;
  onDuplicate: (formId: string, title: string, slug: string) => Promise<void>;
};

export function DuplicateFormDialog({
  isOpen,
  onClose,
  form,
  isPending,
  onDuplicate,
}: DuplicateFormDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<DuplicateFormValues>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: {
      title: '',
      slug: '',
    },
  });

  const titleValue = useWatch({ control, name: 'title' });

  // Auto-generate slug from title
  useEffect(() => {
    if (titleValue) {
      const generatedSlug = titleValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [titleValue, setValue]);

  useEffect(() => {
    if (isOpen && form) {
      reset({
        title: `${form.title} (Copy)`,
      });
    }
  }, [isOpen, form, reset]);

  const onSubmit = async (values: DuplicateFormValues) => {
    if (!form) return;
    await onDuplicate(form.id, values.title, values.slug);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Form"
      description={
        form
          ? `You are about to duplicate "${form.title}". Please provide a new name and slug.`
          : ''
      }
      showCloseIcon
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInputField
          id="duplicate-title"
          label="New Form Name"
          placeholder="e.g. Member Survey - 2024"
          registration={register('title')}
          error={errors.title?.message}
          disabled={isPending}
          required
        />
        <FormInputField
          id="duplicate-slug"
          label="New Form Slug"
          placeholder="e.g. member-survey-2024"
          registration={register('slug')}
          error={errors.slug?.message}
          disabled={isPending}
          required
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
          <Button type="button" variant="primaryOutline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isPending}>
            {isPending ? 'Duplicating...' : 'Duplicate Form'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
