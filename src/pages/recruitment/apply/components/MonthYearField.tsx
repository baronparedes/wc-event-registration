import { type Control, Controller } from 'react-hook-form';

import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

import { fromMonthInput, toMonthInput } from '../utils';

type MonthYearFieldName =
  | 'spiritual_background.ccf_member_since'
  | 'dgroup_info.member_since'
  | 'dgroup_info.leader_since';

type MonthYearFieldProps = {
  control: Control<RecruitmentStep1Input>;
  name: MonthYearFieldName;
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
};

export function MonthYearField({
  control,
  name,
  label,
  required = true,
  error,
  helperText,
}: MonthYearFieldProps) {
  const id = name.replaceAll('.', '-');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-text" htmlFor={id}>
            {label} {required && <span className="text-danger">*</span>}
          </label>
          <input
            id={id}
            className={`block w-full rounded-md border bg-background px-3.5 py-2.5 text-sm leading-6 text-text focus:outline-none focus:ring-2 ${
              error
                ? 'border-danger focus:ring-danger/30'
                : 'border-border focus:border-primary focus:ring-primary/30'
            }`}
            type="month"
            value={toMonthInput(typeof field.value === 'string' ? field.value : undefined)}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = fromMonthInput(event.target.value);
              field.onChange(required ? value : value || null);
            }}
            ref={field.ref}
          />
          {helperText && <p className="text-xs text-muted">{helperText}</p>}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    />
  );
}
