import { supabase } from '@/lib/infrastructure';

import type { AdminFormInput, FormFieldInput } from './schemas';
import type { AdminForm, FormField, FormSubmission } from './types';

export type DuplicateFormInput = {
  source_form_id: string;
  new_title: string;
  new_slug: string;
};

export type SubmitFormSubmissionPayload = {
  form_slug: string;
  member_id?: string;
  public_registrant_info?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  responses: Record<string, unknown>;
  idempotency_key: string;
};

export type SubmitFormSubmissionResponse = {
  success: boolean;
  submission_id: string;
  status: 'submitted' | 'updated';
  message: string;
  error?: string;
  error_code?: string;
  errors?: { fieldKey: string; message: string }[];
};

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export async function fetchAdminFormsPage(params: {
  offset: number;
  pageSize: number;
  searchTerm: string;
}): Promise<{ rows: AdminForm[]; count: number | null }> {
  const { offset, pageSize, searchTerm } = params;
  let formsQuery = supabase.from('forms').select('*', { count: 'exact' });

  if (searchTerm.length > 0) {
    const escapedSearchTerm = escapeOrFilterValue(searchTerm);
    formsQuery = formsQuery.or(
      `title.ilike.%${escapedSearchTerm}%,slug.ilike.%${escapedSearchTerm}%`,
    );
  }

  const { data, error, count } = await formsQuery
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { rows: (data ?? []) as AdminForm[], count };
}

export async function fetchAdminFormById(id: string): Promise<AdminForm | null> {
  const { data, error } = await supabase.from('forms').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data as AdminForm | null;
}

export async function fetchAdminFormBySlug(slug: string): Promise<AdminForm | null> {
  const { data, error } = await supabase.from('forms').select('*').eq('slug', slug).maybeSingle();

  if (error) throw error;
  return data as AdminForm | null;
}

export async function fetchFormFields(
  formId: string,
  includeInactive: boolean,
): Promise<FormField[]> {
  let query = supabase.from('form_fields').select('*').eq('form_id', formId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FormField[];
}

export async function fetchFormIdBySlug(slug: string): Promise<string | null> {
  const { data: formRecord, error: formError } = await supabase
    .from('forms')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (formError) throw formError;
  return (formRecord?.id as string | undefined) ?? null;
}

export async function fetchFormSubmissions(formId: string): Promise<FormSubmission[]> {
  const { data, error } = await supabase
    .from('form_submissions')
    .select(
      `
          *,
          users (
            member_id,
            full_name,
            email
          ),
          form_submission_answers (
            id,
            submission_id,
            form_field_id,
            answer_text,
            answer_number,
            answer_boolean,
            answer_date,
            answer_json,
            form_fields (
              field_key,
              label,
              field_type
            )
          )
        `,
    )
    .eq('form_id', formId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as FormSubmission[];
}

export async function updateForm(id: string, data: AdminFormInput): Promise<AdminForm> {
  const { data: form, error } = await supabase
    .from('forms')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return form as AdminForm;
}

export async function createForm(data: AdminFormInput): Promise<AdminForm> {
  const { data: form, error } = await supabase.from('forms').insert(data).select().single();

  if (error) throw error;
  return form as AdminForm;
}

export async function updateFormField(id: string, data: FormFieldInput): Promise<FormField> {
  const { data: field, error } = await supabase
    .from('form_fields')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return field as FormField;
}

export async function createFormField(formId: string, data: FormFieldInput): Promise<FormField> {
  const { data: field, error } = await supabase
    .from('form_fields')
    .insert({ ...data, form_id: formId })
    .select()
    .single();

  if (error) throw error;
  return field as FormField;
}

export async function deleteFormField(fieldId: string): Promise<void> {
  const { error } = await supabase.from('form_fields').delete().eq('id', fieldId);
  if (error) throw error;
}

export async function reorderFormFields(formId: string, orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_form_fields', {
    p_form_id: formId,
    p_field_ids: orderedIds,
  });

  if (error) throw error;
}

export async function duplicateForm(input: DuplicateFormInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{
    success: boolean;
    new_form_id?: string;
    error?: string;
  }>('duplicate-form', {
    body: input,
  });

  if (error) {
    throw error;
  }

  if (!data || !data.success || !data.new_form_id) {
    throw new Error(data?.error || 'Failed to duplicate form');
  }

  return data.new_form_id;
}

export async function submitFormSubmission(
  payload: SubmitFormSubmissionPayload,
): Promise<SubmitFormSubmissionResponse> {
  const { data, error } = await supabase.functions.invoke('submit-form-submission', {
    body: payload,
  });

  if (error) throw error;
  const response = data as SubmitFormSubmissionResponse;
  if (!response.success) {
    throw new Error(response.error || 'Failed to submit form response');
  }

  return response;
}
