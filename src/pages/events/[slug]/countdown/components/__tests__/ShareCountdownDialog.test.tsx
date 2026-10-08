import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toBlob, toJpeg } from 'html-to-image';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import { ShareCountdownDialog } from '../ShareCountdownDialog';

vi.mock('html-to-image', () => ({
  toJpeg: vi.fn(),
  toBlob: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ShareCountdownDialog', () => {
  const mockEvent: AdminEvent = {
    id: 'evt-100',
    slug: 'tech-forward-2026',
    title: 'Tech Forward 2026',
    description: 'Upcoming technology conference',
    location: 'Silicon Arena',
    starts_at: '2026-11-15T09:00:00Z',
    ends_at: '2026-11-15T18:00:00Z',
    registration_opens_at: null,
    registration_closes_at: null,
    status: 'published',
    duplicate_policy: 'allow_multiple',
    require_id_lookup: true,
    registration_mode: 'open',
    allow_public_registrations: true,
    metadata: {},
    created_by_admin_id: 'admin-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  const mockTimeLeft = {
    days: 10,
    hours: 5,
    minutes: 30,
    seconds: 45,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: vi.fn().mockResolvedValue(undefined),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
      writable: true,
    });
    vi.stubGlobal('ClipboardItem', class ClipboardItem {});
    vi.mocked(toJpeg).mockResolvedValue(
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
    );
    vi.mocked(toBlob).mockResolvedValue(new Blob(['fake-blob'], { type: 'image/png' }));
  });

  it('does not render when isOpen is false', () => {
    render(
      <ShareCountdownDialog
        isOpen={false}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render when event is null', () => {
    render(
      <ShareCountdownDialog isOpen={true} onClose={vi.fn()} event={null} timeLeft={mockTimeLeft} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders countdown details in modal preview', async () => {
    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Share Event Countdown' })).toBeInTheDocument();
    expect(screen.getAllByText('Tech Forward 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Silicon Arena').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('05').length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(
        screen.getAllByAltText('Scan QR code for event countdown').length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles copying page link to clipboard', async () => {
    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    const copyLinkBtn = screen.getByRole('button', { name: /Copy Page Link/i });
    fireEvent.click(copyLinkBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Countdown link copied to clipboard');
    });
  });

  it('handles copying image to clipboard on desktop', async () => {
    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    const copyImgBtn = screen.getByRole('button', { name: /Copy Image/i });
    fireEvent.click(copyImgBtn);

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
      expect(navigator.clipboard.write).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Countdown image copied to clipboard');
    });
  });

  it('handles downloading image on desktop', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    const downloadBtn = screen.getByRole('button', { name: /Download Image/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(toJpeg).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Countdown image saved');
    });

    clickSpy.mockRestore();
  });

  it('calls navigator.share when supported', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true });

    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    const shareBtn = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Tech Forward 2026',
          text: 'Join us for Tech Forward 2026!',
        }),
      );
    });
  });

  it('ignores AbortError from navigator.share gracefully', async () => {
    const abortError = new DOMException('User dismissed share sheet', 'AbortError');
    const shareMock = vi.fn().mockRejectedValue(abortError);
    const canShareMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: canShareMock, configurable: true });

    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    const shareBtn = screen.getByRole('button', { name: /^Share$/i });
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalled();
    });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows error toast if generating download image fails', async () => {
    vi.mocked(toJpeg).mockRejectedValueOnce(new Error('Render error'));

    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    const downloadBtn = screen.getByRole('button', { name: /Download Image/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save countdown image');
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ShareCountdownDialog
        isOpen={true}
        onClose={onClose}
        event={mockEvent}
        timeLeft={mockTimeLeft}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
