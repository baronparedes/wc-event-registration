import { forwardRef, useImperativeHandle } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditableApplicantAvatar } from '../EditableApplicantAvatar';

const { mockGetScreenshot, mockMutate } = vi.hoisted(() => ({
  mockGetScreenshot: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: (props: { name: string; avatarObjectKey: string | null }) => (
    <div data-testid="avatar-mock">{props.name}</div>
  ),
}));

vi.mock('@/hooks/domain/recruitment', () => ({
  useUploadRecruitmentAvatarMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('react-webcam', () => ({
  default: forwardRef((props: { onUserMediaError: (error: Error) => void }, ref) => {
    useImperativeHandle(ref, () => ({ getScreenshot: mockGetScreenshot }), []);
    return (
      <>
        <video data-testid="webcam" />
        <button type="button" onClick={() => props.onUserMediaError(new Error('camera denied'))}>
          Trigger camera error
        </button>
      </>
    );
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EditableApplicantAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScreenshot.mockReturnValue('data:image/jpeg;base64,camera-capture');

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:applicant-photo'),
        revokeObjectURL: vi.fn(),
      }),
    );

    vi.stubGlobal(
      'Image',
      class {
        width = 800;
        height = 800;
        src = '';
        decode = vi.fn().mockResolvedValue(undefined);
      },
    );

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,uploaded-capture',
    );
  });

  it('renders trigger button and opens chooser dialog', () => {
    render(
      <EditableApplicantAvatar applicationId="app-123" name="John Doe" avatarObjectKey={null} />,
    );

    const trigger = screen.getByRole('button', { name: 'Upload applicant photo' });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByRole('heading', { name: 'Applicant photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
  });

  it('uploads file through chooser and triggers mutation', async () => {
    render(
      <EditableApplicantAvatar applicationId="app-123" name="John Doe" avatarObjectKey={null} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload applicant photo' }));

    const input = screen.getByLabelText('Choose applicant photo');
    const file = new File(['photo'], 'test.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          applicationId: 'app-123',
          imageBase64: 'data:image/jpeg;base64,uploaded-capture',
        },
        expect.any(Object),
      );
    });
  });

  it('takes photo via webcam and triggers mutation', async () => {
    render(
      <EditableApplicantAvatar applicationId="app-123" name="John Doe" avatarObjectKey={null} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload applicant photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }));

    expect(screen.getByRole('heading', { name: 'Take applicant photo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Capture photo' }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        applicationId: 'app-123',
        imageBase64: 'data:image/jpeg;base64,camera-capture',
      },
      expect.any(Object),
    );
  });
});
