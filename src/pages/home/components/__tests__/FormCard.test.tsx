import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminForm } from '@/lib/domain/forms';

import { FormCard } from '../FormCard';

describe('FormCard', () => {
  const mockForm: AdminForm = {
    id: '1',
    slug: 'test-form',
    title: 'Test Form',
    description: 'A test form description',
    status: 'published',
    duplicate_policy: 'allow_multiple',
    audience: 'members_and_public',
    metadata: {},
    created_by_admin_id: 'admin1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const originalClipboard = navigator.clipboard;
  const originalShare = navigator.share;

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: originalShare,
      configurable: true,
    });
  });

  it('renders form details and submit action for a published form', () => {
    render(
      <MemoryRouter>
        <FormCard form={mockForm} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('A test form description')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    const submitLink = links.find((link) => link.getAttribute('href') === '/forms/test-form');
    expect(submitLink).toBeInTheDocument();
  });

  it('does not render link for draft form', () => {
    const draftForm = { ...mockForm, status: 'draft' as const };
    render(
      <MemoryRouter>
        <FormCard form={draftForm} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Fill out/i })).not.toBeInTheDocument();
  });

  it('handles click and keyboard events on the card itself', () => {
    render(
      <MemoryRouter>
        <FormCard form={mockForm} />
      </MemoryRouter>,
    );
    const card = screen.getAllByRole('link')[0];

    act(() => {
      fireEvent.click(card);
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });
    });

    // Nothing errors
  });

  it('handles click and keyboard events when closed (does nothing)', () => {
    const draftForm = { ...mockForm, status: 'draft' as const };
    render(
      <MemoryRouter>
        <FormCard form={draftForm} />
      </MemoryRouter>,
    );
    const card = screen.getByText('Test Form').parentElement?.parentElement;

    if (card) {
      act(() => {
        fireEvent.click(card);
        fireEvent.keyDown(card, { key: 'Enter' });
      });
    }
  });

  it('handles share button click', async () => {
    render(
      <MemoryRouter>
        <FormCard form={mockForm} />
      </MemoryRouter>,
    );

    const shareButton = screen.getByRole('button', { name: /Share Test Form/i });

    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(navigator.share || navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
