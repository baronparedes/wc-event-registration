import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BroadcastChannelSelect } from '../BroadcastChannelSelect';

describe('BroadcastChannelSelect', () => {
  it('renders both push and email channels and responds to selection', () => {
    const handleChange = vi.fn();
    render(<BroadcastChannelSelect value={['push', 'email']} onChange={handleChange} />);

    expect(screen.getByText('Delivery Channels')).toBeInTheDocument();
    expect(screen.getByText('Push Notification')).toBeInTheDocument();
    expect(screen.getByText('Email Announcement')).toBeInTheDocument();

    // Clicking push when both are selected toggles it off
    fireEvent.click(screen.getByText('Push Notification'));
    expect(handleChange).toHaveBeenCalledWith(['email']);
  });

  it('prevents deselecting the only remaining channel', () => {
    const handleChange = vi.fn();
    render(<BroadcastChannelSelect value={['push']} onChange={handleChange} />);

    // Clicking push when it's the only one selected doesn't remove it
    fireEvent.click(screen.getByText('Push Notification'));
    expect(handleChange).not.toHaveBeenCalled();

    // Clicking email adds email
    fireEvent.click(screen.getByText('Email Announcement'));
    expect(handleChange).toHaveBeenCalledWith(['push', 'email']);
  });

  it('displays error message when provided', () => {
    render(
      <BroadcastChannelSelect
        value={['push']}
        onChange={vi.fn()}
        error="Please select at least one delivery channel"
      />,
    );

    expect(screen.getByText('Please select at least one delivery channel')).toBeInTheDocument();
  });
});
