import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useDownloadPublicRegistrationsTemplateMutation } from '@/hooks/domain/public-registrations/mutations/useDownloadPublicRegistrationsTemplateMutation';

const { mockTextCaller, mockCreateEdgeFunctionTextCaller } = vi.hoisted(() => {
  const textCaller = vi.fn();
  return {
    mockTextCaller: textCaller,
    mockCreateEdgeFunctionTextCaller: vi.fn(() => textCaller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionTextCaller: mockCreateEdgeFunctionTextCaller,
  };
});

describe('useDownloadPublicRegistrationsTemplateMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads the public registrations template with the event ID and returns the text response', async () => {
    const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const response = {
      text: 'public_registration_id,first_name\n1,Guest',
      filename: 'public-registrations-template.csv',
    };
    mockTextCaller.mockResolvedValueOnce(response);

    const { result } = renderHookWithClient(() =>
      useDownloadPublicRegistrationsTemplateMutation(eventId),
    );

    const mutationResponse = await act(async () => result.current.mutateAsync());

    expect(mockCreateEdgeFunctionTextCaller).toHaveBeenCalledWith(
      'download-public-registrations-template',
    );
    expect(mockTextCaller).toHaveBeenCalledWith({ event_id: eventId });
    expect(mutationResponse).toEqual(response);
  });

  it('propagates caller errors', async () => {
    const eventId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    mockTextCaller.mockRejectedValueOnce(new Error('Download failed'));

    const { result } = renderHookWithClient(() =>
      useDownloadPublicRegistrationsTemplateMutation(eventId),
    );

    await expect(act(async () => result.current.mutateAsync())).rejects.toThrow('Download failed');
    expect(mockCreateEdgeFunctionTextCaller).toHaveBeenCalledWith(
      'download-public-registrations-template',
    );
    expect(mockTextCaller).toHaveBeenCalledWith({ event_id: eventId });
  });
});
