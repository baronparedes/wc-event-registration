import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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

const DEFAULT_SHEETS: MigrationSheetConfig[] = [
  { name: 'Comm_Attend', isWalkIn: false },
  { name: 'OIC_Attend', isWalkIn: false },
  { name: 'Walkin_Attend', isWalkIn: true },
];

function isSundayDate(dateString: string): boolean {
  if (!dateString) return false;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some((p) => isNaN(p))) return false;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
}

const migrationConfigSchema = z.object({
  targetDate: z
    .string()
    .min(1, 'Target date is required')
    .refine(isSundayDate, { message: 'Target date must be a Sunday.' }),
  sheets: z.array(
    z.object({
      name: z.string(),
      isWalkIn: z.boolean(),
    }),
  ),
});

export type MigrationConfigFormValues = z.infer<typeof migrationConfigSchema>;

export function MigrationConfigDialog({ isOpen, onClose, onConfirm }: MigrationConfigDialogProps) {
  const {
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<MigrationConfigFormValues>({
    resolver: zodResolver(migrationConfigSchema),
    defaultValues: {
      targetDate: '',
      sheets: DEFAULT_SHEETS,
    },
    mode: 'onChange',
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'sheets',
  });

  const targetDate = useWatch({ control, name: 'targetDate' });
  const watchedSheets = useWatch({ control, name: 'sheets' });

  const isDateValid = Boolean(targetDate && isSundayDate(targetDate));
  const dateError =
    targetDate && !isDateValid ? 'Target date must be a Sunday.' : errors.targetDate?.message;

  const validSheets = (watchedSheets ?? [])
    .filter((s) => s?.name?.trim().length > 0)
    .map((s) => ({ name: s.name.trim(), isWalkIn: Boolean(s.isWalkIn) }));

  const canSubmit = isDateValid && validSheets.length > 0;

  const handleAddSheet = () => {
    append({ name: '', isWalkIn: false });
  };

  const handleResetDefaults = () => {
    replace(DEFAULT_SHEETS);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDateValid || validSheets.length === 0) return;
    onConfirm({ targetDate, sheets: validSheets });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="xl">
      <form onSubmit={handleFormSubmit}>
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
                registration={register('targetDate')}
                error={targetDate ? dateError : undefined}
                className="w-full"
              />
            </div>

            <div className="border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  XLSX Sheets to Process
                </p>
                <div className="flex items-center gap-3">
                  {fields.length === 0 && (
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

              {fields.length === 0 ? (
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
                  {fields.map((field, index) => {
                    const sheetName = watchedSheets?.[index]?.name ?? '';
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 rounded-md border border-border/70 bg-card/40 p-2"
                      >
                        <div className="flex-1">
                          <FormInputField
                            type="text"
                            registration={register(`sheets.${index}.name`)}
                            placeholder={`Sheet name ${index + 1}`}
                            className="w-full text-sm"
                            ariaLabel={`Sheet name ${index + 1}`}
                          />
                        </div>
                        <label className="flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap px-1 text-xs font-medium text-text">
                          <input
                            type="checkbox"
                            {...register(`sheets.${index}.isWalkIn`)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                          />
                          <span>Walk-in</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          aria-label={`Remove sheet ${sheetName || index + 1}`}
                          className="shrink-0 text-muted hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}

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
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            Select File
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
