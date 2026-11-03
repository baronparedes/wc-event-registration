import { useMemo, useState } from 'react';

import { type UseFormReturn, useWatch } from 'react-hook-form';

import { type DynamicFieldLike, parseRatingLabels } from '@/lib/domain/dynamic-fields';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';

type RatingFieldRendererProps = {
  field: DynamicFieldLike;
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>;
  variant?: 'stars' | 'segmented';
  showRatingText?: boolean;
};

export function RatingFieldRenderer({
  field,
  dynamicForm,
  variant = 'stars',
  showRatingText = true,
}: RatingFieldRendererProps) {
  // Extract max value from validation rules, default to 5 if not provided (capped between 1 and 10)
  const rules = (field.validation_rules ?? {}) as Record<string, unknown>;
  const rawMax = typeof rules.max === 'number' ? rules.max : 5;
  const maxRating = Math.min(Math.max(1, rawMax), 10);

  const ratingOptions = Array.from({ length: maxRating }, (_, i) => i + 1);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const ratingLabels = useMemo(() => parseRatingLabels(field.help_text), [field.help_text]);

  const currentValue = useWatch({
    control: dynamicForm.control,
    name: field.field_key,
  });

  const numericValue = typeof currentValue === 'number' ? currentValue : Number(currentValue) || 0;
  const activeRating = hoveredRating !== null ? hoveredRating : numericValue;
  const activeMeaning = ratingLabels[activeRating];

  if (variant === 'segmented') {
    const gridCols =
      ratingOptions.length === 2
        ? 'sm:grid-cols-2'
        : ratingOptions.length === 3
          ? 'sm:grid-cols-3'
          : ratingOptions.length === 4
            ? 'sm:grid-cols-4'
            : 'sm:grid-cols-5';

    return (
      <div
        role="radiogroup"
        aria-label={field.label}
        className={`grid grid-cols-1 gap-2 ${gridCols}`}
      >
        {ratingOptions.map((rating) => {
          const meaning = ratingLabels[rating] || `${rating} of ${maxRating}`;
          const isSelected = numericValue === rating;

          return (
            <button
              key={`${field.field_key}-${rating}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => {
                const isRequired = field.is_required || rules.min !== undefined;
                const nextValue = isSelected ? (isRequired ? rating : undefined) : rating;
                dynamicForm.setValue(field.field_key, nextValue as never, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              className={`flex items-center justify-center rounded-lg border px-3.5 py-2.5 text-center text-xs font-medium transition-all sm:text-sm ${
                isSelected
                  ? 'border-primary bg-primary font-semibold text-white shadow-2xs'
                  : 'border-border bg-surface text-text hover:border-primary/50 hover:bg-surface/80'
              }`}
            >
              {meaning}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label={field.label}
          className="flex flex-wrap items-center gap-1.5"
          onMouseLeave={() => setHoveredRating(null)}
        >
          {ratingOptions.map((rating) => {
            const isFilled =
              hoveredRating !== null ? rating <= hoveredRating : rating <= numericValue;
            const meaning = ratingLabels[rating];
            const starTitle = showRatingText
              ? meaning
                ? `${rating} star${rating > 1 ? 's' : ''}: ${meaning}`
                : `${rating} of ${maxRating} stars`
              : meaning
                ? `${rating} star${rating > 1 ? 's' : ''}: ${meaning}`
                : `${rating} star${rating > 1 ? 's' : ''}`;

            return (
              <label
                key={`${field.field_key}-${rating}`}
                className="group relative cursor-pointer rounded-md p-0.5 transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                aria-label={starTitle}
                title={starTitle}
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

        {showRatingText && activeMeaning ? (
          <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text shadow-2xs">
            {activeRating} — {activeMeaning}
          </span>
        ) : showRatingText && activeRating > 0 ? (
          <span className="text-xs text-muted">
            {activeRating} of {maxRating} stars
          </span>
        ) : null}
      </div>

      {showRatingText && Object.keys(ratingLabels).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {Object.entries(ratingLabels).map(([score, desc]) => (
            <span
              key={score}
              className={Number(score) === activeRating ? 'font-semibold text-primary' : ''}
            >
              <span className="font-medium text-amber-500">{'★'.repeat(Number(score))}</span>{' '}
              {score} = {desc}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
