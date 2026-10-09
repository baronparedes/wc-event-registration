import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('min-h-11');
  });

  it('handles custom variant and size classes', () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete' });

    expect(button).toHaveClass('bg-red-600');
    expect(button).toHaveClass('min-h-10');
  });

  it('applies w-full when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button', { name: 'Full Width' });

    expect(button).toHaveClass('w-full');
  });

  it('applies w-full sm:w-auto when fullWidthMobile is true', () => {
    render(<Button fullWidthMobile>Mobile Full Width</Button>);
    const button = screen.getByRole('button', { name: 'Mobile Full Width' });

    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('sm:w-auto');
  });

  it('prioritizes fullWidth over fullWidthMobile if both are true', () => {
    render(
      <Button fullWidth fullWidthMobile>
        Both Props
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Both Props' });

    expect(button).toHaveClass('w-full');
    expect(button).not.toHaveClass('sm:w-auto');
  });

  it('calls onClick when clicked and not disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Clickable' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Link Button' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link).toHaveClass('bg-primary');
  });

  it('merges custom className using twMerge', () => {
    render(<Button className="custom-test-class">Custom Class</Button>);
    const button = screen.getByRole('button', { name: 'Custom Class' });

    expect(button).toHaveClass('custom-test-class');
  });
});
