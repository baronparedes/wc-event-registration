import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { FormHeaderCard } from '../FormHeaderCard';

const mockForm: AdminForm = {
  id: 'form-123',
  slug: 'volunteer-survey',
  title: 'Volunteer Survey 2026',
  description: '<p>Please fill out our annual volunteer survey.</p>',
  status: 'published',
  duplicate_policy: 'block',
  audience: 'members_and_public',
  metadata: {},
  created_by_admin_id: 'admin-1',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

describe('FormHeaderCard', () => {
  it('renders form title, badges and sanitized description', () => {
    render(<FormHeaderCard form={mockForm} isLoading={false} isError={false} />);

    expect(screen.getByText('Volunteer Survey 2026')).toBeInTheDocument();
    expect(screen.getByText('Open to Guests')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Please fill out our annual volunteer survey.')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(<FormHeaderCard form={undefined} isLoading={true} isError={false} />);

    expect(screen.getAllByText('Form Submission').length).toBeGreaterThan(0);
  });

  it('renders error message when isError is true', () => {
    render(<FormHeaderCard form={undefined} isLoading={false} isError={true} />);

    expect(screen.getByText('Failed to load form details.')).toBeInTheDocument();
  });

  it('renders members-only badge when audience is members', () => {
    const memberForm: AdminForm = { ...mockForm, audience: 'members' };
    render(<FormHeaderCard form={memberForm} isLoading={false} isError={false} />);

    expect(screen.getByText('Members Only')).toBeInTheDocument();
  });

  it('renders public badge when audience is public', () => {
    const publicForm: AdminForm = { ...mockForm, audience: 'public' };
    render(<FormHeaderCard form={publicForm} isLoading={false} isError={false} />);

    expect(screen.getByText('Public')).toBeInTheDocument();
  });
});
