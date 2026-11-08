import { forwardRef, useImperativeHandle } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicantAvatarPicker } from '../ApplicantAvatarPicker';

const { mockGetScreenshot } = vi.hoisted(() => ({
  mockGetScreenshot: vi.fn(),
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

describe('ApplicantAvatarPicker', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScreenshot.mockReturnValue('data:image/jpeg;base64,camera-selfie');

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
      'data:image/jpeg;base64,uploaded-selfie',
    );
  });

  it('renders default state without value', () => {
    render(<ApplicantAvatarPicker value={null} onChange={onChange} />);

    expect(screen.getByText('Applicant Photo')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take Photo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('renders preview and remove button when value is provided', () => {
    render(<ApplicantAvatarPicker value="data:image/jpeg;base64,test-image" onChange={onChange} />);

    expect(screen.getByAltText('Applicant preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('handles file upload selection', async () => {
    render(<ApplicantAvatarPicker value={null} onChange={onChange} />);

    const input = screen.getByLabelText('Upload applicant photo file');
    const file = new File(['photo'], 'headshot.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,uploaded-selfie');
    });
  });

  it('opens webcam dialog and captures photo', async () => {
    render(<ApplicantAvatarPicker value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Take Photo' }));

    expect(screen.getByRole('heading', { name: 'Take Applicant Photo' })).toBeInTheDocument();
    expect(screen.getByTestId('webcam')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Capture Photo' }));

    expect(onChange).toHaveBeenCalledWith('data:image/jpeg;base64,camera-selfie');
    expect(screen.queryByRole('heading', { name: 'Take Applicant Photo' })).not.toBeInTheDocument();
  });
});
