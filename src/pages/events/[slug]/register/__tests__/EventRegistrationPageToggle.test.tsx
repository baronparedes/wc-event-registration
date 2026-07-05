import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadPage() {
  vi.resetModules();
  vi.doMock('@/config/env', () => ({
    env: {
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'anon-key',
    },
  }));
  vi.doMock('../components/WizardEventRegistrationFlow', () => ({
    WizardEventRegistrationFlow: () => <div>Wizard Flow</div>,
  }));

  return import('../index');
}

describe('EventRegistrationPage toggle', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the wizard flow', async () => {
    const { EventRegistrationPage } = await loadPage();

    render(<EventRegistrationPage />);

    expect(screen.getByText('Wizard Flow')).toBeInTheDocument();
  });
});
