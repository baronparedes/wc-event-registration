import { useQuery } from '@tanstack/react-query';

import { fetchEmailTemplates } from '@/lib/domain/email-templates';

export function useEmailTemplatesQuery() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: fetchEmailTemplates,
  });
}
