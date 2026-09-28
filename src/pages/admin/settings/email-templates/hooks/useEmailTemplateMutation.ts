import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/lib/infrastructure/supabase';

type SaveTemplateParams = {
  id?: string;
  name: string;
  slug: string;
  resend_template_id: string;
  required_variables: string[];
};

export function useEmailTemplateMutation() {
  return useMutation({
    mutationFn: async (params: SaveTemplateParams) => {
      if (params.id) {
        const { data, error } = await supabase
          .from('email_templates')
          .update({
            name: params.name,
            slug: params.slug,
            resend_template_id: params.resend_template_id,
            required_variables: params.required_variables,
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('email_templates')
          .insert([
            {
              name: params.name,
              slug: params.slug,
              resend_template_id: params.resend_template_id,
              required_variables: params.required_variables,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success('Template saved successfully');
    },
    onError: (error) => {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    },
  });
}
