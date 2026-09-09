import { useState } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminFormQuery, useFormSubmissionsQuery } from '@/hooks/domain/forms';
import type { FormSubmission } from '@/lib/domain/forms';
import { formatDateOnly } from '@/lib/infrastructure';

export function AdminFormSubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: form, isLoading: formLoading } = useAdminFormQuery(id);
  const { data: submissions, isLoading: submissionsLoading } = useFormSubmissionsQuery(id);

  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  const isLoading = formLoading || submissionsLoading;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Forms', to: ROUTE_PATHS.adminForms },
          { label: form?.title ?? 'Form', to: id ? toRoute('adminFormDetail', { id }) : undefined },
          { label: 'Submissions' },
        ]}
        title="Form Submissions"
        description={form ? `Submissions submitted for ${form.title}` : 'Manage form submissions'}
      />

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading submissions...">
        {!form ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Form not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminForms}>
              Back to forms
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-border bg-surface">
                {submissions?.length === 0 ? (
                  <div className="p-8 text-center text-muted text-sm">
                    No submissions recorded yet for this form.
                  </div>
                ) : (
                  <ListTable>
                    <ListTableHead>
                      <ListTableHeaderRow>
                        <ListTableHeaderCell className="px-6">Respondent</ListTableHeaderCell>
                        <ListTableHeaderCell>Source</ListTableHeaderCell>
                        <ListTableHeaderCell>Submitted At</ListTableHeaderCell>
                        <ListTableHeaderCell>Actions</ListTableHeaderCell>
                      </ListTableHeaderRow>
                    </ListTableHead>
                    <ListTableBody>
                      {submissions?.map((sub) => {
                        const respondentName =
                          sub.users?.full_name ||
                          [
                            sub.public_registrant_info?.first_name,
                            sub.public_registrant_info?.last_name,
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                          'Anonymous';

                        const respondentDetail =
                          sub.users?.member_id || sub.public_registrant_info?.email || '';

                        return (
                          <ListTableRow
                            key={sub.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedSubmission(sub)}
                          >
                            <ListTableCell className="px-6">
                              <p className="font-medium text-text">{respondentName}</p>
                              {respondentDetail && (
                                <p className="text-xs text-muted mt-0.5">{respondentDetail}</p>
                              )}
                            </ListTableCell>
                            <ListTableCell>
                              <span className="text-sm text-text capitalize">{sub.source}</span>
                            </ListTableCell>
                            <ListTableCell>
                              <span className="text-sm text-text">
                                {formatDateOnly(sub.submitted_at)}
                              </span>
                            </ListTableCell>
                            <ListTableCell>
                              <Button
                                size="sm"
                                variant="primaryOutline"
                                onClick={() => setSelectedSubmission(sub)}
                              >
                                View Answers
                              </Button>
                            </ListTableCell>
                          </ListTableRow>
                        );
                      })}
                    </ListTableBody>
                  </ListTable>
                )}
              </div>
            </div>

            {selectedSubmission && (
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text">Submission Details</h3>
                  <Button
                    size="sm"
                    variant="primaryOutline"
                    onClick={() => setSelectedSubmission(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className="space-y-2 text-xs border-b border-border pb-4 text-muted">
                  <p>
                    <strong className="text-text">Submitted:</strong>{' '}
                    {formatDateOnly(selectedSubmission.submitted_at)}
                  </p>
                  <p>
                    <strong className="text-text">Source:</strong> {selectedSubmission.source}
                  </p>
                  {selectedSubmission.users && (
                    <p>
                      <strong className="text-text">Member:</strong>{' '}
                      {selectedSubmission.users.full_name} ({selectedSubmission.users.member_id})
                    </p>
                  )}
                  {selectedSubmission.public_registrant_info?.email && (
                    <p>
                      <strong className="text-text">Email:</strong>{' '}
                      {selectedSubmission.public_registrant_info.email}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text">Answers:</h4>
                  {selectedSubmission.form_submission_answers?.length === 0 ? (
                    <p className="text-xs text-muted">No answers captured.</p>
                  ) : (
                    selectedSubmission.form_submission_answers?.map((ans) => (
                      <div
                        key={ans.id}
                        className="rounded-xl border border-border bg-background p-3 space-y-1"
                      >
                        <p className="text-xs font-semibold text-text">
                          {ans.form_fields?.label || ans.form_fields?.field_key}
                        </p>
                        <p className="text-xs text-text">
                          {ans.answer_text ||
                            ans.answer_number ||
                            (ans.answer_boolean !== null ? String(ans.answer_boolean) : '') ||
                            (ans.answer_json ? JSON.stringify(ans.answer_json) : '—')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
