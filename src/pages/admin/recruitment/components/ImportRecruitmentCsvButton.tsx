import { useState } from 'react';

import { Upload } from 'lucide-react';

import { Button } from '@/components/ui';

import { ImportRecruitmentCsvDialog } from './dialog/ImportRecruitmentCsvDialog';

export interface ImportRecruitmentCsvButtonProps {
  disabled?: boolean;
}

export function ImportRecruitmentCsvButton({ disabled = false }: ImportRecruitmentCsvButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="primaryOutline"
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        className="w-full sm:w-auto"
      >
        <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
        Import Legacy CSV
      </Button>

      {isDialogOpen && (
        <ImportRecruitmentCsvDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
      )}
    </>
  );
}
