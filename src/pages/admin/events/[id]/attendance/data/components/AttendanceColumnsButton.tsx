import { useState } from 'react';

import { Columns } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useIsMobileViewport } from '@/hooks/utils/useIsMobileViewport';
import type { DynamicFieldOption, DynamicFieldRef } from '@/lib/domain/attendance-views';

import { AttendanceViewFieldSelector } from './AttendanceViewFieldSelector';

type AttendanceColumnsButtonProps = {
  selectedFields: DynamicFieldRef[];
  registrationFieldOptions: DynamicFieldOption[];
  attendanceFieldOptions: DynamicFieldOption[];
  memberFieldOptions: DynamicFieldOption[];
  onToggleField: (token: string) => void;
};

export function AttendanceColumnsButton({
  selectedFields,
  registrationFieldOptions,
  attendanceFieldOptions,
  memberFieldOptions,
  onToggleField,
}: AttendanceColumnsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCount = selectedFields.length;
  const isMobile = useIsMobileViewport();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="Columns"
      >
        <Columns aria-hidden="true" className="h-4 w-4" aria-label="Columns" />
        {!isMobile && 'Columns'}
        {selectedCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs text-white leading-none">
            {selectedCount}
          </span>
        )}
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidthClass="max-w-2xl"
        title="Displayed Fields"
        description="Choose which registration, attendance, and member fields appear as table columns."
        showCloseIcon
        showCloseButton
      >
        <AttendanceViewFieldSelector
          selectedFields={selectedFields}
          registrationFieldOptions={registrationFieldOptions}
          attendanceFieldOptions={attendanceFieldOptions}
          memberFieldOptions={memberFieldOptions}
          onToggleField={onToggleField}
        />
      </Dialog>
    </>
  );
}
