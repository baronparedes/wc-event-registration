import type { ChangeEvent } from 'react';

import { Loader2 } from 'lucide-react';

import { FormSelectField } from '@/components/ui/FormSelectField';

interface MigrationUploadControlsProps {
  layouts: Array<{ id: string; description: string }> | undefined;
  selectedLayoutId: string;
  onSelectLayoutId: (layoutId: string) => void;
  fileInputKey: number;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  isParsingCsv: boolean;
}

export function MigrationUploadControls({
  layouts,
  selectedLayoutId,
  onSelectLayoutId,
  fileInputKey,
  onFileChange,
  isProcessing,
  isParsingCsv,
}: MigrationUploadControlsProps) {
  const layoutOptions = (layouts ?? []).map((l) => ({
    value: l.id,
    label: l.description,
  }));

  return (
    <>
      <div className="mb-6 max-w-sm">
        <label className="mb-2 block text-sm font-medium">1. Select Layout for Migration</label>
        <FormSelectField
          id="layout-select"
          value={selectedLayoutId}
          onChange={onSelectLayoutId}
          placeholder="Select a layout..."
          options={layoutOptions}
        />
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">2. Upload CSV File</label>
        <input
          id="csv-upload"
          key={fileInputKey}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          disabled={!selectedLayoutId || isProcessing}
          className="block w-full max-w-sm text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-surface-elevated file:px-4 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-surface-elevated-hover focus:outline-none disabled:opacity-50"
        />
        {isProcessing && (
          <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>
              {isParsingCsv
                ? 'Parsing and validating CSV file...'
                : 'Looking up member details and seat assignments...'}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
