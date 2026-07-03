import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminNewEventPage } from '@/pages/admin/events/new';

const { mockAdminEventFormPage } = vi.hoisted(() => ({
  mockAdminEventFormPage: vi.fn(),
}));

vi.mock('@/pages/admin/events/_event-form', () => ({
  AdminEventFormPage: (props: { mode: 'create' | 'edit' }) => {
    mockAdminEventFormPage(props);
    return <div>{`Event Form ${props.mode}`}</div>;
  },
}));

describe('AdminNewEventPage', () => {
  it('renders event form in create mode', () => {
    render(<AdminNewEventPage />);

    expect(screen.getByText('Event Form create')).toBeInTheDocument();
    expect(mockAdminEventFormPage).toHaveBeenCalledWith({ mode: 'create' });
  });
});
