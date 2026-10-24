import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApproverSelectField } from '../ApproverSelectField';

const mockUseApproverUsersQuery = vi.fn();

vi.mock('@/hooks/domain/auth', () => ({
  useApproverUsersQuery: () => mockUseApproverUsersQuery(),
}));

vi.mock('@/hooks/domain/members/queries/useMemberAvatarQuery', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

describe('ApproverSelectField', () => {
  const mockApprovers = [
    {
      auth_user_id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice Admin',
      role: 'admin',
      avatar_object_key: null,
    },
    {
      auth_user_id: 'user-2',
      email: 'sam@example.com',
      name: 'Sam Super',
      role: 'super_admin',
      avatar_object_key: 'avatars/sam.png',
    },
    {
      auth_user_id: 'user-3',
      email: 'leo@example.com',
      name: 'Leo Slod',
      role: 'slod',
      avatar_object_key: null,
    },
  ];

  beforeEach(() => {
    mockUseApproverUsersQuery.mockReturnValue({
      data: mockApprovers,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders search input when no approver is selected', () => {
    render(<ApproverSelectField onChange={vi.fn()} />);

    expect(screen.getByLabelText(/Designated Approver/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search approver by name or email.../i)).toBeInTheDocument();
  });

  it('opens dropdown with approvers when search input is clicked or focused', () => {
    render(<ApproverSelectField onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    expect(screen.getByText('Sam Super')).toBeInTheDocument();
    expect(screen.getByText('Leo Slod')).toBeInTheDocument();
  });

  it('filters approvers as search text is entered', () => {
    render(<ApproverSelectField onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Sam' } });

    expect(screen.getByText('Sam Super')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
  });

  it('calls onChange with selected approver object when an option is selected', () => {
    const handleChange = vi.fn();
    render(<ApproverSelectField onChange={handleChange} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);
    fireEvent.focus(input);

    fireEvent.click(screen.getByText('Alice Admin'));

    expect(handleChange).toHaveBeenCalledWith(mockApprovers[0]);
  });

  it('displays selected approver card with Avatar, role badge, and active reviewer badge', () => {
    render(<ApproverSelectField value="sam@example.com" onChange={vi.fn()} />);

    expect(screen.getByText('Sam Super')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Active Reviewer')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search approver/i)).not.toBeInTheDocument();
  });

  it('calls onChange with null when selection is removed via clear button', () => {
    const handleChange = vi.fn();
    render(<ApproverSelectField value="alice@example.com" onChange={handleChange} />);

    const removeBtn = screen.getByRole('button', { name: /Remove designated approver/i });
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith(null);
  });

  it('displays error message when provided', () => {
    render(
      <ApproverSelectField
        onChange={vi.fn()}
        error="An approver must be selected for Required Approval fields."
      />,
    );

    expect(
      screen.getByText('An approver must be selected for Required Approval fields.'),
    ).toBeInTheDocument();
  });

  it('displays loading indicator when query is loading', () => {
    mockUseApproverUsersQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    render(<ApproverSelectField onChange={vi.fn()} />);

    expect(screen.getByText('Loading approvers...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('marks disabledEmails as Already Assigned and prevents selecting them', () => {
    const handleChange = vi.fn();

    render(<ApproverSelectField onChange={handleChange} disabledEmails={['alice@example.com']} />);

    const input = screen.getByPlaceholderText('Search approver by name or email...');
    fireEvent.focus(input);

    expect(screen.getByText('Already Assigned')).toBeInTheDocument();

    const aliceOption = screen.getByText('Alice Admin').closest('[role="option"]');
    expect(aliceOption).toHaveAttribute('aria-disabled', 'true');

    if (aliceOption) {
      fireEvent.click(aliceOption);
    }
    expect(handleChange).not.toHaveBeenCalled();

    const samOption = screen.getByText('Sam Super').closest('[role="option"]');
    if (samOption) {
      fireEvent.click(samOption);
    }
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'sam@example.com' }),
    );
  });

  it('supports full keyboard navigation (open, arrow down/up wrap, enter, escape)', () => {
    const handleChange = vi.fn();
    render(<ApproverSelectField onChange={handleChange} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);

    // ArrowDown when closed opens dropdown
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // ArrowDown navigates through list
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    // Wrap around to start
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // ArrowUp navigates backwards and wraps to end
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    // Escape closes dropdown
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Enter when closed opens dropdown
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Enter when open selects highlighted item
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith(mockApprovers[2]);
  });

  it('handles mouseEnter on enabled options and closes on outside click', () => {
    render(<ApproverSelectField onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const samOption = screen.getByText('Sam Super').closest('[role="option"]');
    if (samOption) {
      fireEvent.mouseEnter(samOption);
    }

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('displays empty states when no approvers match or none available', () => {
    render(<ApproverSelectField onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nonexistent-user-xyz' } });

    expect(
      screen.getByText('No approvers found matching "nonexistent-user-xyz".'),
    ).toBeInTheDocument();
  });

  it('displays no approvers available when query returns empty list', () => {
    mockUseApproverUsersQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<ApproverSelectField onChange={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Search approver by name or email.../i);
    fireEvent.focus(input);

    expect(screen.getByText('No approvers available.')).toBeInTheDocument();
  });

  it('displays query failure message when isError is true', () => {
    mockUseApproverUsersQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });

    render(<ApproverSelectField onChange={vi.fn()} />);
    expect(
      screen.getByText('Failed to load approvers. Please refresh the page.'),
    ).toBeInTheDocument();
  });

  it('formats custom or unknown roles and handles disabled prop on card', () => {
    const customApprovers = [
      {
        auth_user_id: 'user-4',
        email: 'mod@example.com',
        name: 'Mod User',
        role: 'moderator',
        avatar_object_key: null,
      },
    ];
    mockUseApproverUsersQuery.mockReturnValue({
      data: customApprovers,
      isLoading: false,
      isError: false,
    });

    const { rerender } = render(
      <ApproverSelectField
        id="custom-id"
        value="mod@example.com"
        onChange={vi.fn()}
        disabled={true}
        required={false}
        helperText="Custom helper text"
      />,
    );

    expect(screen.getByText('MODERATOR')).toBeInTheDocument();
    expect(screen.getByText('Custom helper text')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remove designated approver/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();

    // Rerender with disabled={false} shows remove button
    rerender(
      <ApproverSelectField
        id="custom-id"
        value="mod@example.com"
        onChange={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByRole('button', { name: /Remove designated approver/i })).toBeInTheDocument();
  });
});
