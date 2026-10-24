import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
