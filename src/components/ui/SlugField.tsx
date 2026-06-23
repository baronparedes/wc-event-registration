import type { ChangeEvent } from 'react'
import { FormInputField } from './FormInputField'

type SlugFieldProps = {
  isEditMode: boolean
  value: string
  onChange: (value: string) => void
  error?: string
}

/** Renders the slug input. In create mode it is editable with an auto-generate note.
 *  In edit mode it is locked to preserve existing public event URLs. */
export function SlugField({ isEditMode, value, onChange, error }: SlugFieldProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  return (
    <FormInputField
      error={error}
      helperText={
        isEditMode
          ? 'Slug cannot be changed after creation to preserve existing registration links.'
          : 'Auto-generated from title. Use only lowercase letters, numbers, and hyphens.'
      }
      id="event-slug"
      inputClassName={`font-mono ${
        isEditMode ? 'cursor-not-allowed bg-background/50 text-muted' : ''
      }`}
      label="Slug"
      labelAdornment={
        isEditMode ? (
          <span className="ml-2 rounded bg-surface px-1.5 py-0.5 text-xs font-normal text-muted ring-1 ring-border">
            locked
          </span>
        ) : null
      }
      onChange={handleChange}
      placeholder="e.g. summer-event-2025"
      readOnly={isEditMode}
      value={value}
    />
  )
}
