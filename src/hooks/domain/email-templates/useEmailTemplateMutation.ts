import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { type SaveEmailTemplateInput, saveEmailTemplate } from '@/lib/domain/email-templates';
import { logger } from '@/lib/infrastructure';

export function useEmailTemplateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveEmailTemplateInput) => saveEmailTemplate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template saved successfully');
    },
    onError: (error) => {
      logger.error('Error saving template:', error);
      toast.error('Failed to save template');
    },
  });
}
