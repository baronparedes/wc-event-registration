import { useState } from 'react';

import { ClipboardList, Edit, FormInput, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { toRoute } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { formatDateOnly } from '@/lib/infrastructure';

import { FormDuplicatePolicyLabel } from './FormDuplicatePolicyLabel';
import { FormStatusBadge } from './FormStatusBadge';

type MobileFormCardProps = {
  form: AdminForm;
  canWrite: boolean;
  canRead: boolean;
};

export function MobileFormCard({ form, canWrite, canRead }: MobileFormCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <article className="relative rounded-xl border border-border/60 bg-background shadow-sm">
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-text">
              {form.title}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">{form.slug}</p>
          </div>
          <FormStatusBadge status={form.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-2.5 sm:grid-cols-3 sm:gap-0">
          <div className="pr-0 sm:pr-2">
            <dt className="text-xs text-muted">Created</dt>
            <dd className="mt-0.5 text-sm font-medium text-text">
              {formatDateOnly(form.created_at)}
            </dd>
          </div>
          <div className="px-0 sm:px-2">
            <dt className="text-xs text-muted">Audience</dt>
            <dd className="mt-0.5 truncate text-sm font-medium capitalize text-text">
              {form.audience.replace(/_/g, ' ')}
            </dd>
          </div>
          <div className="col-span-2 pl-0 sm:col-span-1 sm:pl-2">
            <dt className="text-xs text-muted">Policy</dt>
            <dd className="mt-0.5 truncate text-sm font-medium text-text">
              <FormDuplicatePolicyLabel policy={form.duplicate_policy} />
            </dd>
          </div>
        </dl>
      </div>

      <div
        className={`flex divide-x divide-border border-t border-border bg-surface ${
          canWrite ? 'rounded-b-xl' : 'rounded-b-lg'
        }`}
      >
        {canWrite && (
          <ActionLink
            to={toRoute('adminFormDetail', { id: form.id })}
            title="Edit form"
            aria-label={`Edit ${form.title}`}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-bl-xl text-sm font-medium text-primary no-underline hover:bg-primary/10"
          >
            <Edit className="h-4 w-4" />
            Edit
          </ActionLink>
        )}
        {canRead && (
          <ActionLink
            to={toRoute('adminFormSubmissions', { id: form.id })}
            title="View submissions"
            aria-label={`View submissions for ${form.title}`}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 bg-primary text-sm font-semibold text-white no-underline shadow-sm hover:bg-primary/90 hover:shadow-md ${
              canWrite ? '' : 'rounded-bl-lg'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Submissions
          </ActionLink>
        )}
        {(canWrite || canRead) && (
          <DropdownMenu
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            trigger={
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
                className={`flex min-h-11 w-12 items-center justify-center text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30 ${
                  canWrite ? 'rounded-br-xl' : 'rounded-br-lg'
                }`}
                aria-label={`More actions for ${form.title}`}
                title="More actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            }
          >
            {canWrite && (
              <DropdownMenuItem to={toRoute('adminFormFields', { id: form.id })}>
                <span className="flex items-center gap-2">
                  <FormInput className="h-4 w-4" />
                  Form fields
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        )}
      </div>
    </article>
  );
}
