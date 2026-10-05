import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FieldTypeBadge } from '../FieldTypeBadge';

describe('FieldTypeBadge', () => {
  it('renders standard label and color for known field types', () => {
    render(<FieldTypeBadge fieldType="rating" />);
    const badge = screen.getByText('Rating');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
  });

  it('renders custom label when provided', () => {
    render(<FieldTypeBadge fieldType="datetime" customLabel="Custom Date & Time" />);
    expect(screen.getByText('Custom Date & Time')).toBeInTheDocument();
  });

  it('falls back to fieldType string when unknown', () => {
    render(<FieldTypeBadge fieldType="custom_unknown" />);
    const badge = screen.getByText('custom_unknown');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-muted', 'text-text');
  });
});
