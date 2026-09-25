import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { FormInputField } from './FormInputField';

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

export type DuplicateEntityFormValues = z.infer<typeof duplicateSchema>;

export interface DuplicateEntityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  sourceItem: { id: string; title: string } | null;
  isPending: boolean;
  onDuplicate: (sourceId: string, newTitle: string, newSlug: string) => Promise<void>;
}

export function DuplicateEntityDialog({
  isOpen,
  onClose,
  entityType,
  sourceItem,
  isPending,
  onDuplicate,
}: DuplicateEntityDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<DuplicateEntityFormValues>({
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
    if (isOpen && sourceItem) {
      reset({
        title: `${sourceItem.title} (Copy)`,
      });
    }
  }, [isOpen, sourceItem, reset]);

  const onSubmit = async (values: DuplicateEntityFormValues) => {
    if (!sourceItem) return;
    await onDuplicate(sourceItem.id, values.title, values.slug);
  };

  const capitalizedEntityType = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Duplicate {capitalizedEntityType}</Dialog.Title>
        {sourceItem && (
          <Dialog.Description>
            You are about to duplicate &quot;{sourceItem.title}&quot;. Please provide a new name and
            slug.
          </Dialog.Description>
        )}
      </Dialog.Header>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Body className="space-y-4">
          <FormInputField
            id={`duplicate-${entityType.toLowerCase()}-title`}
            label={`New ${capitalizedEntityType} Name`}
            placeholder={`e.g. ${sourceItem?.title || 'New Item'} - Copy`}
            registration={register('title')}
            error={errors.title?.message}
            disabled={isPending}
            required
          />
          <FormInputField
            id={`duplicate-${entityType.toLowerCase()}-slug`}
            label={`New ${capitalizedEntityType} Slug`}
            placeholder="e.g. new-item-copy"
            registration={register('slug')}
            error={errors.slug?.message}
            disabled={isPending}
            required
          />
        </Dialog.Body>
        <Dialog.Footer>
          <Button type="button" variant="primaryOutline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isPending}>
            {isPending ? 'Duplicating...' : `Duplicate ${capitalizedEntityType}`}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
