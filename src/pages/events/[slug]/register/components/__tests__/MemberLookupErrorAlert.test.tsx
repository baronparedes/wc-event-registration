import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemberLookupErrorAlert } from '@/pages/events/[slug]/register/components/MemberLookupErrorAlert'

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Element.prototype.scrollIntoView = vi.fn()
})

describe('MemberLookupErrorAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('renders nothing when message is null or suppressed', () => {
    const { rerender } = render(<MemberLookupErrorAlert message={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    rerender(<MemberLookupErrorAlert message="Error" suppress={true} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders alert content and allows manual dismiss', () => {
    const onDismiss = vi.fn()

    render(<MemberLookupErrorAlert message="Invalid member ID" onDismiss={onDismiss} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Please check your entry')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss member lookup warning' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('auto dismisses after countdown timer', () => {
    const onDismiss = vi.fn()

    render(<MemberLookupErrorAlert message="Timed warning" onDismiss={onDismiss} />)

    expect(screen.getByText('(10s)')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
