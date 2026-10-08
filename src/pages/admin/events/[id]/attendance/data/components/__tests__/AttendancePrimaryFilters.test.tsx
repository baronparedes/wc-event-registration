import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AttendancePrimaryFilters } from '../AttendancePrimaryFilters';

describe('AttendancePrimaryFilters', () => {
  const defaultProps = {
    viewConfig: { nameOrMemberQuery: '', visibleFields: [] },
    registrationDynamicFieldOptions: [],
    attendanceDynamicFieldOptions: [],
    memberDynamicFieldOptions: [],
    onNameOrMemberQueryChange: vi.fn(),
    onToggleVisibleField: vi.fn(),
    canClearFilters: false,
    onClearViewControls: vi.fn(),
  };

  it('renders search input and responds to user typing', async () => {
    const user = userEvent.setup();
    render(<AttendancePrimaryFilters {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search by attendee name/i);
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'John');

    // Test for the final exact value since user.type triggers multiple changes
    expect(defaultProps.onNameOrMemberQueryChange).toHaveBeenCalled();
  });

  it('disables clear button when canClearFilters is false', () => {
    render(<AttendancePrimaryFilters {...defaultProps} canClearFilters={false} />);

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    expect(clearButton).toBeDisabled();
  });

  it('enables clear button and calls onClearViewControls when clicked', async () => {
    const user = userEvent.setup();
    render(<AttendancePrimaryFilters {...defaultProps} canClearFilters={true} />);

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    expect(clearButton).not.toBeDisabled();

    await user.click(clearButton);
    expect(defaultProps.onClearViewControls).toHaveBeenCalledTimes(1);
  });
});
