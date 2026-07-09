import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WizardStep } from '../WizardStep';

describe('WizardStep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders title and children', () => {
    render(
      <WizardStep title="Step 1: Find Your Profile">
        <p>Step content</p>
      </WizardStep>,
    );

    expect(screen.getByText('Step 1: Find Your Profile')).toBeInTheDocument();
    expect(screen.getByText('Step content')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <WizardStep title="Step 1" subtitle="How do you want to search?">
        <p>content</p>
      </WizardStep>,
    );

    expect(screen.getByText('How do you want to search?')).toBeInTheDocument();
  });

  it('shows countdown message after timer starts', async () => {
    const onCountdownTimeout = vi.fn();

    render(
      <WizardStep
        title="Step 2"
        countdownMs={5000}
        onCountdownTimeout={onCountdownTimeout}
        countdownTimerMessage={(s) => `Returning in ${s}s.`}
      >
        <p>content</p>
      </WizardStep>,
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText(/Returning in/)).toBeInTheDocument();
  });

  it('shows inactivity message after timer starts', async () => {
    const onInactivityTimeout = vi.fn();

    render(
      <WizardStep
        title="Step 1"
        inactivityTimeoutMs={10000}
        onInactivityTimeout={onInactivityTimeout}
        inactivityTimerMessage={(s) => `Session expires in ${s}s.`}
      >
        <p>content</p>
      </WizardStep>,
    );

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText(/Session expires in/)).toBeInTheDocument();
  });

  it('does not render timer messages when no timer props are provided', () => {
    render(
      <WizardStep title="Step 1">
        <p>content</p>
      </WizardStep>,
    );

    expect(screen.queryByText(/Resetting in/)).toBeNull();
  });
});
