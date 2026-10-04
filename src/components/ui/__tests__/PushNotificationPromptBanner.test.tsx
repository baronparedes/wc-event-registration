import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TIMING } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { usePushSubscription } from '@/hooks/domain/notifications';

import {
  PUSH_PROMPT_SNOOZE_STORAGE_KEY,
  PushNotificationPromptBanner,
} from '../PushNotificationPromptBanner';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/notifications', () => ({
  usePushSubscription: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PushNotificationPromptBanner', () => {
  const mockSubscribeAsync = vi.fn();
  const mockUnsubscribeAsync = vi.fn();

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

    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      isLoading: false,
      subscribeAsync: mockSubscribeAsync,
      unsubscribeAsync: mockUnsubscribeAsync,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });
  });

  it('does not render if user is not signed in', () => {
    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        isAuthenticated: false,
        session: null,
      },
    } as never);

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render if push is not supported', () => {
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: false,
      isSubscribed: false,
      isLoading: false,
      subscribeAsync: mockSubscribeAsync,
      unsubscribeAsync: mockUnsubscribeAsync,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render if already subscribed', () => {
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: true,
      isLoading: false,
      subscribeAsync: mockSubscribeAsync,
      unsubscribeAsync: mockUnsubscribeAsync,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    });

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render if browser notification permission was denied', () => {
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'denied',
      },
    });

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render if snoozed in localStorage within 14 days', () => {
    const futureTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(PUSH_PROMPT_SNOOZE_STORAGE_KEY, JSON.stringify(String(futureTime)));

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs + 500);
    });

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('renders after the timing delay when all conditions are met', () => {
    render(<PushNotificationPromptBanner />);

    // Initially not visible before timer
    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();

    // Advance timer past delay
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs);
    });

    expect(
      screen.getByRole('region', { name: /Device notification subscription prompt/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Enable Device Notifications')).toBeInTheDocument();
  });

  it('snoozes for 14 days and dismisses when "Not now" is clicked', () => {
    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs);
    });

    const notNowButton = screen.getByRole('button', { name: /Not now/i });
    fireEvent.click(notNowButton);

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();

    const storedSnoozeRaw = localStorage.getItem(PUSH_PROMPT_SNOOZE_STORAGE_KEY);
    expect(storedSnoozeRaw).not.toBeNull();
    const storedSnooze = Number(JSON.parse(storedSnoozeRaw!));
    expect(storedSnooze).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000);
  });

  it('snoozes for 14 days and dismisses when the close "X" button is clicked', () => {
    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs);
    });

    const closeButton = screen.getByRole('button', { name: /Dismiss notification prompt/i });
    fireEvent.click(closeButton);

    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();

    const storedSnoozeRaw = localStorage.getItem(PUSH_PROMPT_SNOOZE_STORAGE_KEY);
    expect(storedSnoozeRaw).not.toBeNull();
    const storedSnooze = Number(JSON.parse(storedSnoozeRaw!));
    expect(storedSnooze).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000);
  });

  it('subscribes successfully and shows success toast when "Enable notifications" is clicked', async () => {
    mockSubscribeAsync.mockResolvedValueOnce(true);

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs);
    });

    const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
    await act(async () => {
      fireEvent.click(enableButton);
    });

    expect(mockSubscribeAsync).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      'Successfully subscribed this device to notifications!',
    );
    expect(
      screen.queryByRole('region', { name: /Device notification subscription prompt/i }),
    ).not.toBeInTheDocument();
  });

  it('handles subscription error with error toast', async () => {
    mockSubscribeAsync.mockRejectedValueOnce(new Error('Permission denied'));

    render(<PushNotificationPromptBanner />);
    act(() => {
      vi.advanceTimersByTime(TIMING.pushNotificationPromptDelayMs);
    });

    const enableButton = screen.getByRole('button', { name: /Enable notifications/i });
    await act(async () => {
      fireEvent.click(enableButton);
    });

    expect(mockSubscribeAsync).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Permission denied');
  });
});
