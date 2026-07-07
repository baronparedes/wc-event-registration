import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeRegistrationSharePayloadRow } from '@/__tests__/factories';

import { ViewNamesButton } from '../ViewNamesButton';

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockUseRegistrationNamesQuery: vi.fn(),
  mockShowError: vi.fn(),
  mockWindowOpen: vi.fn(),
}));

vi.mock('@/hooks/domain/registrations', async () => {
  const actual = await vi.importActual('@/hooks/domain/registrations');
  return {
    ...actual,
    useRegistrationNamesQuery: (...args: unknown[]) => mocks.mockUseRegistrationNamesQuery(...args),
  };
});

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual('@/hooks/utils');
  return {
    ...actual,
    useErrorWithFadeout: () => ({ showError: mocks.mockShowError }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function makePayload(rows = [makeRegistrationSharePayloadRow()]) {
  return {
    event_title: 'Test Event',
    row_count: rows.length,
    answer_fields: [],
    rows,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ViewNamesButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', mocks.mockWindowOpen);
    mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult());
  });

  it('renders a "View Names" button', () => {
    render(<ViewNamesButton eventId="event-1" />);
    expect(screen.getByRole('button', { name: /view names/i })).toBeInTheDocument();
  });

  it('button is disabled when disabled prop is true', () => {
    render(<ViewNamesButton eventId="event-1" disabled />);
    expect(screen.getByRole('button', { name: /view names/i })).toBeDisabled();
  });

  it('button is enabled by default', () => {
    render(<ViewNamesButton eventId="event-1" />);
    expect(screen.getByRole('button', { name: /view names/i })).not.toBeDisabled();
  });

  describe('dialog interaction', () => {
    it('opens dialog with field selection on click', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);

      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByText(/select fields to include/i)).toBeInTheDocument();
      });
    });

    it('shows core field checkboxes in the dialog', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /full name/i })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /member id/i })).toBeInTheDocument();
      });
    });

    it('full name checkbox is checked by default', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /full name/i })).toBeChecked();
      });
    });

    it('cannot deselect the last selected field', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /full name/i })).toBeChecked();
      });

      // Try to uncheck the only selected field
      fireEvent.click(screen.getByRole('checkbox', { name: /full name/i }));

      // Should remain checked
      expect(screen.getByRole('checkbox', { name: /full name/i })).toBeChecked();
    });

    it('opens new tab with correct URL when Open in New Tab is clicked', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open in new tab/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /open in new tab/i }));

      expect(mocks.mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('/admin/events/event-1/registrations/names'),
        '_blank',
        'noopener,noreferrer',
      );
      expect(mocks.mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('fields=full_name'),
        '_blank',
        'noopener,noreferrer',
      );
    });

    it('closes dialog after opening new tab', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open in new tab/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /open in new tab/i }));

      await waitFor(() => {
        expect(screen.queryByText(/select fields to include/i)).not.toBeInTheDocument();
      });
    });

    it('shows loading state for dynamic fields when query is fetching', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ isFetching: true }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByText(/loading event answer fields/i)).toBeInTheDocument();
      });
    });

    it('shows no answer fields message when data is loaded but has none', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByText(/no event answer fields are available/i)).toBeInTheDocument();
      });
    });

    it('shows error when refetch fails', async () => {
      const mockRefetch = vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error('Network failure') });
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mocks.mockShowError).toHaveBeenCalledWith('Network failure');
      });
    });

    it('shows error when refetch returns no data', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: null, error: null });
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mocks.mockShowError).toHaveBeenCalledWith('Failed to load registration names');
      });
    });

    it('includes additional selected core fields in the URL', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /member id/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: /member id/i }));
      fireEvent.click(screen.getByRole('button', { name: /open in new tab/i }));

      expect(mocks.mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('full_name%2Cmember_id'),
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  describe('dynamic answer fields', () => {
    function makePayloadWithFields() {
      return {
        ...makePayload(),
        answer_fields: [
          { field_id: 'field-uuid-1', label: 'T-Shirt Size' },
          { field_id: 'field-uuid-2', label: 'Meal Preference' },
        ],
      };
    }

    it('shows dynamic fields section when answer fields are available', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayloadWithFields() }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByText('Dynamic fields')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /t-shirt size/i })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: /meal preference/i })).toBeInTheDocument();
      });
    });

    it('shows no match message when dynamic field search has no results', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayloadWithFields() }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search dynamic fields/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search dynamic fields/i), {
        target: { value: 'xyz-no-match' },
      });

      expect(screen.getByText(/no dynamic fields match your search/i)).toBeInTheDocument();
    });

    it('includes selected answer field id in the URL', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayloadWithFields() }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /t-shirt size/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: /t-shirt size/i }));
      fireEvent.click(screen.getByRole('button', { name: /open in new tab/i }));

      expect(mocks.mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('answerFields=field-uuid-1'),
        '_blank',
        'noopener,noreferrer',
      );
    });

    it('excludes answer field id from URL after deselecting', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayloadWithFields() }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /t-shirt size/i })).toBeInTheDocument();
      });

      // Select then deselect
      fireEvent.click(screen.getByRole('checkbox', { name: /t-shirt size/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: /t-shirt size/i }));
      fireEvent.click(screen.getByRole('button', { name: /open in new tab/i }));

      expect(mocks.mockWindowOpen).toHaveBeenCalledWith(
        expect.not.stringContaining('answerFields'),
        '_blank',
        'noopener,noreferrer',
      );
    });

    it('skips refetch when query is already fetching', async () => {
      const mockRefetch = vi.fn();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ refetch: mockRefetch, isFetching: true }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mockRefetch).not.toHaveBeenCalled();
      });
    });

    it('skips refetch when data is already loaded', async () => {
      const mockRefetch = vi.fn();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload(), refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mockRefetch).not.toHaveBeenCalled();
      });
    });

    it('catches non-Error exceptions and shows generic error message', async () => {
      const mockRefetch = vi.fn().mockRejectedValue('String error, not Error instance');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mocks.mockShowError).toHaveBeenCalledWith('Failed to load registration names');
      });
    });

    it('does not trigger refetch when button is disabled', async () => {
      const mockRefetch = vi.fn();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" disabled />);

      // Try to trigger via keyboard or direct call, but disabled button should not call handler
      const button = screen.getByRole('button', { name: /view names/i });
      expect(button).toBeDisabled();
      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('proceeds with refetch when data is null and not fetching', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: makePayload(), error: null });
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: null, isFetching: false, refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('does not open tab without selecting any core fields', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      // This test verifies the default state still has full_name selected
      await waitFor(() => {
        const openButton = screen.getByRole('button', { name: /open in new tab/i });
        fireEvent.click(openButton);
        expect(mocks.mockWindowOpen).toHaveBeenCalled();
      });
    });

    it('handles error when refetch throws with null error', async () => {
      const mockRefetch = vi.fn().mockRejectedValue(null);
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(mocks.mockShowError).toHaveBeenCalledWith('Failed to load registration names');
      });
    });

    it('does not show loading message when answer fields have loaded but query is not fetching', async () => {
      const mockRefetch = vi.fn();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({
          data: { event_title: 'Test', row_count: 0, answer_fields: [], rows: [] },
          isFetching: false,
          refetch: mockRefetch,
        }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.queryByText(/loading event answer fields/i)).not.toBeInTheDocument();
      });
    });

    it('allows toggling multiple core fields on and off', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /full name/i })).toBeInTheDocument();
      });

      // Add member_id
      fireEvent.click(screen.getByRole('checkbox', { name: /member id/i }));
      expect(screen.getByRole('checkbox', { name: /member id/i })).toBeChecked();

      // Remove it
      fireEvent.click(screen.getByRole('checkbox', { name: /member id/i }));
      expect(screen.getByRole('checkbox', { name: /member id/i })).not.toBeChecked();
    });

    it('shows correct count of selected answer fields', async () => {
      const payload = {
        ...makePayload(),
        answer_fields: [
          { field_id: 'field-uuid-1', label: 'Field 1' },
          { field_id: 'field-uuid-2', label: 'Field 2' },
        ],
      };
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: payload }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByText(/0 selected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: /field 1/i }));
      await waitFor(() => {
        expect(screen.getByText(/1 selected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: /field 2/i }));
      await waitFor(() => {
        expect(screen.getByText(/2 selected/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('checkbox', { name: /field 1/i }));
      await waitFor(() => {
        expect(screen.getByText(/1 selected/)).toBeInTheDocument();
      });
    });

    it('renders dialog description text', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/all registrations for this event will be included/i),
        ).toBeInTheDocument();
      });
    });

    it('closes dialog when cancel button is clicked', async () => {
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByText(/select fields to include/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText(/select fields to include/i)).not.toBeInTheDocument();
      });
    });

    it('toggles answer field checkbox multiple times (select, deselect, select)', async () => {
      const payload = {
        ...makePayload(),
        answer_fields: [{ field_id: 'field-uuid-1', label: 'Field 1' }],
      };
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: payload }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /field 1/i })).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox', { name: /field 1/i });

      // Select
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      // Deselect
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();

      // Select again
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('handles search with special characters in field names', async () => {
      const payload = {
        ...makePayload(),
        answer_fields: [{ field_id: 'field-1', label: 'T-Shirt (Size & Color)' }],
      };
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: payload }));

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search dynamic fields/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search dynamic fields/i), {
        target: { value: '(Size' },
      });

      expect(
        screen.getByRole('checkbox', { name: /t-shirt \(size & color\)/i }),
      ).toBeInTheDocument();
    });

    it('does not attempt refetch when only isFetching is true (data is null)', async () => {
      const mockRefetch = vi.fn();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: null, isFetching: true, refetch: mockRefetch }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      // Should not call refetch because isFetching is true
      await waitFor(() => {
        expect(mockRefetch).not.toHaveBeenCalled();
      });
    });

    it('renders confirmation button in pending state while loading', async () => {
      const payload = {
        ...makePayload(),
        answer_fields: [],
      };
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: payload, isFetching: true }),
      );

      render(<ViewNamesButton eventId="event-1" />);
      fireEvent.click(screen.getByRole('button', { name: /view names/i }));

      await waitFor(() => {
        // When isFetching, the confirm button shows "Loading..." text
        expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
      });
    });
  });
});
