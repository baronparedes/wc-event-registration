import { Trash2 } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import type { EventFieldFormValues } from '@/lib/domain/event-fields';

type OptionRoleAllotment = NonNullable<
  NonNullable<EventFieldFormValues['options']>[number]['role_allotments']
>[number];

type FieldOptionsCapacityEditorProps = {
  index: number;
  optionRoleAllotments: OptionRoleAllotment[];
  register: UseFormRegister<EventFieldFormValues>;
  errors: FieldErrors<EventFieldFormValues>;
  isCapacityLocked: boolean;
  onAddRoleAllotment: () => void;
  onRemoveRoleAllotment: (allotmentIndex: number) => void;
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

const ROLE_ALLOTMENTS_TOOLTIP =
  'Role matching is case-insensitive. Use * as a wildcard to match all roles (including public). Wildcard is universal and cannot be combined with other role allotments. When role allotments are set, max slots are derived from their total.';

/** Renders the role-allotment capacity editor for an option. */
export function FieldOptionsCapacityEditor({
  index,
  optionRoleAllotments,
  register,
  errors,
  isCapacityLocked,
  onAddRoleAllotment,
  onRemoveRoleAllotment,
}: FieldOptionsCapacityEditorProps) {
  const canAddRoleAllotments = !isCapacityLocked;
  const derivedSlotsTotal = optionRoleAllotments.reduce((sum, entry) => {
    const parsed = Number(entry.alloted_slots.trim());
    return Number.isInteger(parsed) && parsed > 0 ? sum + parsed : sum;
  }, 0);
  const hasRoleAllotments = optionRoleAllotments.length > 0;
  const hasWildcardAllotment = optionRoleAllotments.some((entry) => entry.role.trim() === '*');

  return (
    <div className="border-t border-border/70 pt-2">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Capacity</p>
      <p className="mb-2 text-xs text-muted">
        {hasRoleAllotments
          ? `Derived total from role allotments: ${derivedSlotsTotal}`
          : 'No role allotments configured. Capacity remains open.'}
      </p>

      <div className="mt-2 space-y-1.5 text-sm text-text">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted">
            Role allotments
            <span className="group relative inline-flex">
              <span
                tabIndex={0}
                role="img"
                className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border text-[10px] font-semibold leading-none text-muted transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Role allotments help"
              >
                ?
              </span>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-md border border-border bg-surface p-2 text-left text-[11px] leading-4 text-text opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              >
                {ROLE_ALLOTMENTS_TOOLTIP}
              </span>
            </span>
          </span>
          {!isCapacityLocked && (
            <button
              type="button"
              onClick={onAddRoleAllotment}
              disabled={!canAddRoleAllotments || hasWildcardAllotment}
              className="text-xs font-medium text-primary hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted"
            >
              + Add role
            </button>
          )}
        </div>

        {hasWildcardAllotment && (
          <p className="text-xs text-muted">
            Wildcard (*) is configured for this option. Remove it before adding other role
            allotments.
          </p>
        )}

        {!hasRoleAllotments && <p className="text-xs text-muted">No role allotments yet.</p>}

        {hasRoleAllotments && (
          <div className="overflow-hidden rounded-lg border border-border bg-surface/70">
            <ListTable density="dense" className="min-w-[420px] table-fixed text-left">
              <ListTableHead>
                <ListTableHeaderRow variant="plain">
                  <ListTableHeaderCell className="px-2">Role</ListTableHeaderCell>
                  <ListTableHeaderCell className="w-[150px] px-2">
                    Allotted slots
                  </ListTableHeaderCell>
                  {!isCapacityLocked && (
                    <ListTableHeaderCell className="w-[80px] px-2">Action</ListTableHeaderCell>
                  )}
                </ListTableHeaderRow>
              </ListTableHead>

              <ListTableBody divider="none">
                {optionRoleAllotments.map((_, allotmentIndex) => {
                  const roleError =
                    errors.options?.[index]?.role_allotments?.[allotmentIndex]?.role?.message;
                  const slotsError =
                    errors.options?.[index]?.role_allotments?.[allotmentIndex]?.alloted_slots
                      ?.message;
                  const allotedSlotsPath =
                    `options.${index}.role_allotments.${allotmentIndex}.alloted_slots` as const;

                  return (
                    <ListTableRow
                      key={`allotment-${index}-${allotmentIndex}`}
                      hover="none"
                      className="align-middle border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <ListTableCell className="px-2 py-1.5 text-center align-middle">
                        <input
                          {...register(`options.${index}.role_allotments.${allotmentIndex}.role`, {
                            validate: (value) => {
                              const trimmed = value.trim();
                              if (trimmed.length === 0) {
                                return 'Role is required.';
                              }

                              const normalized = trimmed.toLowerCase();
                              const hasOtherWildcard = optionRoleAllotments.some(
                                (entry, candidateIndex) =>
                                  candidateIndex !== allotmentIndex &&
                                  entry.role.trim().toLowerCase() === '*',
                              );
                              const hasOtherNamedRole = optionRoleAllotments.some(
                                (entry, candidateIndex) => {
                                  if (candidateIndex === allotmentIndex) {
                                    return false;
                                  }

                                  const candidateRole = entry.role.trim().toLowerCase();
                                  return candidateRole.length > 0 && candidateRole !== '*';
                                },
                              );

                              if (normalized === '*' && hasOtherNamedRole) {
                                return 'Wildcard (*) is universal. Remove other roles for this option.';
                              }

                              if (normalized !== '*' && hasOtherWildcard) {
                                return 'Wildcard (*) is already configured for this option.';
                              }

                              return true;
                            },
                          })}
                          disabled={isCapacityLocked}
                          placeholder="e.g., Prayer Coach or *"
                          aria-label={`Option ${index + 1} role allotment ${allotmentIndex + 1} role`}
                          className={`${inputClass} ${roleError ? 'border-red-400' : ''}`}
                        />
                        {roleError && (
                          <p className="pt-0.5 text-xs leading-4 text-red-600">{roleError}</p>
                        )}
                      </ListTableCell>

                      <ListTableCell className="px-2 py-1.5 text-center align-middle">
                        <input
                          {...register(allotedSlotsPath, {
                            validate: (value) => {
                              const trimmed = value.trim();
                              const parsed = Number(trimmed);
                              if (!trimmed || !Number.isInteger(parsed) || parsed <= 0) {
                                return 'Enter a whole number greater than 0.';
                              }

                              return true;
                            },
                          })}
                          disabled={isCapacityLocked}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g., 10"
                          aria-label={`Option ${index + 1} role allotment ${allotmentIndex + 1} slots`}
                          className={`${inputClass} ${slotsError ? 'border-red-400' : ''}`}
                        />
                        {slotsError && (
                          <p className="pt-0.5 text-xs leading-4 text-red-600">{slotsError}</p>
                        )}
                      </ListTableCell>

                      {!isCapacityLocked && (
                        <ListTableCell className="px-2 py-1.5 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => onRemoveRoleAllotment(allotmentIndex)}
                            aria-label={`Remove role allotment ${allotmentIndex + 1}`}
                            title="Remove role allotment"
                            className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </ListTableCell>
                      )}
                    </ListTableRow>
                  );
                })}
              </ListTableBody>
            </ListTable>
          </div>
        )}
      </div>
    </div>
  );
}
