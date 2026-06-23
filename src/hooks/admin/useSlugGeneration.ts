import { useRef, useEffect } from 'react'
import type { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { CreateEventInput } from '../../lib/admin/eventSchema'

/**
 * Encapsulates slug auto-generation logic for event forms.
 *
 * In create mode, automatically generates a slug from the title field,
 * but respects manual slug edits (disables auto-generation once user edits).
 *
 * In edit mode, does nothing (slug is not auto-generated for existing events).
 *
 * @param isEditMode - Whether the form is in edit mode
 * @param watch - Form's watch function from useForm
 * @param setValue - Form's setValue function from useForm
 * @param onManualEdit - Optional callback when user manually edits the slug
 * @returns { slugValue, onSlugChange } - Current slug value and handler for manual edits
 */
export function useSlugGeneration(
  isEditMode: boolean,
  watch: UseFormWatch<CreateEventInput>,
  setValue: UseFormSetValue<CreateEventInput>,
  onManualEdit?: () => void,
): {
  slugValue: string
  onSlugChange: (value: string) => void
} {
  const slugManuallyEdited = useRef(false)
  const titleValue = watch('title')
  const slugValue = watch('slug')

  // Auto-generate slug from title in create mode
  useEffect(() => {
    if (!isEditMode && !slugManuallyEdited.current) {
      setValue('slug', generateSlug(titleValue), { shouldValidate: false })
    }
  }, [isEditMode, titleValue, setValue])

  function onSlugChange(value: string) {
    slugManuallyEdited.current = true
    setValue('slug', value, { shouldValidate: true })
    onManualEdit?.()
  }

  return {
    slugValue,
    onSlugChange,
  }
}

/**
 * Generates a URL-safe slug from arbitrary text.
 * Lowercases, removes special characters, collapses whitespace, and normalizes dashes.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
