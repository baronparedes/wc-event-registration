import { useState } from 'react';

import { type UseFormReturn, useWatch } from 'react-hook-form';

import type { DynamicFieldLike } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

type RatingFieldRendererProps = {
  field: DynamicFieldLike;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
};

export function RatingFieldRenderer({ field, dynamicForm }: RatingFieldRendererProps) {
  // Extract max value from validation rules, default to 5 if not provided (capped between 1 and 10)
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const rawMax = typeof rules.max === 'number' ? rules.max : 5;
  const maxRating = Math.min(Math.max(1, rawMax), 10);

  const ratingOptions = Array.from({ length: maxRating }, (_, i) => i + 1);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const currentValue = useWatch({
    control: dynamicForm.control,
    name: field.field_key,
  });

  const numericValue = typeof currentValue === 'number' ? currentValue : Number(currentValue) || 0;

  return (
    <div
      role="radiogroup"
      aria-label={field.label}
      className="flex flex-wrap items-center gap-1.5"
      onMouseLeave={() => setHoveredRating(null)}
    >
      {ratingOptions.map((rating) => {
        const isFilled = hoveredRating !== null ? rating <= hoveredRating : rating <= numericValue;

        return (
          <label
            key={`${field.field_key}-${rating}`}
            className="group relative cursor-pointer rounded-md p-0.5 transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
            aria-label={`${rating} of ${maxRating} stars`}
            title={`${rating} of ${maxRating} stars`}
            onMouseEnter={() => setHoveredRating(rating)}
            onClick={(e) => {
              if (numericValue === rating) {
                e.preventDefault();
                dynamicForm.setValue(field.field_key, undefined, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
          >
            <input
              type="radio"
              className="sr-only"
              value={rating}
              checked={numericValue === rating}
              {...dynamicForm.register(field.field_key, {
                setValueAs: (value) => {
                  if (value === '' || value === null || value === undefined) return undefined;
                  return Number(value);
                },
              })}
            />
            <svg
              className={`h-8 w-8 transition-colors ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-gray-300 hover:text-amber-300'
              }`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </label>
        );
      })}
    </div>
  );
}
