import { createRef } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberLookupStepCard } from '../MemberLookupStepCard';

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../NameLookupModal', () => ({
  NameLookupModal: ({ onSubmit }: { onSubmit: (name: string) => void }) => (
    <button type="button" onClick={() => onSubmit('Baron Paredes')}>
      Submit Name Lookup
    </button>
  ),
}));

type LookupValues = { memberId?: string; name?: string };

function renderCard(
  options: {
    allowNameLookup?: boolean;
    allowMemberRegistration?: boolean;
    allowPublicRegistration?: boolean;
    slug?: string;
    lookupErrorMessage?: string | null;
    suppressLookupWarning?: boolean;
    shouldHighlightInput?: boolean;
    onLookupSubmit?: SubmitHandler<LookupValues>;
    onDismissLookupError?: () => void;
  } = {},
) {
  const onLookupSubmit = options.onLookupSubmit ?? vi.fn(async () => undefined);
  const onDismissLookupError = options.onDismissLookupError ?? vi.fn();

  function Host() {
    const lookupForm = useForm<LookupValues>({ defaultValues: { memberId: '', name: '' } });

    return (
      <MemberLookupStepCard
        slug={options.slug}
        lookupForm={lookupForm}
        onLookupSubmit={onLookupSubmit}
        isLookupPending={false}
        lookupErrorMessage={options.lookupErrorMessage ?? null}
        suppressLookupWarning={options.suppressLookupWarning ?? false}
        memberIdInputRef={createRef<HTMLInputElement>()}
        shouldHighlightInput={options.shouldHighlightInput ?? false}
        onDismissLookupError={onDismissLookupError}
        allowNameLookup={options.allowNameLookup ?? true}
        allowMemberRegistration={options.allowMemberRegistration ?? true}
        allowPublicRegistration={options.allowPublicRegistration ?? false}
      />
    );
  }

  render(
    <MemoryRouter>
      <Host />
    </MemoryRouter>,
  );

  return { onLookupSubmit, onDismissLookupError };
}

describe('MemberLookupStepCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with method selector when name lookup is allowed', () => {
    renderCard({ allowNameLookup: true });

    expect(screen.getByRole('button', { name: /Scan via RFID reader/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search by my name/i })).toBeInTheDocument();
  });

  it('starts directly in ID mode when name lookup is not allowed', () => {
    renderCard({ allowNameLookup: false, shouldHighlightInput: true });

    const input = screen.getByPlaceholderText('Scan or enter your Member ID');
    expect(input).toBeInTheDocument();
    expect(input.className).toContain('ring-2');
  });

  it('submits ID lookup form', async () => {
    const { onLookupSubmit } = renderCard({ allowNameLookup: false });

    fireEvent.change(screen.getByPlaceholderText('Scan or enter your Member ID'), {
      target: { value: 'WC-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(onLookupSubmit).toHaveBeenCalled();
    });
  });

  it('returns to method selector from ID mode via try-different-way', () => {
    renderCard({ allowNameLookup: true });

    fireEvent.click(screen.getByRole('button', { name: /Scan via RFID reader/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Try a different way' }));

    expect(screen.getByRole('button', { name: /Search by my name/i })).toBeInTheDocument();
  });

  it('switches to name lookup and submits through name modal callback', async () => {
    const { onLookupSubmit } = renderCard({ allowNameLookup: true });

    fireEvent.click(screen.getByRole('button', { name: /Search by my name/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Name Lookup' }));

    await waitFor(() => {
      expect(onLookupSubmit).toHaveBeenCalledWith({ memberId: undefined, name: 'Baron Paredes' });
    });
  });

  it('returns to method selector from name mode via try-different-way', () => {
    renderCard({ allowNameLookup: true });

    fireEvent.click(screen.getByRole('button', { name: /Search by my name/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Try a different way' }));

    expect(screen.getByRole('button', { name: /Scan via RFID reader/i })).toBeInTheDocument();
  });

  it('shows guest registration link and navigates to public registration', () => {
    renderCard({ allowPublicRegistration: true, slug: 'sample-event' });

    fireEvent.click(screen.getByRole('button', { name: 'Not a Member? Register as guest' }));

    expect(mockNavigate).toHaveBeenCalledWith('/events/sample-event/register-public');
  });

  it('shows public-only notice and CTA when member registration is disabled', () => {
    renderCard({
      allowNameLookup: false,
      allowMemberRegistration: false,
      allowPublicRegistration: true,
      slug: 'sample-event',
    });

    expect(
      screen.getByText('This event is currently set to public-only registration.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue as Guest' }));
    expect(mockNavigate).toHaveBeenCalledWith('/events/sample-event/register-public');
  });

  it('passes lookup warning message to error alert and supports dismiss callback', () => {
    const onDismissLookupError = vi.fn();

    renderCard({
      allowNameLookup: false,
      lookupErrorMessage: 'Profile not found',
      onDismissLookupError,
    });

    expect(screen.getByText('Profile not found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss member lookup warning' }));
    expect(onDismissLookupError).toHaveBeenCalledTimes(1);
  });
});
