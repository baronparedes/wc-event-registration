import { Navigate, useParams, useSearchParams } from 'react-router-dom';

import { ROUTE_PATHS, toAdminEventRegistrations } from '@/config/constants';
import { useRegistrationNamesQuery } from '@/hooks/domain/registrations';
import {
  REGISTRATION_SHARE_FIELDS,
  REGISTRATION_SHARE_FIELD_LABELS,
  type RegistrationShareField,
  formatRegistrationShareFieldValue,
} from '@/lib/domain/registrations';

export function AdminRegistrationNamesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const rawFields = searchParams.get('fields') ?? '';
  const rawAnswerFields = searchParams.get('answerFields') ?? '';

  const selectedFields = rawFields
    .split(',')
    .filter(Boolean)
    .filter((f): f is RegistrationShareField =>
      (REGISTRATION_SHARE_FIELDS as readonly string[]).includes(f),
    );

  const selectedAnswerFieldIds = rawAnswerFields.split(',').filter(Boolean);

  const hasValidSetup = !!eventId && selectedFields.length > 0;

  const namesQuery = useRegistrationNamesQuery(eventId ?? '', { enabled: hasValidSetup });

  if (!hasValidSetup) {
    return (
      <Navigate
        replace
        to={eventId ? toAdminEventRegistrations(eventId) : ROUTE_PATHS.adminEvents}
      />
    );
  }

  const payload = namesQuery.data;

  const answerFieldMap = new Map(
    (payload?.answer_fields ?? []).map((field) => [field.field_id, field.label]),
  );

  const sortedRows = [...(payload?.rows ?? [])].sort((a, b) =>
    a.full_name.trim().localeCompare(b.full_name.trim(), undefined, { sensitivity: 'base' }),
  );

  const visibleAnswerFields = selectedAnswerFieldIds.filter((id) => answerFieldMap.has(id));

  return (
    <div className="min-h-screen bg-white font-body">
      <style>{`@page { margin: 1.5cm; }`}</style>

      <div className="mx-auto max-w-5xl px-8 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text">Registration Names</h1>
            {payload && (
              <p className="mt-1 text-sm text-muted">
                {payload.event_title} &bull; {payload.row_count}{' '}
                {payload.row_count === 1 ? 'registrant' : 'registrants'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden shrink-0 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text shadow-xs transition hover:bg-background"
          >
            Print / Save as PDF
          </button>
        </div>

        {namesQuery.isLoading && <p className="text-sm text-muted">Loading registrations...</p>}

        {namesQuery.isError && (
          <p className="text-sm text-red-600">
            Failed to load registrations. Please close this tab and try again.
          </p>
        )}

        {payload && sortedRows.length === 0 && (
          <p className="text-sm text-muted">No registrations found for this event.</p>
        )}

        {sortedRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-text">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="py-2 pr-4 text-left font-semibold text-muted w-10">#</th>
                  {selectedFields.map((field) => (
                    <th key={field} className="py-2 pr-4 text-left font-semibold text-muted">
                      {REGISTRATION_SHARE_FIELD_LABELS[field]}
                    </th>
                  ))}
                  {visibleAnswerFields.map((fieldId) => (
                    <th key={fieldId} className="py-2 pr-4 text-left font-semibold text-muted">
                      {answerFieldMap.get(fieldId)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={row.full_name + index} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-muted tabular-nums">{index + 1}</td>
                    {selectedFields.map((field) => (
                      <td key={field} className="py-2 pr-4">
                        {formatRegistrationShareFieldValue(field, row[field]) || (
                          <span className="text-muted/50">—</span>
                        )}
                      </td>
                    ))}
                    {visibleAnswerFields.map((fieldId) => (
                      <td key={fieldId} className="py-2 pr-4">
                        {row.answer_values[fieldId] || <span className="text-muted/50">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
