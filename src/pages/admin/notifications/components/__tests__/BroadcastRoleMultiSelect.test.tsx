import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastRoleMultiSelect } from '../BroadcastRoleMultiSelect';

describe('BroadcastRoleMultiSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: React.ComponentProps<typeof BroadcastRoleMultiSelect>) => {
    return render(<BroadcastRoleMultiSelect {...props} />);
  };

  it('renders default placeholder when no roles are selected', () => {
    const handleChange = vi.fn();
    renderComponent({ selectedRoles: [], onChange: handleChange });

    expect(screen.getByLabelText(/Target Roles/i)).toBeInTheDocument();
    expect(screen.getByText('Select target roles...')).toBeInTheDocument();
  });

  it('renders single role label or count summary when roles are selected', () => {
    const handleChange = vi.fn();
    const { rerender } = renderComponent({
      selectedRoles: ['admin'],
      onChange: handleChange,
    });

    expect(screen.getAllByText('Admin')).toHaveLength(2);

    rerender(
      <BroadcastRoleMultiSelect
        selectedRoles={['admin', 'Prayer Coach', 'slod']}
        onChange={handleChange}
      />,
    );
    expect(screen.getByText('3 roles selected')).toBeInTheDocument();
  });

  it('opens and closes dropdown on trigger button click', () => {
    const handleChange = vi.fn();
    renderComponent({ selectedRoles: [], onChange: handleChange });

    const triggerBtn = screen.getByRole('button', {
      name: /Target roles selection trigger/i,
    });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Auth / Admin Roles')).toBeInTheDocument();
    expect(screen.getByText('Member / Volunteer Roles')).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('toggles role selection on checkbox click', () => {
    const handleChange = vi.fn();
    renderComponent({ selectedRoles: ['admin'], onChange: handleChange });

    const triggerBtn = screen.getByRole('button', {
      name: /Target roles selection trigger/i,
    });
    fireEvent.click(triggerBtn);

    // Click to add 'Prayer Coach'
    const prayerCoachCheckbox = screen.getByLabelText('Prayer Coach');
    fireEvent.click(prayerCoachCheckbox);
    expect(handleChange).toHaveBeenCalledWith(['admin', 'Prayer Coach']);

    // Click to uncheck 'Admin'
    const adminCheckbox = screen.getByLabelText('Admin');
    fireEvent.click(adminCheckbox);
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('selects all roles when "Select all" is clicked', () => {
    const handleChange = vi.fn();
    renderComponent({ selectedRoles: [], onChange: handleChange });

    fireEvent.click(screen.getByRole('button', { name: /Target roles selection trigger/i }));

    const selectAllBtn = screen.getByRole('button', { name: 'Select all' });
    fireEvent.click(selectAllBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.arrayContaining(['super_admin', 'admin', 'slod', 'imt', 'kiosk', 'Prayer Coach']),
    );
  });

  it('clears all selected roles when "Clear" is clicked', () => {
    const handleChange = vi.fn();
    renderComponent({
      selectedRoles: ['admin', 'Prayer Coach'],
      onChange: handleChange,
    });

    fireEvent.click(screen.getByRole('button', { name: /Target roles selection trigger/i }));

    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('removes role when clicking on badge pill remove button', () => {
    const handleChange = vi.fn();
    renderComponent({
      selectedRoles: ['admin', 'Prayer Coach'],
      onChange: handleChange,
    });

    const removeAdminBtn = screen.getByRole('button', { name: 'Remove role Admin' });
    fireEvent.click(removeAdminBtn);

    expect(handleChange).toHaveBeenCalledWith(['Prayer Coach']);
  });

  it('closes dropdown on Escape key', () => {
    const handleChange = vi.fn();
    renderComponent({ selectedRoles: [], onChange: handleChange });

    fireEvent.click(screen.getByRole('button', { name: /Target roles selection trigger/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside the component', () => {
    const handleChange = vi.fn();
    renderComponent({ selectedRoles: [], onChange: handleChange });

    fireEvent.click(screen.getByRole('button', { name: /Target roles selection trigger/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders error text when error prop is passed', () => {
    const handleChange = vi.fn();
    renderComponent({
      selectedRoles: [],
      onChange: handleChange,
      error: 'At least one role must be selected',
    });

    expect(screen.getByText('At least one role must be selected')).toBeInTheDocument();
  });
});
