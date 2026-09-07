import { ClipboardList, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AppShell } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import { toRoute } from '@/config/constants';
import { usePublicFormsQuery } from '@/hooks/domain/forms';

export function PublicFormsDirectoryPage() {
  const { data: forms, isLoading, error } = usePublicFormsQuery();

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 py-6">
        <div>
          <h1 className="text-2xl font-bold text-text sm:text-3xl">Active Forms</h1>
          <p className="mt-1 text-sm text-muted">
            Submit requests, area reservations, and custom form submissions.
          </p>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-2 text-sm text-muted">Loading available forms...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Failed to load available forms. Please try again later.
          </div>
        )}

        {!isLoading && !error && forms?.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No active forms"
              description="There are currently no active forms available for submission."
            />
          </div>
        )}

        {!isLoading && !error && forms && forms.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {forms.map((form) => (
              <div
                key={form.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition hover:border-accent hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent capitalize">
                      {form.audience}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text">{form.title}</h3>
                  {form.description && (
                    <p className="text-sm text-muted line-clamp-2">{form.description}</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                  <Button asChild variant="default" size="sm">
                    <Link to={toRoute('formSubmit', { slug: form.slug })}>
                      Open Form <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
