import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { mockAdminEventFormPage } = vi.hoisted(() => ({
  mockAdminEventFormPage: vi.fn(),
}))

vi.mock('@/pages/admin/events/_event-form', () => ({
  AdminEventFormPage: (props: { mode: 'create' | 'edit' }) => {
    mockAdminEventFormPage(props)
    return <div>{`Event Form ${props.mode}`}</div>
  },
}))

import { AdminEditEventPage } from '@/pages/admin/events/[id]'

describe('AdminEditEventPage', () => {
  it('renders event form in edit mode', () => {
    render(<AdminEditEventPage />)

    expect(screen.getByText('Event Form edit')).toBeInTheDocument()
    expect(mockAdminEventFormPage).toHaveBeenCalledWith({ mode: 'edit' })
  })
})
