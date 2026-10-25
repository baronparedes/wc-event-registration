import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MemberCsvPreviewRow } from '@/lib/domain/members';

import { ImportPreviewRowDetails } from '../ImportPreviewRowDetails';

describe('ImportPreviewRowDetails', () => {
  it('renders validation errors when operation is error', () => {
    const errorRow: MemberCsvPreviewRow = {
      row_number: 1,
      member_id: 'RFID-ERR',
      first_name: 'Test First',
      last_name: 'Test Last',
      nickname: 'Test Nick',
      role: 'Member',
      category: 'Adults',
      operation: 'error',
      errors: ['First name is required', 'Invalid email format'],
      field_changes: [],
      new_member_details: [],
    };

    render(<ImportPreviewRowDetails row={errorRow} />);

    expect(screen.getByText('Row Validation Errors:')).toBeInTheDocument();
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('renders new member attributes when operation is insert', () => {
    const insertRow: MemberCsvPreviewRow = {
      row_number: 2,
      member_id: 'RFID-NEW',
      first_name: 'Test John',
      last_name: 'Test Doe',
      nickname: 'Test Johnny',
      role: 'Member',
      category: 'Adults',
      operation: 'insert',
      errors: [],
      field_changes: [],
      new_member_details: [
        { field: 'member_id', label: 'RFID / Member ID', value: 'RFID-NEW' },
        { field: 'email', label: 'Email', value: 'john.doe@example.com' },
        { field: 'phone', label: 'Phone', value: '09171234567' },
      ],
    };

    render(<ImportPreviewRowDetails row={insertRow} />);

    expect(screen.getByText('New Member Attributes to be Inserted')).toBeInTheDocument();
    expect(screen.getByText('3 attribute(s)')).toBeInTheDocument();
    expect(screen.getByText('RFID / Member ID')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('09171234567')).toBeInTheDocument();
  });

  it('renders update changes with old and new values', () => {
    const updateRow: MemberCsvPreviewRow = {
      row_number: 3,
      member_id: 'RFID-EXISTING',
      first_name: 'Test Jane',
      last_name: 'Test Smith',
      nickname: 'Test Janey',
      role: 'Member',
      category: 'Adults',
      operation: 'update',
      errors: [],
      field_changes: [
        {
          field: 'email',
          label: 'Email',
          old_value: 'old@example.com',
          new_value: 'new@example.com',
        },
        {
          field: 'phone',
          label: 'Phone',
          old_value: null,
          new_value: '09181234567',
        },
        {
          field: 'role',
          label: 'Role',
          old_value: 'Member',
          new_value: null,
        },
      ],
      new_member_details: [],
    };

    render(<ImportPreviewRowDetails row={updateRow} />);

    expect(screen.getByText('Pending Field Changes for Existing Member')).toBeInTheDocument();
    expect(screen.getByText('3 change(s)')).toBeInTheDocument();
    expect(screen.getByText('old@example.com')).toBeInTheDocument();
    expect(screen.getByText('new@example.com')).toBeInTheDocument();
    // null values show (empty)
    expect(screen.getAllByText('(empty)').length).toBe(2);
  });

  it('renders RFID reassignment with target_member_id when operation is update_member_id', () => {
    const reassignmentRow: MemberCsvPreviewRow = {
      row_number: 4,
      member_id: 'RFID-NEW-TAG',
      first_name: 'Test Bob',
      last_name: 'Test Brown',
      nickname: 'Test Bobby',
      role: 'Member',
      category: 'Adults',
      operation: 'update_member_id',
      target_member_id: 'RFID-OLD-TAG',
      errors: [],
      field_changes: [
        {
          field: 'member_id',
          label: 'Member ID (RFID)',
          old_value: 'RFID-OLD-TAG',
          new_value: 'RFID-NEW-TAG',
        },
      ],
      new_member_details: [],
    };

    render(<ImportPreviewRowDetails row={reassignmentRow} />);

    expect(screen.getByText('RFID Reassignment & Pending Field Changes')).toBeInTheDocument();
    expect(screen.getAllByText('RFID-OLD-TAG').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1 change(s)')).toBeInTheDocument();
  });

  it('renders fallback notice when an update row has 0 field changes', () => {
    const noChangeRow: MemberCsvPreviewRow = {
      row_number: 5,
      member_id: 'RFID-SAME',
      first_name: 'Test Sam',
      last_name: 'Test Green',
      nickname: 'Test Sammy',
      role: 'Member',
      category: 'Adults',
      operation: 'update',
      errors: [],
      field_changes: [],
      new_member_details: [],
    };

    render(<ImportPreviewRowDetails row={noChangeRow} />);

    expect(
      screen.getByText(
        'No field changes detected. All provided CSV values match the current member record in the system.',
      ),
    ).toBeInTheDocument();
  });
});
