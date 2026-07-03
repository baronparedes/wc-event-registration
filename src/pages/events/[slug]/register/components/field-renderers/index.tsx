import { type ReactNode } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import type {
  DynamicFieldResponseValues,
  EventFieldType,
  PublicEventField,
} from '@/lib/domain/event-fields';

import { CheckboxFieldRenderer } from './CheckboxFieldRenderer';
import { DateFieldRenderer, DatetimeFieldRenderer } from './DateFieldRenderer';
import {
  MultiSelectFieldRenderer,
  MultiSelectToggleFieldRenderer,
  RadioFieldRenderer,
  SelectFieldRenderer,
} from './SelectFieldRenderer';
import {
  EmailFieldRenderer,
  NumberFieldRenderer,
  PhoneFieldRenderer,
  TextFieldRenderer,
  TextareaFieldRenderer,
} from './TextFieldRenderer';

/**
 * Render the appropriate field component for a given field type.
 * Falls back to TextFieldRenderer for unknown types.
 */
export function renderFieldByType(
  fieldType: EventFieldType,
  field: PublicEventField,
  dynamicForm: UseFormReturn<DynamicFieldResponseValues>,
): ReactNode {
  switch (fieldType) {
    case 'text':
      return <TextFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'email':
      return <EmailFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'phone':
      return <PhoneFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'number':
      return <NumberFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'textarea':
      return <TextareaFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'date':
      return <DateFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'datetime':
      return <DatetimeFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'select':
      return <SelectFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'radio':
      return <RadioFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'multi_select':
      return <MultiSelectFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'multi_select_toggle':
      return <MultiSelectToggleFieldRenderer field={field} dynamicForm={dynamicForm} />;
    case 'checkbox':
    case 'boolean':
      return <CheckboxFieldRenderer field={field} dynamicForm={dynamicForm} />;
    default:
      return <TextFieldRenderer field={field} dynamicForm={dynamicForm} />;
  }
}
