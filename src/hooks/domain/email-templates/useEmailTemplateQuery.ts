import { useQuery } from '@tanstack/react-query';

import { fetchEmailTemplateById } from '@/lib/domain/email-templates';

export function useEmailTemplateQuery(id?: string | null) {
  return useQuery({
    queryKey: ['email-templates', id],
    queryFn: () => (id ? fetchEmailTemplateById(id) : null),
    enabled: Boolean(id),
  });
}
