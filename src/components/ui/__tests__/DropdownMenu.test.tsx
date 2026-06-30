import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu'

describe('DropdownMenu', () => {
  it('does not render children when closed', () => {
    render(
      <DropdownMenu
        open={false}
        onOpenChange={vi.fn()}
        trigger={<button type="button">Open</button>}
      >
        <div>Menu Content</div>
      </DropdownMenu>,
    )

    expect(screen.queryByText('Menu Content')).not.toBeInTheDocument()
  })

  it('renders children when open and closes on outside click', () => {
    const onOpenChange = vi.fn()

    render(
      <DropdownMenu
        open={true}
        onOpenChange={onOpenChange}
        trigger={<button type="button">Open</button>}
      >
        <div>Menu Content</div>
      </DropdownMenu>,
    )

    expect(screen.getByText('Menu Content')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not close when clicking inside menu', () => {
    const onOpenChange = vi.fn()

    render(
      <DropdownMenu
        open={true}
        onOpenChange={onOpenChange}
        trigger={<button type="button">Open</button>}
      >
        <div>Menu Content</div>
      </DropdownMenu>,
    )

    fireEvent.mouseDown(screen.getByText('Menu Content'))
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe('DropdownMenuItem', () => {
  it('renders link and invokes onClick handler', () => {
    const onClick = vi.fn()

    render(
      <MemoryRouter>
        <DropdownMenuItem to="/admin/events" onClick={onClick}>
          Events
        </DropdownMenuItem>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Events' })
    expect(link).toHaveAttribute('href', '/admin/events')

    fireEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
