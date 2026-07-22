import { useState } from 'react';

import { Columns, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { DynamicFieldOption, DynamicFieldRef } from '@/lib/domain/attendance-views';

import { AttendanceViewFieldSelector } from './AttendanceViewFieldSelector';

type AttendanceColumnsButtonProps = {
  selectedFields: DynamicFieldRef[];
  registrationFieldOptions: DynamicFieldOption[];
  attendanceFieldOptions: DynamicFieldOption[];
  onToggleField: (token: string) => void;
};

export function AttendanceColumnsButton({
  selectedFields,
  registrationFieldOptions,
  attendanceFieldOptions,
  onToggleField,
}: AttendanceColumnsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selectedFields.length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="Columns"
      >
        <Columns aria-hidden="true" className="h-4 w-4" />
        Columns
        {selectedCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white leading-none">
            {selectedCount}
          </span>
        )}
      </Button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} maxWidthClass="max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-text">Displayed Fields</h2>
            <p className="mt-0.5 text-xs text-muted">
              Choose which registration and attendance fields appear as table columns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close columns dialog"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <AttendanceViewFieldSelector
          selectedFields={selectedFields}
          registrationFieldOptions={registrationFieldOptions}
          attendanceFieldOptions={attendanceFieldOptions}
          onToggleField={onToggleField}
        />

        <div className="flex justify-end border-t border-border pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}
