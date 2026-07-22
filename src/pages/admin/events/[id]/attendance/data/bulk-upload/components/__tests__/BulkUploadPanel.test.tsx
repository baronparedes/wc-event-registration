import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/attendance/data/bulk-upload/components/BulkUploadPanel';

const { mockUseBulkUpsertAttendanceAnswersMutation } = vi.hoisted(() => ({
  mockUseBulkUpsertAttendanceAnswersMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/attendance', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/attendance')>(
    '@/hooks/domain/attendance',
  );

  return {
    ...actual,
    useBulkUpsertAttendanceAnswersMutation: (...args: unknown[]) =>
      mockUseBulkUpsertAttendanceAnswersMutation(...args),
  };
});

const fields: AttendanceField[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    field_key: 'table_number',
    label: 'Table Number',
    field_type: 'number',
    is_required: true,
    is_active: true,
    display_order: 0,
    options: [],
    validation_rules: { min: 1 },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const selectField: AttendanceField = {
  id: '22222222-2222-4222-8222-222222222222',
  event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  field_key: 'area',
  label: 'Area',
  field_type: 'select',
  is_required: false,
  is_active: true,
  display_order: 1,
  options: [
    { label: '2F', value: '2F' },
    { label: '4F', value: '4F' },
  ],
  validation_rules: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const booleanField: AttendanceField = {
  id: '33333333-3333-4333-8333-333333333333',
  event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  field_key: 'checked',
  label: 'Checked',
  field_type: 'boolean',
  is_required: false,
  is_active: true,
  display_order: 2,
  options: [],
  validation_rules: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const dateField: AttendanceField = {
  id: '44444444-4444-4444-8444-444444444444',
  event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  field_key: 'event_date',
  label: 'Event Date',
  field_type: 'date',
  is_required: false,
  is_active: true,
  display_order: 3,
  options: [],
  validation_rules: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const datetimeField: AttendanceField = {
  id: '55555555-5555-4555-8555-555555555555',
  event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  field_key: 'event_datetime',
  label: 'Event Datetime',
  field_type: 'datetime',
  is_required: false,
  is_active: true,
  display_order: 4,
  options: [],
  validation_rules: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const textField: AttendanceField = {
  id: '66666666-6666-4666-8666-666666666666',
  event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  field_key: 'notes',
  label: 'Notes',
  field_type: 'text',
  is_required: false,
  is_active: true,
  display_order: 5,
  options: [],
  validation_rules: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('BulkUploadPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it('enables import after selecting a file even when local validation fails', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const importButton = screen.getByRole('button', { name: 'Import CSV' });
    expect(importButton).toBeDisabled();

    const fileInput = screen.getByLabelText('CSV file');
    const invalidCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nmember,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Broken Row,',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [invalidCsv] } });

    await waitFor(() => {
      expect(screen.getByText('CSV validation failed')).toBeInTheDocument();
    });

    expect(screen.getByText(/Preview \(1 row\)/)).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
    expect(screen.getByText('Broken Row')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeEnabled();
  });

  it('renders overlay header text only in overlay mode', () => {
    const { rerender } = render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('Bulk CSV Upload')).toBeInTheDocument();

    rerender(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
        displayMode="page"
      />,
    );

    expect(screen.queryByText('Bulk CSV Upload')).not.toBeInTheDocument();
  });

  it('resets staged preview state when the file selection is cleared', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    await screen.findByText(/Preview \(1 row\)/);

    fireEvent.change(fileInput, { target: { files: [] } });

    await waitFor(() => {
      expect(screen.queryByText(/Preview \(1 row\)/)).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/Loaded file:/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeDisabled();
  });

  it('shows raw error text when backend rejection is an unstructured Error message', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('Plain backend failure'));
    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(screen.getByText('Plain backend failure')).toBeInTheDocument();
    });
  });

  it('shows structured backend validation details after import failure', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(
      new Error(
        JSON.stringify({
          success: false,
          error: 'CSV validation failed. Import aborted.',
          details: ['Row 2: Area contains unsupported option value.'],
        }),
      ),
    );

    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview \(1 row\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    await waitFor(() => {
      expect(screen.getByText('Import Attendance CSV')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(
        screen.getByText('Row 2: Area contains unsupported option value.'),
      ).toBeInTheDocument();
    });
  });

  it('shows error text when mutation resolves unsuccessfully without throwing', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: false, error: 'Resolved failure' });
    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(screen.getByText('Resolved failure')).toBeInTheDocument();
    });
  });

  it('opens a confirmation dialog before running the import mutation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true, imported_count: 1 });

    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview \(1 row\)/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));

    expect(mutateAsync).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Import Attendance CSV')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('renders all parsed preview rows without truncating to five', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const csv = [
      'attendee_kind,registration_id,public_registration_id,full_name,table_number',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1,,Name 1,1',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2,,Name 2,2',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3,,Name 3,3',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4,,Name 4,4',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5,,Name 5,5',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6,,Name 6,6',
    ].join('\n');

    const validCsv = new File([csv], 'attendance.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    await waitFor(() => {
      expect(screen.getByText(/Preview \(6 rows\)/)).toBeInTheDocument();
    });

    expect(screen.getByText('Name 6')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6')).toBeInTheDocument();
  });

  it('uses edited preview values when importing', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true, imported_count: 1 });

    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    const tableNumberInput = (await screen.findByDisplayValue('12')) as HTMLInputElement;
    fireEvent.change(tableNumberInput, { target: { value: '42' } });

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        rows: [
          {
            attendee_kind: 'registered',
            registration_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            public_registration_id: undefined,
            answers: {
              table_number: 42,
            },
          },
        ],
      });
    });
  });

  it('renders without overlay chrome in page mode', () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
        displayMode="page"
      />,
    );

    expect(screen.queryByText('Bulk CSV Upload')).not.toBeInTheDocument();
  });

  it('clears preview state when the selected file is removed', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    await screen.findByText(/Preview \(1 row\)/);

    fireEvent.change(fileInput, { target: { files: [] } });

    await waitFor(() => {
      expect(screen.queryByText(/Preview \(1 row\)/)).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/Loaded file:/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeDisabled();
  });

  it('shows parse errors for malformed csv content', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const invalidCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,"Broken Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [invalidCsv] } });

    await waitFor(() => {
      expect(screen.getByText('Unterminated quoted value in CSV line.')).toBeInTheDocument();
    });
  });

  it('revalidates edited preview values locally before import', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    const tableNumberInput = (await screen.findByDisplayValue('12')) as HTMLInputElement;
    fireEvent.change(tableNumberInput, { target: { value: '0' } });

    await waitFor(() => {
      expect(screen.getByText(/Table Number must be at least 1/)).toBeInTheDocument();
    });
  });

  it('uses edited select values when importing', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true, imported_count: 1 });
    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[fields[0], selectField]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number,area\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12,2F',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    await screen.findByText(/Preview \(1 row\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Area' }));
    fireEvent.click(screen.getByRole('option', { name: '4F' }));

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [
            expect.objectContaining({
              answers: {
                table_number: 12,
                area: '4F',
              },
            }),
          ],
        }),
      );
    });
  });

  it('uses edited boolean values when importing', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true, imported_count: 1 });
    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[fields[0], booleanField]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number,checked\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12,false',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    await screen.findByText(/Preview \(1 row\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Checked' }));
    fireEvent.click(screen.getByRole('option', { name: 'True' }));

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [
            expect.objectContaining({
              answers: {
                table_number: 12,
                checked: true,
              },
            }),
          ],
        }),
      );
    });
  });

  it('renders date and datetime fields with the correct input types', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[fields[0], dateField, datetimeField]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number,event_date,event_datetime\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12,2026-07-11,2026-07-11T09:30',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    const dateInput = (await screen.findByDisplayValue('2026-07-11')) as HTMLInputElement;
    const datetimeInput = (await screen.findByDisplayValue('2026-07-11T09:30')) as HTMLInputElement;

    expect(dateInput.type).toBe('date');
    expect(datetimeInput.type).toBe('datetime-local');
  });

  it('renders text fields with a text input', async () => {
    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[fields[0], textField]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number,notes\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12,Hello',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    const textInput = (await screen.findByDisplayValue('Hello')) as HTMLInputElement;
    expect(textInput.type).toBe('text');
  });

  it('uses edited select values when importing', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ success: true, imported_count: 1 });
    const selectField: AttendanceField = {
      id: '22222222-2222-4222-8222-222222222222',
      event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      field_key: 'area',
      label: 'Area',
      field_type: 'select',
      is_required: false,
      is_active: true,
      display_order: 1,
      options: [
        { label: '2F', value: '2F' },
        { label: '4F', value: '4F' },
      ],
      validation_rules: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[fields[0], selectField]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number,area\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12,2F',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });

    await screen.findByText(/Preview \(1 row\)/);
    const areaButton = screen.getByRole('button', { name: 'Area' });
    fireEvent.click(areaButton);
    const option4F = await screen.findByRole('option', { name: '4F' });
    fireEvent.click(option4F);

    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          rows: [
            expect.objectContaining({
              answers: {
                table_number: 12,
                area: '4F',
              },
            }),
          ],
        }),
      );
    });
  });

  it('falls back to generic mutation error text when rejection is not an Error instance', async () => {
    const mutateAsync = vi.fn().mockRejectedValue('bad');
    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(screen.getByText('Bulk upload failed.')).toBeInTheDocument();
    });
  });

  it('splits detail strings from backend errors into separate messages', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(
      new Error(
        JSON.stringify({
          success: false,
          detail: 'Row 2: First issue; Row 3: Second issue',
        }),
      ),
    );

    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(screen.getByText('Row 2: First issue')).toBeInTheDocument();
      expect(screen.getByText('Row 3: Second issue')).toBeInTheDocument();
    });
  });

  it('uses backend error text when structured error payload only contains an error field', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(
      new Error(
        JSON.stringify({
          success: false,
          error: 'Single backend error',
        }),
      ),
    );

    mockUseBulkUpsertAttendanceAnswersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <BulkUploadPanel
        eventId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        fields={[...fields]}
        onClose={vi.fn()}
      />,
    );

    const fileInput = screen.getByLabelText('CSV file');
    const validCsv = new File(
      [
        'attendee_kind,registration_id,public_registration_id,full_name,table_number\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,Valid Row,12',
      ],
      'attendance.csv',
      { type: 'text/csv' },
    );

    fireEvent.change(fileInput, { target: { files: [validCsv] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Import CSV' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(screen.getByText('Single backend error')).toBeInTheDocument();
    });
  });
});
