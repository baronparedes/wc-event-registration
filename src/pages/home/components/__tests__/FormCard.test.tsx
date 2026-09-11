import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { FormCard } from '../FormCard';

const { mockNavigate, mockToastSuccess, mockToastError, mockClipboardWriteText, mockNativeShare } =
  vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockClipboardWriteText: vi.fn(),
    mockNativeShare: vi.fn(),
  }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe('FormCard', () => {
  const mockForm: AdminForm = {
    id: '1',
    slug: 'test-form',
    title: 'Test Form',
    description: 'A test form description',
    status: 'published',
    duplicate_policy: 'allow_multiple',
    audience: 'members_and_public',
    metadata: {},
    created_by_admin_id: 'admin1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: mockClipboardWriteText,
      },
    });
  });

  it('renders form details and submit action for a published form', () => {
    render(<FormCard form={mockForm} />);

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('A test form description')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    const submitLink = screen.getByRole('link', { name: 'Fill out' });
    expect(submitLink).toHaveAttribute('href', '/forms/test-form');
  });

  it('renders without description when description is null', () => {
    render(<FormCard form={{ ...mockForm, description: null }} />);

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.queryByText('A test form description')).not.toBeInTheDocument();
  });

  it('does not render submit link or share button for draft form', () => {
    const draftForm = { ...mockForm, status: 'draft' as const };
    render(<FormCard form={draftForm} />);

    expect(screen.queryByRole('link', { name: 'Fill out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Share Test Form/i })).not.toBeInTheDocument();
  });

  it('navigates when an open card is clicked or activated with the keyboard', () => {
    render(<FormCard form={mockForm} />);

    const card = screen.getAllByRole('link')[0];
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenCalledWith('/forms/test-form');
  });

  it('does not navigate on unhandled key press when open', () => {
    render(<FormCard form={mockForm} />);

    const card = screen.getAllByRole('link')[0];
    fireEvent.keyDown(card, { key: 'Escape' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when a closed/draft card is clicked or keydown activated', () => {
    const draftForm = { ...mockForm, status: 'draft' as const };
    const { container } = render(<FormCard form={draftForm} />);
    const card = container.firstElementChild as HTMLElement;

    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('copies the form link and does not navigate when share is clicked (no native share)', async () => {
    mockClipboardWriteText.mockResolvedValueOnce(undefined);

    render(<FormCard form={mockForm} />);

    fireEvent.click(screen.getByRole('button', { name: /Share Test Form/i }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith('http://localhost:3000/forms/test-form');
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Form link copied to clipboard.');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an error toast when clipboard copy fails', async () => {
    mockClipboardWriteText.mockRejectedValueOnce(new Error('clipboard failed'));

    render(<FormCard form={mockForm} />);

    fireEvent.click(screen.getByRole('button', { name: /Share Test Form/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Failed to share form link.');
    });
  });

  it('uses native sharing when available', async () => {
    mockNativeShare.mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });

    render(<FormCard form={mockForm} />);

    fireEvent.click(screen.getByRole('button', { name: /Share Test Form/i }));

    await waitFor(() => {
      expect(mockNativeShare).toHaveBeenCalledWith({
        title: 'Test Form',
        url: 'http://localhost:3000/forms/test-form',
      });
    });
    expect(mockClipboardWriteText).not.toHaveBeenCalled();
  });

  it('does not show error when native sharing is cancelled by user (AbortError)', async () => {
    mockNativeShare.mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'));
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });

    render(<FormCard form={mockForm} />);

    fireEvent.click(screen.getByRole('button', { name: /Share Test Form/i }));

    await waitFor(() => {
      expect(mockNativeShare).toHaveBeenCalled();
    });
    expect(mockClipboardWriteText).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when native sharing fails with general error', async () => {
    mockNativeShare.mockRejectedValueOnce(new Error('native share failed'));
    mockClipboardWriteText.mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });

    render(<FormCard form={mockForm} />);

    fireEvent.click(screen.getByRole('button', { name: /Share Test Form/i }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith('http://localhost:3000/forms/test-form');
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Form link copied to clipboard.');
  });

  it('falls back to clipboard when navigator.canShare returns false', async () => {
    mockNativeShare.mockResolvedValueOnce(undefined);
    mockClipboardWriteText.mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: mockNativeShare,
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    render(<FormCard form={mockForm} />);

    fireEvent.click(screen.getByRole('button', { name: /Share Test Form/i }));

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith('http://localhost:3000/forms/test-form');
    });
    expect(mockNativeShare).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('Form link copied to clipboard.');
  });
});
