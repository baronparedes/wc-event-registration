import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MemberLookupMethodSelector } from '@/pages/events/[slug]/register/components/MemberLookupMethodSelector';

describe('MemberLookupMethodSelector', () => {
  it('renders both method buttons when name lookup is allowed', () => {
    const onSelectMethod = vi.fn();

    render(
      <MemberLookupMethodSelector
        allowNameLookup={true}
        isLookupPending={false}
        onSelectMethod={onSelectMethod}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Scan via RFID reader/i }));
    fireEvent.click(screen.getByRole('button', { name: /Search by my name/i }));

    expect(onSelectMethod).toHaveBeenNthCalledWith(1, 'id');
    expect(onSelectMethod).toHaveBeenNthCalledWith(2, 'name');
  });

  it('hides name lookup button when not allowed', () => {
    render(
      <MemberLookupMethodSelector
        allowNameLookup={false}
        isLookupPending={false}
        onSelectMethod={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Search by my name/i })).not.toBeInTheDocument();
  });

  it('disables selection while lookup is pending', () => {
    render(
      <MemberLookupMethodSelector
        allowNameLookup={true}
        isLookupPending={true}
        onSelectMethod={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Scan via RFID reader/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Search by my name/i })).toBeDisabled();
  });
});
