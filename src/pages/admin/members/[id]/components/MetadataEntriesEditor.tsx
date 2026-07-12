import { Plus, Trash2 } from 'lucide-react';
import type {
  FieldArrayWithId,
  FieldErrors,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
} from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import type { UpdateMemberInput } from '@/lib/domain/members';

type MetadataEntry = { key: string; value: string };

type MetadataEntriesEditorProps = {
  fields: FieldArrayWithId<UpdateMemberInput, 'metadata_entries', 'id'>[];
  register: UseFormRegister<UpdateMemberInput>;
  errors: FieldErrors<UpdateMemberInput>;
  remove: UseFieldArrayRemove;
  append: UseFieldArrayAppend<UpdateMemberInput, 'metadata_entries'>;
  disabled?: boolean;
};

const inputClass =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600';

/** Manages the editable list of additional metadata key-value pairs for a member. */
export function MetadataEntriesEditor({
  fields,
  register,
  errors,
  remove,
  append,
  disabled,
}: MetadataEntriesEditorProps) {
  const entryErrors = errors.metadata_entries;

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-sm text-muted">
          No additional metadata. Click "Add field" to add custom key-value pairs.
        </p>
      )}

      {fields.map((field, index) => {
        const keyError = Array.isArray(entryErrors) ? entryErrors[index]?.key?.message : undefined;
        const valueError = Array.isArray(entryErrors)
          ? entryErrors[index]?.value?.message
          : undefined;

        return (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <input
                {...register(`metadata_entries.${index}.key`)}
                placeholder="Key"
                disabled={disabled}
                className={inputClass}
                aria-label={`Metadata key ${index + 1}`}
              />
              {keyError && <p className="text-xs text-danger">{keyError}</p>}
            </div>
            <div className="flex-1 space-y-1">
              <input
                {...register(`metadata_entries.${index}.value`)}
                placeholder="Value"
                disabled={disabled}
                className={inputClass}
                aria-label={`Metadata value ${index + 1}`}
              />
              {valueError && <p className="text-xs text-danger">{valueError}</p>}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => remove(index)}
              aria-label="Remove metadata field"
              className="mt-0.5 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => append({ key: '', value: '' } satisfies MetadataEntry)}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add field
      </Button>
    </div>
  );
}
