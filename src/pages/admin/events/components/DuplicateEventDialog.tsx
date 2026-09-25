import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { Button, FormInputField } from '@/components/ui';
import { Dialog } from '@/components/ui/Dialog';
import { VALIDATION_PATTERNS } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';

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

type DuplicateEventDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
  isPending: boolean;
  onDuplicate: (eventId: string, title: string, slug: string) => Promise<void>;
};

export function DuplicateEventDialog({
  isOpen,
  onClose,
  event,
  isPending,
  onDuplicate,
}: DuplicateEventDialogProps) {
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
    if (isOpen && event) {
      reset({
        title: `${event.title} (Copy)`,
      });
    }
  }, [isOpen, event, reset]);

  const onSubmit = async (values: DuplicateFormValues) => {
    if (!event) return;
    await onDuplicate(event.id, values.title, values.slug);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Duplicate Event</Dialog.Title>
        {event && (
          <Dialog.Description>
            You are about to duplicate &quot;{event.title}&quot;. Please provide a new name and
            slug.
          </Dialog.Description>
        )}
      </Dialog.Header>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog.Body className="space-y-4">
          <FormInputField
            id="duplicate-title"
            label="New Event Name"
            placeholder="e.g. Sunday Service - Jan 1"
            registration={register('title')}
            error={errors.title?.message}
            disabled={isPending}
            required
          />
          <FormInputField
            id="duplicate-slug"
            label="New Event Slug"
            placeholder="e.g. sunday-service-jan-1"
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
            {isPending ? 'Duplicating...' : 'Duplicate Event'}
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
