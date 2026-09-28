import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  useEmailTemplateMutation,
  useEmailTemplateQuery,
  useEmailTemplatesQuery,
} from '@/hooks/domain/email-templates';
import { useIsMobileViewport } from '@/hooks/utils';
import type { EmailTemplate } from '@/lib/domain/email-templates';

import { EmailTemplatesPage } from '../index';

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/email-templates', () => ({
  useEmailTemplatesQuery: vi.fn(),
  useEmailTemplateQuery: vi.fn(),
  useEmailTemplateMutation: vi.fn(),
}));

vi.mock('@/hooks/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/utils')>();
  return {
    ...actual,
    useIsMobileViewport: vi.fn(),
  };
});

const mockTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Event Confirmation',
    slug: 'event_confirmation',
    resend_template_id: 'resend_tmpl_123',
    required_variables: ['first_name', 'event_title', 'event_date'],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'tmpl-2',
    name: 'Password Reset',
    slug: 'password_reset',
    resend_template_id: 'resend_tmpl_456',
    required_variables: ['reset_url'],
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
];

describe('EmailTemplatesPage', () => {
  let queryClient: QueryClient;
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useAdminAuthQuery).mockReturnValue({
      data: {
        adminRole: 'admin',
        isAuthenticated: true,
        session: null,
      },
      isLoading: false,
      error: null,
    } as never);

    vi.mocked(useIsMobileViewport).mockReturnValue(false);

    vi.mocked(useEmailTemplatesQuery).mockReturnValue({
      data: mockTemplates,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.mocked(useEmailTemplateQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as never);

    vi.mocked(useEmailTemplateMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never);
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EmailTemplatesPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders the page header, table, and templates list', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Email Templates' })).toBeInTheDocument();
    expect(screen.getByText('Event Confirmation')).toBeInTheDocument();
    expect(screen.getByText('event_confirmation')).toBeInTheDocument();
    expect(screen.getByText('resend_tmpl_123')).toBeInTheDocument();
    expect(screen.getByText('first_name')).toBeInTheDocument();
    expect(screen.getByText('Password Reset')).toBeInTheDocument();
  });

  it('renders empty state when no templates exist', () => {
    vi.mocked(useEmailTemplatesQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    renderPage();

    expect(screen.getByText('No email templates yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Create your first email template mapping to connect system event slugs to Resend templates.',
      ),
    ).toBeInTheDocument();
  });

  it('filters templates by search term', async () => {
    renderPage();

    const searchInput = screen.getByPlaceholderText(
      'Search by template name, slug, Resend ID, or variable...',
    );
    fireEvent.change(searchInput, { target: { value: 'password' } });

    await waitFor(() => {
      expect(screen.getByText('Password Reset')).toBeInTheDocument();
      expect(screen.queryByText('Event Confirmation')).not.toBeInTheDocument();
    });

    // Clear search
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Event Confirmation')).toBeInTheDocument();
    });
  });

  it('renders mobile cards when in mobile viewport', () => {
    vi.mocked(useIsMobileViewport).mockReturnValue(true);

    renderPage();

    expect(screen.getByText('Event Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Password Reset')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2);
  });

  it('opens builder dialog to create a new template', async () => {
    renderPage();

    const newBtn = screen.getByRole('button', { name: /new template mapping/i });
    fireEvent.click(newBtn);

    expect(
      screen.getByRole('heading', { level: 2, name: 'New Template Mapping' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Template Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^System Slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Resend Template ID/i)).toBeInTheDocument();
  });

  it('opens builder dialog with edit mode for selected template', () => {
    vi.mocked(useEmailTemplateQuery).mockReturnValue({
      data: mockTemplates[0],
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    const editBtn = screen.getByRole('button', { name: 'Edit Event Confirmation' });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Template Mapping')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Event Confirmation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('event_confirmation')).toBeInTheDocument();
    expect(screen.getByText('locked')).toBeInTheDocument();
  });

  it('submits a new template through the dialog', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'tmpl-3' });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /new template mapping/i }));

    fireEvent.change(screen.getByLabelText(/^Template Name/i), {
      target: { value: 'Reminder Notice' },
    });
    fireEvent.change(screen.getByLabelText(/^Resend Template ID/i), {
      target: { value: 'resend_tmpl_999' },
    });
    fireEvent.change(screen.getByLabelText(/^Required Variables/i), {
      target: { value: 'name, date' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create template/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: undefined,
        name: 'Reminder Notice',
        slug: 'reminder_notice',
        resend_template_id: 'resend_tmpl_999',
        required_variables: ['name', 'date'],
      });
    });
  });
});
