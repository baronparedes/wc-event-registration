import { type UseFormReturn, useWatch } from 'react-hook-form';

import type { DynamicFieldResponseValues, PublicEventField } from '@/lib/domain/event-fields';

type RatingFieldRendererProps = {
  field: PublicEventField;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
};

export function RatingFieldRenderer({ field, dynamicForm }: RatingFieldRendererProps) {
  // Extract max value from validation rules, default to 5 if not provided
  const maxRating = Math.min(
    Math.max(1, field.validation_rules?.max !== undefined ? field.validation_rules.max : 5),
    10,
  );

  const ratingOptions = Array.from({ length: maxRating }, (_, i) => i + 1);

  const currentValue = useWatch({
    control: dynamicForm.control,
    name: field.field_key,
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ratingOptions.map((rating) => {
        const isSelected = Number(currentValue) >= rating;
        return (
          <label
            key={`${field.field_key}-${rating}`}
            className="cursor-pointer"
            aria-label={`Rate ${rating} stars`}
            title={`Rate ${rating} stars`}
          >
            <input
              type="radio"
              className="sr-only"
              value={rating}
              {...dynamicForm.register(field.field_key, {
                setValueAs: (value) => {
                  if (value === '' || value === null || value === undefined) return undefined;
                  return Number(value);
                },
              })}
            />
            <svg
              className={`h-8 w-8 transition-colors ${
                isSelected
                  ? 'fill-primary text-primary'
                  : 'fill-transparent text-gray-300 hover:text-primary/50'
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
