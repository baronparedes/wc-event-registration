import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import type {
  EmailTemplate,
  EnqueueEventPayload,
  EnqueueEventResponse,
  SaveEmailTemplateInput,
} from './types';

const callEnqueueEvent = createEdgeFunctionCaller<EnqueueEventPayload, EnqueueEventResponse>(
  'enqueue-event',
);

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as EmailTemplate[];
}

export async function fetchEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as unknown as EmailTemplate) : null;
}

export async function saveEmailTemplate(input: SaveEmailTemplateInput): Promise<EmailTemplate> {
  if (input.id) {
    const { data, error } = await supabase
      .from('email_templates')
      .update({
        name: input.name,
        slug: input.slug,
        resend_template_id: input.resend_template_id,
        required_variables: input.required_variables,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as EmailTemplate;
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert([
      {
        name: input.name,
        slug: input.slug,
        resend_template_id: input.resend_template_id,
        required_variables: input.required_variables,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as unknown as EmailTemplate;
}

export async function enqueueEventNotification(
  payload: EnqueueEventPayload,
): Promise<EnqueueEventResponse> {
  const data = await callEnqueueEvent(payload);

  if (!data?.success) {
    throw new Error('Failed to enqueue event notification');
  }

  return data;
}
