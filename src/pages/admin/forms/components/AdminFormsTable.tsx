import { ClipboardList, FormInput, Settings } from 'lucide-react';

import { ActionLink } from '@/components/ui/ActionLink';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { toRoute } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { formatDateOnly } from '@/lib/infrastructure';

import { FormDuplicatePolicyLabel } from './FormDuplicatePolicyLabel';
import { FormStatusBadge } from './FormStatusBadge';

type AdminFormsTableProps = {
  forms: AdminForm[];
  canWrite: boolean;
  canRead: boolean;
  onFormSelect: (formId: string) => void;
};

export function AdminFormsTable({ forms, canWrite, canRead, onFormSelect }: AdminFormsTableProps) {
  return (
    <div>
      <ListTable>
        <ListTableHead>
          <ListTableHeaderRow>
            <ListTableHeaderCell className="px-6">Form Title</ListTableHeaderCell>
            <ListTableHeaderCell>Audience</ListTableHeaderCell>
            <ListTableHeaderCell>Duplicate Policy</ListTableHeaderCell>
            <ListTableHeaderCell>Status</ListTableHeaderCell>
            <ListTableHeaderCell>Created</ListTableHeaderCell>
            <ListTableHeaderCell>Actions</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody>
          {forms.map((form) => (
            <ListTableRow
              key={form.id}
              className={canWrite ? 'cursor-pointer' : undefined}
              onClick={canWrite ? () => onFormSelect(form.id) : undefined}
            >
              <ListTableCell className="px-6">
                <p className="font-medium text-text">{form.title}</p>
                <p className="mt-0.5 text-xs text-muted">{form.slug}</p>
              </ListTableCell>
              <ListTableCell>
                <span className="text-sm text-text capitalize">
                  {form.audience.replace(/_/g, ' ')}
                </span>
              </ListTableCell>
              <ListTableCell>
                <FormDuplicatePolicyLabel policy={form.duplicate_policy} />
              </ListTableCell>
              <ListTableCell>
                <FormStatusBadge status={form.status} />
              </ListTableCell>
              <ListTableCell>
                <span className="text-sm text-text">{formatDateOnly(form.created_at)}</span>
              </ListTableCell>
              <ListTableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  {canWrite && (
                    <ActionLink
                      to={toRoute('adminFormDetail', { id: form.id })}
                      title="Edit Form"
                      aria-label="Edit Form"
                    >
                      <Settings className="h-5 w-5" />
                    </ActionLink>
                  )}
                  {canWrite && (
                    <ActionLink
                      to={toRoute('adminFormFields', { id: form.id })}
                      title="Form Fields"
                      aria-label="Form Fields"
                    >
                      <FormInput className="h-5 w-5" />
                    </ActionLink>
                  )}
                  {canRead && (
                    <ActionLink
                      to={toRoute('adminFormSubmissions', { id: form.id })}
                      title="Submissions"
                      aria-label="Submissions"
                    >
                      <ClipboardList className="h-5 w-5" />
                    </ActionLink>
                  )}
                </div>
              </ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>
    </div>
  );
}
