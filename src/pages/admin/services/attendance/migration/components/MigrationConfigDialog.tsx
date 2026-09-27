import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormInputField } from '@/components/ui/FormInputField';

export interface MigrationConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: MigrationConfig) => void;
}

export interface MigrationConfig {
  targetDate: string;
  walkinSheetName: string;
}

export function MigrationConfigDialog({ isOpen, onClose, onConfirm }: MigrationConfigDialogProps) {
  const [targetDate, setTargetDate] = useState('');
  const [walkinSheetName, setWalkinSheetName] = useState(
    import.meta.env.VITE_WALKIN_SHEET_NAME || 'Walkin',
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate) return;
    onConfirm({ targetDate, walkinSheetName });
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <Dialog.Header showCloseButton>
          <Dialog.Title>Configure Migration</Dialog.Title>
          <Dialog.Description>
            Specify the target Sunday date for this migration. If uploading an XLSX file, you can
            also specify the sheet name that contains walk-in data.
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body>
          <div className="space-y-4">
            <div>
              <label htmlFor="targetDate" className="mb-2 block text-sm font-medium">
                Target Date (Sunday)
              </label>
              <FormInputField
                id="targetDate"
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="walkinSheetName" className="mb-2 block text-sm font-medium">
                Walk-in Sheet Name (for XLSX)
              </label>
              <FormInputField
                id="walkinSheetName"
                type="text"
                value={walkinSheetName}
                onChange={(e) => setWalkinSheetName(e.target.value)}
                className="w-full"
                placeholder="e.g., Walkin"
              />
              <p className="mt-1 text-xs text-muted">
                Rows in this sheet will automatically be marked as walk-ins.
              </p>
            </div>
          </div>
        </Dialog.Body>

        <Dialog.Footer>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!targetDate}>
            Continue
          </Button>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
