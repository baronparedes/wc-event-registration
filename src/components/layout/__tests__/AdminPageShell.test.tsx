import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AdminPageShell, AdminSubNavLink } from '../AdminPageShell';

describe('AdminPageShell', () => {
  it('renders children with default max-width container', () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPageShell>
          <div>Main Content</div>
        </AdminPageShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('max-w-7xl');
  });

  it('renders wide layout when wide prop is true', () => {
    const { container } = render(
      <MemoryRouter>
        <AdminPageShell wide>
          <div>Wide Content</div>
        </AdminPageShell>
      </MemoryRouter>,
    );

    expect(screen.getByText('Wide Content')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('max-w-screen-2xl');
  });

  describe('AdminPageShell.Header', () => {
    it('renders title and description', () => {
      render(
        <MemoryRouter>
          <AdminPageShell.Header
            title="Manage Events"
            description="Create, edit, and manage events."
          />
        </MemoryRouter>,
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Manage Events' })).toBeInTheDocument();
      expect(screen.getByText('Create, edit, and manage events.')).toBeInTheDocument();
    });

    it('renders badge and actions', () => {
      render(
        <MemoryRouter>
          <AdminPageShell.Header
            title="AI Assistant"
            badge={<span>Beta Badge</span>}
            actions={<button type="button">New Action</button>}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText('Beta Badge')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'New Action' })).toBeInTheDocument();
    });

    it('renders breadcrumbs with links and labels', () => {
      render(
        <MemoryRouter>
          <AdminPageShell.Header
            title="Registrations"
            breadcrumbs={[
              { label: 'Events', to: '/admin/events' },
              { label: 'Sunday Service', to: '/admin/events/123' },
              { label: 'Registrations' },
            ]}
          />
        </MemoryRouter>,
      );

      const eventsLink = screen.getByRole('link', { name: 'Events' });
      expect(eventsLink).toHaveAttribute('href', '/admin/events');

      const eventDetailLink = screen.getByRole('link', { name: 'Sunday Service' });
      expect(eventDetailLink).toHaveAttribute('href', '/admin/events/123');

      expect(screen.getByText('Registrations', { selector: 'span' })).toBeInTheDocument();
    });

    it('renders navLinks within the header when provided', () => {
      render(
        <MemoryRouter>
          <AdminPageShell.Header
            title="Event Details"
            navLinks={<nav data-testid="header-nav">Navigation Links</nav>}
          />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('header-nav')).toBeInTheDocument();
    });
  });

  describe('AdminPageShell.Filters', () => {
    it('renders filter container with children', () => {
      render(
        <AdminPageShell.Filters className="custom-filter-class">
          <input placeholder="Search..." />
        </AdminPageShell.Filters>,
      );

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search...').parentElement).toHaveClass(
        'custom-filter-class',
      );
    });
  });

  describe('AdminPageShell.Content', () => {
    it('renders children when not loading', () => {
      render(
        <AdminPageShell.Content>
          <p>Loaded Data</p>
        </AdminPageShell.Content>,
      );

      expect(screen.getByText('Loaded Data')).toBeInTheDocument();
    });

    it('renders loading message when isLoading is true', () => {
      render(
        <AdminPageShell.Content isLoading={true} loadingMessage="Loading items...">
          <p>Loaded Data</p>
        </AdminPageShell.Content>,
      );

      expect(screen.getByText('Loading items...')).toBeInTheDocument();
      expect(screen.queryByText('Loaded Data')).not.toBeInTheDocument();
    });
  });

  describe('AdminPageShell.SubNav & AdminSubNavLink', () => {
    it('renders subnav links and highlights active route', () => {
      render(
        <MemoryRouter initialEntries={['/admin/events']}>
          <AdminPageShell.SubNav>
            <AdminSubNavLink to="/admin/events">Events</AdminSubNavLink>
            <AdminSubNavLink to="/admin/forms">Forms</AdminSubNavLink>
          </AdminPageShell.SubNav>
        </MemoryRouter>,
      );

      const eventsLink = screen.getByRole('link', { name: 'Events' });
      const formsLink = screen.getByRole('link', { name: 'Forms' });

      expect(eventsLink).toHaveClass('border-primary', 'text-primary');
      expect(formsLink).toHaveClass('border-transparent', 'text-muted');
    });
  });
});
