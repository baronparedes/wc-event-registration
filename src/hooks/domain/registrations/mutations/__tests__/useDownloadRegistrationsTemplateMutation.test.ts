import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useDownloadRegistrationsTemplateMutation } from '@/hooks/domain/registrations/mutations/useDownloadRegistrationsTemplateMutation';

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

describe('useDownloadRegistrationsTemplateMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads the registrations template with the event ID and returns the text response', async () => {
    const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const response = { text: 'member_id,team\nM-1,Blue', filename: 'registrations-template.csv' };
    mockTextCaller.mockResolvedValueOnce(response);

    const { result } = renderHookWithClient(() =>
      useDownloadRegistrationsTemplateMutation(eventId),
    );

    const mutationResponse = await act(async () => result.current.mutateAsync());

    expect(mockCreateEdgeFunctionTextCaller).toHaveBeenCalledWith(
      'download-registrations-template',
    );
    expect(mockTextCaller).toHaveBeenCalledWith({ event_id: eventId });
    expect(mutationResponse).toEqual(response);
  });
});
