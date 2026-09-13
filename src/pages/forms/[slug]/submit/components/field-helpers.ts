import type {
  EventFieldApplicability,
  PublicEventField,
  PublicEventFieldValidationRules,
} from '@/lib/domain/event-fields';
import type { FormField, FormFieldApplicability } from '@/lib/domain/forms';

function toEventApplicability(applicability: FormFieldApplicability): EventFieldApplicability {
  switch (applicability) {
    case 'member_only':
      return 'members';
    case 'public_only':
      return 'guests';
    case 'all':
    default:
      return 'both';
  }
}

export function toPublicField(field: FormField): PublicEventField {
  return {
    id: field.id,
    event_id: field.form_id,
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type,
    applicability: toEventApplicability(field.field_applicability),
    is_required: field.is_required,
    is_active: field.is_active,
    placeholder: field.placeholder,
    help_text: field.help_text,
    options: field.options ?? [],
    validation_rules: (field.validation_rules as PublicEventFieldValidationRules) ?? {},
    display_order: field.display_order,
  };
}
