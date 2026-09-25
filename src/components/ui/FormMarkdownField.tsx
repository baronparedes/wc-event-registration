import { useId, useMemo } from 'react';

import 'easymde/dist/easymde.min.css';
import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import SimpleMdeReact from 'react-simplemde-editor';

interface FormMarkdownFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export function FormMarkdownField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required,
}: FormMarkdownFieldProps<T>) {
  const id = useId();

  const options = useMemo(() => {
    return {
      autofocus: false,
      spellChecker: false,
      hideIcons: ['guide', 'heading', 'image', 'preview', 'side-by-side', 'fullscreen'] as const,
      status: false,
      placeholder: placeholder || 'Enter markdown text...',
    };
  }, [placeholder]);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value }, fieldState: { error } }) => (
          <div>
            <div className={`prose-sm ${error ? 'border-red-500' : ''}`}>
              <SimpleMdeReact id={id} value={value || ''} onChange={onChange} options={options} />
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error.message}</p>}
          </div>
        )}
      />
    </div>
  );
}
