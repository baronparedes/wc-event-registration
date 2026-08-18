import { forwardRef, useImperativeHandle } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditableMemberAvatar } from '../EditableMemberAvatar';

const { mockAvatar, mockGetScreenshot } = vi.hoisted(() => ({
  mockAvatar: vi.fn(),
  mockGetScreenshot: vi.fn(),
}));

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: (props: { name: string; avatarObjectKey: string | null }) => {
    mockAvatar(props);
    return <div data-testid="avatar-fallback">{props.name}</div>;
  },
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

const onSave = vi.fn();

function renderAvatar(overrides: Partial<React.ComponentProps<typeof EditableMemberAvatar>> = {}) {
  return render(
    <EditableMemberAvatar
      name="Jane Doe"
      avatarObjectKey="avatars/jane.jpg"
      isSaving={false}
      onSave={onSave}
      {...overrides}
    />,
  );
}

describe('EditableMemberAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSave.mockResolvedValue(undefined);
    mockGetScreenshot.mockReturnValue('data:image/jpeg;base64,camera-photo');

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:member-photo'),
        revokeObjectURL: vi.fn(),
      }),
    );

    vi.stubGlobal(
      'Image',
      class {
        width = 1600;
        height = 800;
        src = '';
        decode = vi.fn().mockResolvedValue(undefined);
      },
    );

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,uploaded-photo',
    );
  });

  it('opens the chooser and exposes upload and camera actions', () => {
    renderAvatar();

    fireEvent.click(screen.getByRole('button', { name: 'Upload member photo' }));

    expect(screen.getByRole('heading', { name: 'Member photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
  });

  it('uploads a valid image after converting it to a JPEG data URL', async () => {
    renderAvatar();

    fireEvent.click(screen.getByRole('button', { name: 'Upload member photo' }));
    const input = screen.getByLabelText('Choose member photo');
    const file = new File(['photo'], 'photo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('data:image/jpeg;base64,uploaded-photo'),
    );
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,uploaded-photo',
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:member-photo');
  });

  it('shows an error and does not save a non-image file', async () => {
    renderAvatar();

    const input = screen.getByLabelText('Choose member photo');
    const file = new File(['not an image'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Choose an image file.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('opens the camera and saves a captured photo', async () => {
    renderAvatar();

    fireEvent.click(screen.getByRole('button', { name: 'Upload member photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }));
    expect(screen.getByRole('heading', { name: 'Take member photo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Capture photo' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('data:image/jpeg;base64,camera-photo'));
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,camera-photo',
    );
  });

  it('shows an error when the camera is not ready', async () => {
    mockGetScreenshot.mockReturnValue(undefined);
    renderAvatar();

    fireEvent.click(screen.getByRole('button', { name: 'Upload member photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capture photo' }));

    expect(await screen.findByText('The camera is not ready. Try again.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows camera access errors and allows camera cancellation', async () => {
    renderAvatar();

    fireEvent.click(screen.getByRole('button', { name: 'Upload member photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Take photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Trigger camera error' }));

    expect(
      await screen.findByText('Camera access is unavailable or was denied.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: 'Take member photo' })).not.toBeInTheDocument();
  });

  it('disables photo actions while saving', () => {
    renderAvatar({ isSaving: true });

    const uploadButton = screen.getByRole('button', { name: 'Upload member photo' });
    expect(uploadButton).toBeDisabled();
    expect(uploadButton.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('shows save errors while keeping the preview', async () => {
    onSave.mockRejectedValueOnce(new Error('Upload failed.'));
    renderAvatar();

    fireEvent.click(screen.getByRole('button', { name: 'Upload member photo' }));
    const input = screen.getByLabelText('Choose member photo');
    fireEvent.change(input, {
      target: { files: [new File(['photo'], 'photo.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('Upload failed.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toBeInTheDocument();
  });
});
