import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PWAInstallGuideModal } from '../PWAInstallGuideModal';

describe('PWAInstallGuideModal', () => {
  it('renders correctly when isOpen is true', () => {
    const handleClose = vi.fn();
    render(<PWAInstallGuideModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByText('Install Welcome Hub')).toBeInTheDocument();
    expect(screen.getByText(/Follow these quick steps in Safari/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
    expect(screen.getByText(/Select/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Add to Home Screen/i).length).toBeGreaterThan(0);
  });

  it('calls onClose when "Got it" button is clicked', () => {
    const handleClose = vi.fn();
    render(<PWAInstallGuideModal isOpen={true} onClose={handleClose} />);

    const gotItButton = screen.getByRole('button', { name: /Got it/i });
    fireEvent.click(gotItButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    render(<PWAInstallGuideModal isOpen={false} onClose={handleClose} />);

    expect(screen.queryByText('Install Welcome Hub')).not.toBeInTheDocument();
  });
});
