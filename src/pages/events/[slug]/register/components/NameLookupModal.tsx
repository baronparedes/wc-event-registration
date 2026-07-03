import { useState } from 'react';

import { createPortal } from 'react-dom';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';

const nameLookupSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(200, 'Name is too long'),
});

type NameLookupForm = z.infer<typeof nameLookupSchema>;

type NameLookupModalProps = {
  onSubmit: (name: string) => Promise<void>;
  isLookupPending: boolean;
  variant?: 'link' | 'card';
  autoOpen?: boolean;
};

/**
 * Modal component for name-based member lookup in registration flow.
 * Renders via createPortal to document.body to avoid nesting inside parent form,
 * which ensures valid HTML and prevents form submission interference.
 *
 * @param variant - 'link' for subtle underlined text (default), 'card' for button-like appearance in dual-input layouts
 * @param autoOpen - if true, opens modal automatically on mount (useful for progressive disclosure flows)
 */
export function NameLookupModal({
  onSubmit,
  isLookupPending,
  variant = 'link',
  autoOpen = false,
}: NameLookupModalProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NameLookupForm>({
    resolver: zodResolver(nameLookupSchema),
  });

  const handleFormSubmit = async (data: NameLookupForm) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await onSubmit(data.name);
      handleClose();
    } catch {
      setErrorMessage('Unable to search by name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setErrorMessage(null);
    setIsLoading(false);
    reset();
    setIsOpen(true);
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
    setErrorMessage(null);
  };

  return (
    <>
      {variant === 'card' ? (
        <Button
          type="button"
          onClick={handleOpen}
          disabled={isLookupPending}
          variant="outline"
          size="md"
          className="w-full justify-center"
        >
          {isLookupPending ? 'Searching...' : 'Search by name'}
        </Button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={isLookupPending}
          className="text-sm text-muted underline transition hover:text-text disabled:opacity-60"
        >
          Don't have your ID? Search by your full name →
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={handleClose}
          >
            <div
              className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-heading text-lg font-semibold text-text">Find Your Profile</h2>
              <p className="mt-2 text-sm text-muted">
                Enter your registered full name to locate your profile.
              </p>

              <form className="mt-5 space-y-3" onSubmit={handleSubmit(handleFormSubmit)} noValidate>
                <div className="space-y-1">
                  <label
                    htmlFor="name-lookup-input"
                    className="block text-sm font-medium text-text"
                  >
                    Your Name
                  </label>
                  <input
                    id="name-lookup-input"
                    type="text"
                    autoComplete="off"
                    autoFocus
                    placeholder="Enter your registered full name"
                    disabled={isLoading}
                    {...register('name')}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  />
                  {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
                </div>

                {errorMessage && (
                  <div
                    className={`overflow-hidden transition-all duration-500 mt-3 max-h-40 opacity-100 translate-y-0`}
                  >
                    <div
                      role="alert"
                      aria-live="polite"
                      className="flex items-start gap-3 rounded-lg border-2 border-orange-700 bg-orange-200 px-4 py-3 text-orange-950 shadow-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-orange-700 text-sm font-bold text-white ring-1 ring-orange-900/30"
                      >
                        !
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-orange-950">Name not found</p>
                        <p className="text-sm text-orange-900">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    disabled={isLoading}
                    onClick={handleClose}
                    size="md"
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button disabled={isLoading} size="md" type="submit" variant="default">
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
