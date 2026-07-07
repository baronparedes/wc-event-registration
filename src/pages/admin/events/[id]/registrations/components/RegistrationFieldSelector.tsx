import { Col } from '@/components/ui/Grid';
import { Grid } from '@/components/ui/Grid';
import {
  REGISTRATION_SHARE_FIELDS,
  REGISTRATION_SHARE_FIELD_LABELS,
  type RegistrationShareAnswerField,
  type RegistrationShareField,
} from '@/lib/domain/registrations';

interface RegistrationFieldSelectorProps {
  introText: string;
  footerText: string;
  selectedFields: RegistrationShareField[];
  selectedAnswerFieldIds: string[];
  dynamicFieldSearch: string;
  answerFieldOptions: RegistrationShareAnswerField[];
  filteredAnswerFieldOptions: RegistrationShareAnswerField[];
  isFetching: boolean;
  onToggleField: (field: RegistrationShareField) => void;
  onToggleAnswerField: (fieldId: string) => void;
  onDynamicFieldSearchChange: (value: string) => void;
}

export function RegistrationFieldSelector({
  introText,
  footerText,
  selectedFields,
  selectedAnswerFieldIds,
  dynamicFieldSearch,
  answerFieldOptions,
  filteredAnswerFieldOptions,
  isFetching,
  onToggleField,
  onToggleAnswerField,
  onDynamicFieldSearchChange,
}: RegistrationFieldSelectorProps) {
  return (
    <div className="space-y-3">
      <p>{introText}</p>

      <div className="space-y-3">
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold text-text">Core fields</p>
          <Grid base={1} md={3} gapClassName="gap-x-2 gap-y-3">
            {REGISTRATION_SHARE_FIELDS.map((field) => (
              <Col key={field}>
                <label className="flex min-w-0 items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field)}
                    onChange={() => onToggleField(field)}
                    className="!h-4 !w-4 min-h-0 shrink-0 self-start rounded border-border p-0 m-0 text-primary focus:ring-primary/40"
                  />
                  <span className="min-w-0 break-words leading-4">
                    {REGISTRATION_SHARE_FIELD_LABELS[field]}
                  </span>
                </label>
              </Col>
            ))}
          </Grid>
        </div>

        {answerFieldOptions.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">Dynamic fields</p>
              <span className="text-xs text-muted">{selectedAnswerFieldIds.length} selected</span>
            </div>

            <input
              type="search"
              value={dynamicFieldSearch}
              onChange={(event) => onDynamicFieldSearchChange(event.target.value)}
              placeholder="Search dynamic fields"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />

            <div className="max-h-64 overflow-y-auto pr-1">
              {filteredAnswerFieldOptions.length > 0 ? (
                <Grid base={1} md={3} gapClassName="gap-x-2 gap-y-3">
                  {filteredAnswerFieldOptions.map((field) => (
                    <Col key={field.field_id}>
                      <label className="flex min-w-0 items-center gap-2 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={selectedAnswerFieldIds.includes(field.field_id)}
                          onChange={() => onToggleAnswerField(field.field_id)}
                          className="!h-4 !w-4 min-h-0 shrink-0 self-start rounded border-border p-0 m-0 text-primary focus:ring-primary/40"
                        />
                        <span className="min-w-0 break-words leading-4">{field.label}</span>
                      </label>
                    </Col>
                  ))}
                </Grid>
              ) : (
                <p className="text-xs text-muted">No dynamic fields match your search.</p>
              )}
            </div>
          </div>
        ) : isFetching ? (
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">Loading event answer fields...</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">
              No event answer fields are available for this event.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">{footerText}</p>
    </div>
  );
}
