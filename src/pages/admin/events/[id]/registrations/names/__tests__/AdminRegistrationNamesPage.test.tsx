import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeRegistrationSharePayloadRow } from '@/__tests__/factories';

import { AdminRegistrationNamesPage } from '../index';

// ---------------------------------------------------------------------------
// Hoist mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockUseSearchParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseRegistrationNamesQuery: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mocks.mockUseParams(),
    useSearchParams: () => mocks.mockUseSearchParams(),
    Navigate: (props: { to: string; replace?: boolean }) => {
      mocks.mockNavigate(props.to);
      return null;
    },
  };
});

vi.mock('@/hooks/domain/registrations', async () => {
  const actual = await vi.importActual('@/hooks/domain/registrations');
  return {
    ...actual,
    useRegistrationNamesQuery: (...args: unknown[]) => mocks.mockUseRegistrationNamesQuery(...args),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

function makePayload(
  rows = [makeRegistrationSharePayloadRow(), makeRegistrationSharePayloadRow()],
) {
  return {
    event_title: 'Test Event',
    row_count: rows.length,
    answer_fields: [],
    rows,
  };
}

function setupDefaults(fields = 'full_name', answerFields = '') {
  mocks.mockUseParams.mockReturnValue({ id: 'event-1' });
  mocks.mockUseSearchParams.mockReturnValue([
    new URLSearchParams(`fields=${fields}${answerFields ? `&answerFields=${answerFields}` : ''}`),
    vi.fn(),
  ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AdminRegistrationNamesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult());
  });

  describe('guard — direct navigation protection', () => {
    it('redirects to registrations page when fields param is absent', () => {
      mocks.mockUseParams.mockReturnValue({ id: 'event-1' });
      mocks.mockUseSearchParams.mockReturnValue([new URLSearchParams(''), vi.fn()]);

      render(<AdminRegistrationNamesPage />);

      expect(mocks.mockNavigate).toHaveBeenCalledWith('/admin/events/event-1/registrations');
    });

    it('redirects to registrations page when fields param is empty string', () => {
      mocks.mockUseParams.mockReturnValue({ id: 'event-1' });
      mocks.mockUseSearchParams.mockReturnValue([new URLSearchParams('fields='), vi.fn()]);

      render(<AdminRegistrationNamesPage />);

      expect(mocks.mockNavigate).toHaveBeenCalledWith('/admin/events/event-1/registrations');
    });

    it('redirects to admin events when eventId is also missing', () => {
      mocks.mockUseParams.mockReturnValue({ id: undefined });
      mocks.mockUseSearchParams.mockReturnValue([new URLSearchParams(''), vi.fn()]);

      render(<AdminRegistrationNamesPage />);

      expect(mocks.mockNavigate).toHaveBeenCalledWith('/admin/events');
    });

    it('does not redirect when fields param is valid', () => {
      setupDefaults('full_name');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<AdminRegistrationNamesPage />);

      expect(mocks.mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows loading text while query is in flight', () => {
      setupDefaults();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ isLoading: true }));

      render(<AdminRegistrationNamesPage />);

      expect(screen.getByText(/loading registrations/i)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when query fails', () => {
      setupDefaults();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ isError: true }));

      render(<AdminRegistrationNamesPage />);

      expect(screen.getByText(/failed to load registrations/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when payload has no rows', () => {
      setupDefaults();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload([]) }),
      );

      render(<AdminRegistrationNamesPage />);

      expect(screen.getByText(/no registrations found/i)).toBeInTheDocument();
    });
  });

  describe('table rendering', () => {
    it('renders the Print / Save as PDF button', async () => {
      setupDefaults('full_name,member_id');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
      });
    });

    it('renders table column headers for selected core fields', async () => {
      setupDefaults('full_name,member_id,email');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'Full Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Member ID' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
      });
    });

    it('renders a row number column header', async () => {
      setupDefaults();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(makeQueryResult({ data: makePayload() }));

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
      });
    });

    it('renders rows sorted A-Z by full name', async () => {
      const rowA = makeRegistrationSharePayloadRow({ full_name: 'Zara Smith' });
      const rowB = makeRegistrationSharePayloadRow({ full_name: 'Aaron Jones' });
      setupDefaults('full_name');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload([rowA, rowB]) }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        const cells = screen.getAllByRole('cell');
        const nameCells = cells.filter(
          (cell) => cell.textContent === 'Aaron Jones' || cell.textContent === 'Zara Smith',
        );
        expect(nameCells[0]).toHaveTextContent('Aaron Jones');
        expect(nameCells[1]).toHaveTextContent('Zara Smith');
      });
    });

    it('renders dynamic answer field column headers', async () => {
      const fieldId = 'field-uuid-1';
      setupDefaults('full_name', fieldId);
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({
          data: {
            event_title: 'Test Event',
            row_count: 1,
            answer_fields: [{ field_id: fieldId, label: 'T-Shirt Size' }],
            rows: [makeRegistrationSharePayloadRow({ answer_values: { [fieldId]: 'Large' } })],
          },
        }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'T-Shirt Size' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'Large' })).toBeInTheDocument();
      });
    });

    it('shows event title and registrant count in the header', async () => {
      const rows = [makeRegistrationSharePayloadRow(), makeRegistrationSharePayloadRow()];
      setupDefaults();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload(rows) }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByText(/test event/i)).toBeInTheDocument();
        expect(screen.getByText(/2 registrants/i)).toBeInTheDocument();
      });
    });

    it('shows singular "registrant" label when only one registrant', async () => {
      const rows = [makeRegistrationSharePayloadRow()];
      setupDefaults();
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload(rows) }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByText(/1 registrant(?!\s)/)).toBeInTheDocument();
      });
    });

    it('renders row numbers starting from 1', async () => {
      const rows = [makeRegistrationSharePayloadRow(), makeRegistrationSharePayloadRow()];
      setupDefaults('full_name');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload(rows) }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        const cells = screen.getAllByRole('cell');
        const numberCells = cells.filter((cell) => /^[12]$/.test(cell.textContent || ''));
        expect(numberCells.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('renders missing field values as dashes', async () => {
      const row = makeRegistrationSharePayloadRow({ member_id: undefined });
      setupDefaults('full_name,member_id');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload([row]) }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        const cells = screen.getAllByRole('cell');
        const dashCells = cells.filter((cell) => cell.textContent === '—');
        expect(dashCells.length).toBeGreaterThan(0);
      });
    });

    it('renders missing answer field values as dashes', async () => {
      const fieldId = 'field-uuid-1';
      setupDefaults('full_name', fieldId);
      const row = makeRegistrationSharePayloadRow({ answer_values: {} }); // No answer value
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({
          data: {
            event_title: 'Test Event',
            row_count: 1,
            answer_fields: [{ field_id: fieldId, label: 'T-Shirt Size' }],
            rows: [row],
          },
        }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        const cells = screen.getAllByRole('cell');
        const dashCells = cells.filter((cell) => cell.textContent === '—');
        expect(dashCells.length).toBeGreaterThan(0);
      });
    });

    it('formats selected status and datetime core fields for display', async () => {
      const row = makeRegistrationSharePayloadRow({
        full_name: 'Pat Garcia',
        registration_status: 'updated',
        submitted_at: '2026-07-12T03:30:00.000Z',
        updated_at: '2026-07-12T06:00:00.000Z',
      });

      setupDefaults('full_name,registration_status,submitted_at,updated_at');
      mocks.mockUseRegistrationNamesQuery.mockReturnValue(
        makeQueryResult({ data: makePayload([row]) }),
      );

      render(<AdminRegistrationNamesPage />);

      await waitFor(() => {
        expect(screen.getByRole('cell', { name: 'Updated' })).toBeInTheDocument();
        expect(
          screen.getAllByRole('cell').some((cell) => /2026/.test(cell.textContent || '')),
        ).toBe(true);
      });
    });
  });
});
