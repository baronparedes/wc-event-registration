import type { DynamicFieldOption, DynamicFieldRef } from '../types';

export function toDynamicFieldToken(field: DynamicFieldRef): string {
  return `${field.source}:${field.fieldKey}`;
}

export function fromDynamicFieldToken(
  token: string,
  fields: DynamicFieldOption[],
): DynamicFieldRef | null {
  return fields.find((field) => field.token === token) ?? null;
}
