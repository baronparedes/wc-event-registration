import { useState } from 'react';

import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import type { FormSubmission } from '@/lib/domain/forms';

interface ExportSubmissionsButtonProps {
  submissions: FormSubmission[];
  formTitle?: string;
  formSlug?: string;
  disabled?: boolean;
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function formatAnswerCsv(ans: {
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
}): string {
  if (ans.answer_text !== null && ans.answer_text !== undefined) {
    return ans.answer_text;
  }
  if (ans.answer_number !== null && ans.answer_number !== undefined) {
    return String(ans.answer_number);
  }
  if (ans.answer_boolean !== null && ans.answer_boolean !== undefined) {
    return ans.answer_boolean ? 'Yes' : 'No';
  }
  if (ans.answer_date) {
    return ans.answer_date;
  }
  if (ans.answer_json !== null && ans.answer_json !== undefined) {
    if (Array.isArray(ans.answer_json)) {
      return ans.answer_json.join(', ');
    }
    return JSON.stringify(ans.answer_json);
  }
  return '';
}

function buildSubmissionsCsv(
  submissions: FormSubmission[],
  formSlug?: string,
  formTitle?: string,
): { csvContent: string; filename: string } {
  // Collect all unique fields across submissions
  const fieldMap = new Map<string, string>(); // fieldId -> label
  for (const sub of submissions) {
    for (const ans of sub.form_submission_answers ?? []) {
      const fieldId = ans.form_field_id;
      const label = ans.form_fields?.label || ans.form_fields?.field_key || fieldId;
      if (!fieldMap.has(fieldId)) {
        fieldMap.set(fieldId, label);
      }
    }
  }

  const fieldIds = Array.from(fieldMap.keys());
  const baseHeaders = [
    'Submission ID',
    'Respondent Name',
    'Source',
    'Member ID',
    'Email',
    'Phone',
    'Submitted At',
  ];
  const dynamicHeaders = fieldIds.map((id) => fieldMap.get(id) ?? id);
  const allHeaders = [...baseHeaders, ...dynamicHeaders];

  const rows: string[][] = submissions.map((sub) => {
    const respondentName =
      sub.users?.full_name ||
      [sub.public_registrant_info?.first_name, sub.public_registrant_info?.last_name]
        .filter(Boolean)
        .join(' ') ||
      'Anonymous';

    const memberId = sub.users?.member_id || '';
    const email = sub.users?.email || sub.public_registrant_info?.email || '';
    const phone = sub.public_registrant_info?.phone || '';

    // Map answer by field_id
    const answersByField = new Map<string, string>();
    for (const ans of sub.form_submission_answers ?? []) {
      answersByField.set(ans.form_field_id, formatAnswerCsv(ans));
    }

    const fieldValues = fieldIds.map((id) => answersByField.get(id) ?? '');

    return [
      sub.id,
      respondentName,
      sub.source,
      memberId,
      email,
      phone,
      sub.submitted_at,
      ...fieldValues,
    ];
  });

  const csvContent = [
    allHeaders.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  const sanitizedName = (formSlug || formTitle || 'form')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const filename = `${sanitizedName}-submissions.csv`;

  return { csvContent, filename };
}

function triggerCsvDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportSubmissionsButton({
  submissions,
  formTitle,
  formSlug,
  disabled = false,
}: ExportSubmissionsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (disabled || submissions.length === 0) return;

    setIsExporting(true);
    try {
      const { csvContent, filename } = buildSubmissionsCsv(submissions, formSlug, formTitle);
      triggerCsvDownload(csvContent, filename);
      toast.success('Submissions exported to CSV');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export submissions');
    }
    setIsExporting(false);
  };

  return (
    <Button
      type="button"
      variant="primaryOutline"
      size="md"
      disabled={disabled || isExporting || submissions.length === 0}
      onClick={handleExport}
      className="flex items-center gap-1.5"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isExporting ? 'Exporting...' : 'Export as CSV'}
    </Button>
  );
}
