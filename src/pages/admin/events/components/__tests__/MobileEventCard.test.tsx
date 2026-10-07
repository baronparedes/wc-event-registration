import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { MobileEventCard } from '../MobileEventCard';

describe('MobileEventCard', () => {
  const mockEvent = {
    id: 'evt-123',
    title: 'Sunday Service',
    slug: 'sunday-service',
    status: 'published',
    location: 'Main Sanctuary',
    start_date: '2026-10-04T09:00:00Z',
    registration_mode: 'public',
    duplicate_policy: 'allow_duplicates',
    _count: {
      registrations: 10,
    },
  };

  const defaultProps = {
    event: mockEvent as unknown as Parameters<typeof MobileEventCard>[0]['event'],
    canWrite: true,
    canRead: true,
    canAccessCheckIn: true,
    onDuplicateClick: vi.fn(),
    onShareClick: vi.fn(),
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <MemoryRouter>
        <MobileEventCard {...props} />
      </MemoryRouter>,
    );
  };

  it('renders event details correctly', () => {
    renderComponent();

    expect(screen.getByText('Sunday Service')).toBeInTheDocument();
    expect(screen.getByText('sunday-service')).toBeInTheDocument();
    expect(screen.getByText('Main Sanctuary')).toBeInTheDocument();
  });

  it('handles empty location gracefully', () => {
    renderComponent({ ...defaultProps, event: { ...defaultProps.event, location: null } });
    expect(screen.queryByText('Main Sanctuary')).not.toBeInTheDocument();
  });

  it('toggles dropdown menu', () => {
    renderComponent();

    const trigger = screen.getByTitle(/More actions/i);
    fireEvent.click(trigger);

    expect(screen.getByText(/Attendance settings/i)).toBeInTheDocument();
    expect(screen.getByText(/Registration fields/i)).toBeInTheDocument();
  });

  it('calls onDuplicateClick when duplicate option is clicked', () => {
    renderComponent();

    const trigger = screen.getByTitle(/More actions/i);
    fireEvent.click(trigger);

    const duplicateTextNodes = screen.getAllByText(/Duplicate/i);
    const duplicateOption = duplicateTextNodes.find(
      (node) => !node.textContent?.includes('Policy'),
    );

    if (duplicateOption) {
      fireEvent.click(duplicateOption);
    }

    expect(defaultProps.onDuplicateClick).toHaveBeenCalledWith(mockEvent);
  });

  it('calls onShareClick when share option is clicked', () => {
    renderComponent();

    const trigger = screen.getByTitle(/More actions/i);
    fireEvent.click(trigger);

    const shareOption = screen.getByText(/Share schedule/i);
    fireEvent.click(shareOption);

    expect(defaultProps.onShareClick).toHaveBeenCalledWith(mockEvent);
  });

  it('does not render write actions when canWrite is false', () => {
    renderComponent({ ...defaultProps, canWrite: false });

    expect(screen.queryByRole('link', { name: /Edit/i })).not.toBeInTheDocument();

    const trigger = screen.getByTitle(/More actions/i);
    fireEvent.click(trigger);

    const duplicateTextNodes = screen.queryAllByText(/Duplicate/i);
    const duplicateOption = duplicateTextNodes.find(
      (node) => !node.textContent?.includes('Policy'),
    );

    expect(duplicateOption).toBeUndefined();
  });
});
