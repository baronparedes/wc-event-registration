import { useState } from 'react';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormInputField } from '@/components/ui/FormInputField';

export interface MigrationSheetConfig {
  name: string;
  isWalkIn: boolean;
}

export interface MigrationConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: MigrationConfig) => void;
}

export interface MigrationConfig {
  targetDate: string;
  sheets: MigrationSheetConfig[];
}

interface InternalSheetItem {
  id: string;
  name: string;
  isWalkIn: boolean;
}

const DEFAULT_SHEETS: InternalSheetItem[] = [
  { id: '1', name: 'Comm_Attend', isWalkIn: false },
  { id: '2', name: 'OIC_Attend', isWalkIn: false },
  { id: '3', name: 'Walkin_Attend', isWalkIn: true },
];

function isSundayDate(dateString: string): boolean {
  if (!dateString) return false;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return false;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
}

export function MigrationConfigDialog({ isOpen, onClose, onConfirm }: MigrationConfigDialogProps) {
  const [targetDate, setTargetDate] = useState('');
  const [sheets, setSheets] = useState<InternalSheetItem[]>(DEFAULT_SHEETS);

  const isDateValid = Boolean(targetDate && isSundayDate(targetDate));
  const dateError = targetDate && !isDateValid ? 'Target date must be a Sunday.' : undefined;

  const handleSheetNameChange = (id: string, name: string) => {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleSheetWalkInChange = (id: string, isWalkIn: boolean) => {
    setSheets((prev) => prev.map((s) => (s.id === id ? { ...s, isWalkIn } : s)));
  };

  const handleAddSheet = () => {
    setSheets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        isWalkIn: false,
      },
    ]);
  };

  const handleRemoveSheet = (id: string) => {
    setSheets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleResetDefaults = () => {
    setSheets(DEFAULT_SHEETS);
  };

  const validSheets = sheets
    .filter((s) => s.name.trim().length > 0)
    .map((s) => ({ name: s.name.trim(), isWalkIn: s.isWalkIn }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDateValid || validSheets.length === 0) return;
    onConfirm({ targetDate, sheets: validSheets });
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <Dialog.Header showCloseButton>
          <Dialog.Title>Configure Migration</Dialog.Title>
          <Dialog.Description>
            Specify the target Sunday date and customize the XLSX sheet names to process.
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body>
          <div className="space-y-4">
            <div>
              <FormInputField
                id="targetDate"
                label="Target Date (Sunday)"
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                error={dateError}
                className="w-full"
              />
            </div>

            <div className="border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  XLSX Sheets to Process
                </p>
                <div className="flex items-center gap-3">
                  {sheets.length === 0 && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={handleResetDefaults}
                      className="h-auto min-h-0 p-0 text-xs font-medium text-muted hover:text-text"
                    >
                      Reset Defaults
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleAddSheet}
                    className="h-auto min-h-0 p-0 text-xs font-medium text-primary gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Sheet
                  </Button>
                </div>
              </div>

              {sheets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted">No sheets configured.</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleAddSheet}
                    className="mt-2 h-auto min-h-0 p-0 gap-1 text-xs font-medium text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Sheet
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sheets.map((sheet, index) => (
                    <div
                      key={sheet.id}
                      className="flex items-center gap-2 rounded-md border border-border/70 bg-card/40 p-2"
                    >
                      <div className="flex-1">
                        <FormInputField
                          type="text"
                          value={sheet.name}
                          onChange={(e) => handleSheetNameChange(sheet.id, e.target.value)}
                          placeholder={`Sheet name ${index + 1}`}
                          className="w-full text-sm"
                          aria-label={`Sheet name ${index + 1}`}
                        />
                      </div>
                      <label className="flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap px-1 text-xs font-medium text-text">
                        <input
                          type="checkbox"
                          checked={sheet.isWalkIn}
                          onChange={(e) => handleSheetWalkInChange(sheet.id, e.target.checked)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                        />
                        <span>Walk-in</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSheet(sheet.id)}
                        aria-label={`Remove sheet ${sheet.name || index + 1}`}
                        className="shrink-0 text-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="pt-1">
                    <p className="text-[11px] text-muted">
                      Walk-in checked sheets will automatically set isWalkIn = true.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isDateValid || validSheets.length === 0}>
            Select File
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
