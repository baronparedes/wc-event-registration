import { useMutation } from '@tanstack/react-query';

import { createEdgeFunctionTextCaller } from '@/lib/infrastructure';

type DownloadRegistrationsTemplateRequest = {
  event_id: string;
};

/** Downloads the registrations CSV template with all members and existing registration answers. */
export function useDownloadRegistrationsTemplateMutation(eventId: string) {
  return useMutation({
    mutationFn: () => {
      const caller = createEdgeFunctionTextCaller<DownloadRegistrationsTemplateRequest>(
        'download-registrations-template',
      );
      return caller({ event_id: eventId });
    },
  });
}
