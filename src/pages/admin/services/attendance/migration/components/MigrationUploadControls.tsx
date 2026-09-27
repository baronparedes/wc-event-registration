import { type ChangeEvent, useRef, useState } from 'react';

import { Loader2, UploadCloud } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { FormSelectField } from '@/components/ui/FormSelectField';

import { type MigrationConfig, MigrationConfigDialog } from './MigrationConfigDialog';

export interface FileChangeData extends MigrationConfig {
  file: File;
}

interface MigrationUploadControlsProps {
  layouts: Array<{ id: string; description: string }> | undefined;
  selectedLayoutId: string;
  onSelectLayoutId: (layoutId: string) => void;
  fileInputKey: number;
  onFileChange: (data: FileChangeData) => void;
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
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const layoutOptions = (layouts ?? []).map((l) => ({
    value: l.id,
    label: l.description,
  }));

  const handleConfigConfirm = (config: MigrationConfig) => {
    setMigrationConfig(config);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNativeFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && migrationConfig) {
      onFileChange({ file, ...migrationConfig });
    }
  };

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
        <label className="mb-2 block text-sm font-medium">2. Upload File (.csv, .xlsx)</label>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsConfigDialogOpen(true)}
          disabled={!selectedLayoutId || isProcessing}
          className="w-full max-w-sm justify-center gap-2"
        >
          <UploadCloud className="h-4 w-4" />
          Select File...
        </Button>
        <input
          ref={fileInputRef}
          id="file-upload"
          key={fileInputKey}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleNativeFileChange}
          className="hidden"
        />
        {isProcessing && (
          <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>
              {isParsingCsv
                ? 'Parsing and validating file...'
                : 'Looking up member details and seat assignments...'}
            </span>
          </div>
        )}
      </div>

      <MigrationConfigDialog
        isOpen={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        onConfirm={handleConfigConfirm}
      />
    </>
  );
}
