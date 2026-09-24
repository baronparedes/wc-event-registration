import { useState } from 'react';

import { ClipboardList, Copy, Edit, FormInput, MoreHorizontal } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuItem,
  MobileCard,
  MobileCardActionLink,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';
import { toRoute } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { formatDateOnly } from '@/lib/infrastructure';

import { FormDuplicatePolicyLabel } from './FormDuplicatePolicyLabel';
import { FormStatusBadge } from './FormStatusBadge';

type MobileFormCardProps = {
  form: AdminForm;
  canWrite: boolean;
  canRead: boolean;
  onDuplicateClick?: (form: AdminForm) => void;
};

export function MobileFormCard({ form, canWrite, canRead, onDuplicateClick }: MobileFormCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <MobileCard>
      <MobileCardBody>
        <MobileCardHeader>
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-text">
              {form.title}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">{form.slug}</p>
          </div>
          <FormStatusBadge status={form.status} />
        </MobileCardHeader>

        <MobileCardDivider />

        <MobileCardContent>
          <MobileCardContentItem label="Created" value={formatDateOnly(form.created_at)} />
          <MobileCardContentItem
            label="Audience"
            value={form.audience.replace(/_/g, ' ')}
            valueClassName="mt-0.5 truncate text-sm font-medium capitalize text-text"
          />
          <MobileCardContentItem label="Policy" colSpan={2}>
            <FormDuplicatePolicyLabel policy={form.duplicate_policy} />
          </MobileCardContentItem>
        </MobileCardContent>
      </MobileCardBody>

      <MobileCardActions>
        {canWrite && (
          <MobileCardActionLink
            to={toRoute('adminFormDetail', { id: form.id })}
            title="Edit form"
            aria-label={`Edit ${form.title}`}
            variant="primaryOutline"
          >
            <Edit className="h-4 w-4" />
            Edit
          </MobileCardActionLink>
        )}
        {canRead && (
          <MobileCardActionLink
            to={toRoute('adminFormSubmissions', { id: form.id })}
            title="View submissions"
            aria-label={`View submissions for ${form.title}`}
          >
            <ClipboardList className="h-4 w-4" />
            Submissions
          </MobileCardActionLink>
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
                className="flex min-h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30"
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
            {canWrite && onDuplicateClick && (
              <DropdownMenuItem
                onClick={() => {
                  onDuplicateClick(form);
                  setIsMenuOpen(false);
                }}
              >
                <span className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicate
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        )}
      </MobileCardActions>
    </MobileCard>
  );
}
