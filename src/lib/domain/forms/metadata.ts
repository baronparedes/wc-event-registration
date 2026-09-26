/**
 * Shared publish requirements metadata for forms.
 * Used in both form editor feedback and publish dialog confirmation.
 */

export type FormPublishRequirement = {
  key: string;
  label: string;
  filled: boolean;
};

export type FormPublishRequirementsData = {
  title?: string | null;
  slug?: string | null;
  fieldsCount?: number | null;
  fields?: Array<{ is_active?: boolean }> | null;
};

export function getFormPublishRequirements(
  data: FormPublishRequirementsData,
): FormPublishRequirement[] {
  const fieldsCount =
    typeof data.fieldsCount === 'number' ? data.fieldsCount : (data.fields?.length ?? 0);

  return [
    { key: 'title', label: 'Form Title', filled: Boolean(data.title?.trim()) },
    { key: 'slug', label: 'Form Slug', filled: Boolean(data.slug?.trim()) },
    {
      key: 'fields',
      label: 'At least 1 Dynamic Field',
      filled: fieldsCount >= 1,
    },
  ];
}

export function areAllFormRequirementsMet(data: FormPublishRequirementsData): boolean {
  return getFormPublishRequirements(data).every((req) => req.filled);
}
