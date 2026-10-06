import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TIMING } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { usePwaInstallPrompt } from '@/hooks/utils/usePwaInstallPrompt';

import { PWAInstallPromptBanner, PWA_PROMPT_SNOOZE_STORAGE_KEY } from '../PWAInstallPromptBanner';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/utils/usePwaInstallPrompt', () => ({
  usePwaInstallPrompt: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PWAInstallPromptBanner', () => {
  const mockPromptToInstall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();

    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        isAuthenticated: true,
        session: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
          },
        },
      },
    } as never);

    vi.mocked(usePwaInstallPrompt).mockReturnValue({
      canInstall: true,
      isStandalone: false,
      isAppInstalled: false,
      isIOS: false,
      hasNativePrompt: true,
      promptToInstall: mockPromptToInstall,
    });
  });

  it('does not render if user is not signed in', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        isAuthenticated: false,
        session: null,
      },
    } as never);

    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render if canInstall is false', () => {
    vi.mocked(usePwaInstallPrompt).mockReturnValue({
      canInstall: false,
      isStandalone: false,
      isAppInstalled: false,
      isIOS: false,
      hasNativePrompt: false,
      promptToInstall: mockPromptToInstall,
    });

    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render if snoozed in localStorage', () => {
    const futureTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(PWA_PROMPT_SNOOZE_STORAGE_KEY, JSON.stringify(String(futureTime)));

    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('renders after the timing delay when all conditions are met', () => {
    render(<PWAInstallPromptBanner />);

    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs);
    });

    expect(screen.getByRole('region', { name: /App installation prompt/i })).toBeInTheDocument();
    expect(screen.getByText('Install Welcome Hub')).toBeInTheDocument();
  });

  it('snoozes for 14 days when "Not now" is clicked', () => {
    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs);
    });

    const notNowButton = screen.getByRole('button', { name: /Not now/i });
    fireEvent.click(notNowButton);

    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();

    const storedSnoozeRaw = localStorage.getItem(PWA_PROMPT_SNOOZE_STORAGE_KEY);
    expect(storedSnoozeRaw).not.toBeNull();
    const storedSnooze = Number(JSON.parse(storedSnoozeRaw!));
    expect(storedSnooze).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000);
  });

  it('snoozes for 14 days when the close button is clicked', () => {
    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs);
    });

    const closeButton = screen.getByRole('button', { name: /Dismiss app install prompt/i });
    fireEvent.click(closeButton);

    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();

    const storedSnoozeRaw = localStorage.getItem(PWA_PROMPT_SNOOZE_STORAGE_KEY);
    expect(storedSnoozeRaw).not.toBeNull();
  });

  it('triggers promptToInstall and shows success toast when accepted', async () => {
    mockPromptToInstall.mockResolvedValueOnce({ outcome: 'accepted' });

    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs);
    });

    const installButton = screen.getByRole('button', { name: /Install app/i });
    await act(async () => {
      fireEvent.click(installButton);
    });

    expect(mockPromptToInstall).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Thank you for installing Welcome Hub!');
    expect(
      screen.queryByRole('region', { name: /App installation prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('opens guide modal on iOS devices when "How to install" is clicked', async () => {
    vi.mocked(usePwaInstallPrompt).mockReturnValue({
      canInstall: true,
      isStandalone: false,
      isAppInstalled: false,
      isIOS: true,
      hasNativePrompt: false,
      promptToInstall: mockPromptToInstall.mockResolvedValueOnce({ outcome: 'manual_guide' }),
    });

    render(<PWAInstallPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pwaInstallPromptDelayMs);
    });

    const howToInstallButton = screen.getByRole('button', { name: /How to install/i });
    await act(async () => {
      fireEvent.click(howToInstallButton);
    });

    expect(screen.getByText(/Follow these quick steps in Safari/i)).toBeInTheDocument();

    // Clicking "Got it" closes and snoozes
    const gotItButton = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(gotItButton);

    expect(screen.queryByText(/Follow these quick steps in Safari/i)).not.toBeInTheDocument();
    const storedSnoozeRaw = localStorage.getItem(PWA_PROMPT_SNOOZE_STORAGE_KEY);
    expect(storedSnoozeRaw).not.toBeNull();
  });
});
