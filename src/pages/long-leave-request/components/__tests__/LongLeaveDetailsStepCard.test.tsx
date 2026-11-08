import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import type { LongLeaveFormValues } from '@/pages/long-leave-request/hooks/useLongLeaveRequestPageState';

import { LongLeaveDetailsStepCard } from '../LongLeaveDetailsStepCard';

// Mock SundayCalendarPicker
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>('@/components/ui');
  return {
    ...actual,
    SundayCalendarPicker: ({
      id,
      value,
      onChange,
      minDate,
    }: {
      id: string;
      value: string;
      onChange: (val: string) => void;
      minDate?: Date;
    }) => (
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={minDate ? minDate.toISOString().split('T')[0] : undefined}
        data-testid={`sunday-calendar-${id}`}
      />
    ),
  };
});

function TestComponent({
  onSubmit,
  onCancel,
  submitErrorMessage,
}: {
  onSubmit: (data: LongLeaveFormValues) => Promise<void>;
  onCancel: () => void;
  submitErrorMessage?: string | null;
}) {
  const form = useForm<LongLeaveFormValues>({
    defaultValues: {
      start_date: '',
      end_date: '',
      reason: '',
    },
    mode: 'onBlur',
  });

  return (
    <LongLeaveDetailsStepCard
      longLeaveForm={form}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={false}
      submitErrorMessage={submitErrorMessage || null}
    />
  );
}

describe('LongLeaveDetailsStepCard', () => {
  it('renders step 3 form with title and subtitle', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByText('Step 3: Long Leave Details')).toBeInTheDocument();
    expect(
      screen.getByText(/Select the start and end Sunday date for your multi-week extended leave/i),
    ).toBeInTheDocument();
  });

  it('renders start and end date inputs with labels', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByLabelText(/Start Sunday/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Sunday/i)).toBeInTheDocument();
    expect(screen.getByText(/Must be a Sunday service date/i)).toBeInTheDocument();
    expect(screen.getByText(/Must be at least 4 weeks from start Sunday/i)).toBeInTheDocument();
  });

  it('renders reason textarea with label and description', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByLabelText(/Reason for Extended Leave/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Please provide details for your coordinators and team leaders/i),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        /e\.g\. Sabbatical, overseas work assignment, maternity\/paternity, medical leave\.\.\./i,
      ),
    ).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: /Submit Long Leave Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('displays submit error message when provided', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const errorMessage = 'Failed to submit request. Please try again.';

    render(
      <TestComponent onSubmit={onSubmit} onCancel={onCancel} submitErrorMessage={errorMessage} />,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('handles date input changes correctly', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    const startInput = screen.getByTestId('sunday-calendar-leave-start-date') as HTMLInputElement;
    const reasonInput = screen.getByPlaceholderText(/e\.g\. Sabbatical/i) as HTMLTextAreaElement;

    await user.type(startInput, '2026-11-13');
    await user.type(reasonInput, 'Medical leave');

    expect(startInput.value).toBe('2026-11-13');
    expect(reasonInput.value).toBe('Medical leave');
  });

  it('calculates and sets end date to 4 weeks after start date', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    const startInput = screen.getByTestId('sunday-calendar-leave-start-date');

    // Set start date to 2026-11-13
    await user.type(startInput, '2026-11-13');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      const endInput = screen.getByTestId('sunday-calendar-leave-end-date') as HTMLInputElement;
      // 4 weeks (28 days) from 2026-11-13 is 2026-12-11
      expect(endInput.value).toBe('2026-12-11');
    });
  });

  it('allows manual override of end date if user changes it', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    const startInput = screen.getByTestId('sunday-calendar-leave-start-date');
    const endInput = screen.getByTestId('sunday-calendar-leave-end-date') as HTMLInputElement;

    await user.type(startInput, '2026-11-13');
    await user.tab();

    await waitFor(() => {
      expect(endInput.value).toBe('2026-12-11');
    });

    // Now manually change end date to a later date
    await user.clear(endInput);
    await user.type(endInput, '2026-12-18');

    expect(endInput.value).toBe('2026-12-18');
  });

  it('displays required field indicators', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    const requiredIndicators = screen.getAllByText('*');
    // Should have at least 3 required fields: start_date, end_date, reason
    expect(requiredIndicators.length).toBeGreaterThanOrEqual(3);
  });

  it('renders form with initial empty values', () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();

    render(<TestComponent onSubmit={onSubmit} onCancel={onCancel} />);

    const startInput = screen.getByTestId('sunday-calendar-leave-start-date') as HTMLInputElement;
    const endInput = screen.getByTestId('sunday-calendar-leave-end-date') as HTMLInputElement;
    const reasonInput = screen.getByPlaceholderText(/e\.g\. Sabbatical/i) as HTMLTextAreaElement;

    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');
    expect(reasonInput.value).toBe('');
  });
});
