import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadPage(registrationWizardEnabled: boolean) {
  vi.resetModules()
  vi.doMock('@/config/env', () => ({
    env: {
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'anon-key',
      registrationWizardEnabled,
    },
  }))
  vi.doMock('../ClassicEventRegistrationFlow', () => ({
    ClassicEventRegistrationFlow: () => <div>Classic Flow</div>,
  }))
  vi.doMock('../WizardEventRegistrationFlow', () => ({
    WizardEventRegistrationFlow: () => <div>Wizard Flow</div>,
  }))

  return import('../index')
}

describe('EventRegistrationPage toggle', () => {
  afterEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders the wizard flow when the env toggle is enabled', async () => {
    const { EventRegistrationPage } = await loadPage(true)

    render(<EventRegistrationPage />)

    expect(screen.getByText('Wizard Flow')).toBeInTheDocument()
  })

  it('renders the classic flow when the env toggle is disabled', async () => {
    const { EventRegistrationPage } = await loadPage(false)

    render(<EventRegistrationPage />)

    expect(screen.getByText('Classic Flow')).toBeInTheDocument()
  })
})
