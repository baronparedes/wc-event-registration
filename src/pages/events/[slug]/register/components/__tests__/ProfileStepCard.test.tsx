import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMemberLookupProfile } from '@/__tests__/factories';

import { ProfileStepCard } from '../ProfileStepCard';

const matchedMember = makeMemberLookupProfile();

describe('ProfileStepCard', () => {
  it('shows the placeholder before lookup and when details are fading', () => {
    render(<ProfileStepCard matchedMember={null} />);

    expect(screen.getByText('Your details will appear here after Step 1.')).toBeInTheDocument();
  });

  it('renders the update state and scrolls into view when registration is blocked', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    const scrollIntoView = vi.fn();

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      writable: true,
      value: scrollIntoView,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMedia,
    });

    render(<ProfileStepCard matchedMember={matchedMember} isUpdateMode isRegistrationBlocked />);

    const status = screen.getByText(
      'You are already registered. No further actions are needed at the moment.',
    );
    expect(status).toBeInTheDocument();
    expect(
      screen.getByText('Your registration is already complete for this event.'),
    ).toBeInTheDocument();
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
  });

  it('shows the fading placeholder when details are hidden', () => {
    render(<ProfileStepCard matchedMember={matchedMember} shouldFadeDetails />);

    expect(screen.getByText('Your details will appear here after Step 1.')).toBeInTheDocument();
  });

  it('shows the regular verified state', () => {
    render(<ProfileStepCard matchedMember={matchedMember} />);

    expect(screen.getByText('Review your details below.')).toBeInTheDocument();
    expect(screen.getByText('Tap "Yes, I confirm" to continue to Step 3.')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText(matchedMember.role)).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText(matchedMember.category)).toBeInTheDocument();
  });

  describe('countdown timer message branches', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the blocked message when isRegistrationBlocked is true', async () => {
      render(
        <ProfileStepCard
          matchedMember={matchedMember}
          isRegistrationBlocked
          countdownMs={30_000}
          onTimeout={vi.fn()}
        />,
      );

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(screen.getByText('Returning to Step 1 in 30s.')).toBeInTheDocument();
    });

    it('shows the waiting message when canContinueToStepThree is true', async () => {
      render(
        <ProfileStepCard
          matchedMember={matchedMember}
          onContinueToStepThree={vi.fn()}
          countdownMs={30_000}
          onTimeout={vi.fn()}
        />,
      );

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(
        screen.getByText('Returning to Step 1 in 30s if no one continues.'),
      ).toBeInTheDocument();
    });

    it('shows the incomplete-registration message when no action is available', async () => {
      render(
        <ProfileStepCard matchedMember={matchedMember} countdownMs={30_000} onTimeout={vi.fn()} />,
      );

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(
        screen.getByText('Returning to Step 1 in 30s if this registration is not completed.'),
      ).toBeInTheDocument();
    });
  });
});
