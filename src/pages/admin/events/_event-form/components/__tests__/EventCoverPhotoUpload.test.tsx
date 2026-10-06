import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventCoverPhotoUpload } from '../EventCoverPhotoUpload';

const mockUploadEventCoverImage = vi.fn();
const mockDeleteEventCoverImage = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastInfo = vi.fn();

vi.mock('@/lib/domain/events', () => ({
  getEventCoverPublicUrl: (key: string | null | undefined) =>
    key ? `https://example.com/storage/${key}` : null,
  uploadEventCoverImage: (...args: unknown[]) => mockUploadEventCoverImage(...args),
  deleteEventCoverImage: (...args: unknown[]) => mockDeleteEventCoverImage(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

describe('EventCoverPhotoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:https://example.com/blob-123');
  });

  it('renders upload placeholder when no cover image key is set', () => {
    render(<EventCoverPhotoUpload coverImageKey={null} onCoverImageKeyChange={vi.fn()} />);

    expect(screen.getByText('Click to upload or drag & drop cover photo')).toBeInTheDocument();
    expect(
      screen.getByText('JPEG, PNG, or WebP (optionally crop or reposition after upload)'),
    ).toBeInTheDocument();
  });

  it('renders image preview and action buttons when cover image key exists', () => {
    render(
      <EventCoverPhotoUpload
        coverImageKey="covers/sample-123.jpg"
        onCoverImageKeyChange={vi.fn()}
      />,
    );

    const img = screen.getByAltText('Event cover preview');
    expect(img).toHaveAttribute('src', 'https://example.com/storage/covers/sample-123.jpg');
    expect(screen.getByRole('button', { name: 'Adjust Crop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change Photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('validates file type on upload', async () => {
    const onCoverImageKeyChange = vi.fn();
    render(
      <EventCoverPhotoUpload coverImageKey={null} onCoverImageKeyChange={onCoverImageKeyChange} />,
    );

    const input = screen.getByLabelText('Upload event cover photo');
    const invalidFile = new File(['text content'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
      );
    });
    expect(mockUploadEventCoverImage).not.toHaveBeenCalled();
    expect(onCoverImageKeyChange).not.toHaveBeenCalled();
  });

  it('validates file size on upload (> 10MB)', async () => {
    const onCoverImageKeyChange = vi.fn();
    render(
      <EventCoverPhotoUpload coverImageKey={null} onCoverImageKeyChange={onCoverImageKeyChange} />,
    );

    const input = screen.getByLabelText('Upload event cover photo');
    const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'File is too large. Maximum allowed size is 10MB.',
      );
    });
    expect(mockUploadEventCoverImage).not.toHaveBeenCalled();
    expect(onCoverImageKeyChange).not.toHaveBeenCalled();
  });

  it('uploads the original image directly when a valid image is selected', async () => {
    mockUploadEventCoverImage.mockResolvedValueOnce('covers/uploaded-123.png');
    const onCoverImageKeyChange = vi.fn();

    render(
      <EventCoverPhotoUpload
        coverImageKey={null}
        onCoverImageKeyChange={onCoverImageKeyChange}
        eventIdOrSlug="summer-event"
      />,
    );

    const input = screen.getByLabelText('Upload event cover photo');
    const validFile = new File(['image-bytes'], 'banner.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockUploadEventCoverImage).toHaveBeenCalledWith(validFile, 'summer-event');
      expect(onCoverImageKeyChange).toHaveBeenCalledWith('covers/uploaded-123.png');
      expect(mockToastSuccess).toHaveBeenCalledWith('Cover photo uploaded successfully');
    });
  });

  it('opens crop modal when Adjust Crop button is clicked on existing cover', async () => {
    render(
      <EventCoverPhotoUpload
        coverImageKey="covers/sample-123.jpg"
        onCoverImageKeyChange={vi.fn()}
      />,
    );

    const adjustButton = screen.getByRole('button', { name: 'Adjust Crop' });
    fireEvent.click(adjustButton);

    expect(await screen.findByText('Adjust Cover Photo')).toBeInTheDocument();
  });

  it('handles remove cover photo and calls delete helper', async () => {
    mockDeleteEventCoverImage.mockResolvedValueOnce(undefined);
    const onCoverImageKeyChange = vi.fn();

    render(
      <EventCoverPhotoUpload
        coverImageKey="covers/to-delete.jpg"
        onCoverImageKeyChange={onCoverImageKeyChange}
      />,
    );

    const removeButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeButton);

    expect(onCoverImageKeyChange).toHaveBeenCalledWith(null);
    await waitFor(() => {
      expect(mockDeleteEventCoverImage).toHaveBeenCalledWith('covers/to-delete.jpg');
    });
    expect(mockToastInfo).toHaveBeenCalledWith('Cover photo removed');
  });
});
