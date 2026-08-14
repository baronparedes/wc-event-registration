import { useMutation } from '@tanstack/react-query';

import { createEdgeFunctionTextCaller } from '@/lib/infrastructure';

type DownloadPublicRegistrationsTemplateRequest = {
  event_id: string;
};

/** Downloads the public registrations CSV template with existing public registration answers. */
export function useDownloadPublicRegistrationsTemplateMutation(eventId: string) {
  return useMutation({
    mutationFn: () => {
      const caller = createEdgeFunctionTextCaller<DownloadPublicRegistrationsTemplateRequest>(
        'download-public-registrations-template',
      );
      return caller({ event_id: eventId });
    },
  });
}
