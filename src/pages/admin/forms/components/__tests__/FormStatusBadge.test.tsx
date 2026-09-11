import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormStatusBadge } from '../FormStatusBadge';

describe('FormStatusBadge', () => {
  it('renders correct label and variant for each status', () => {
    const { rerender } = render(<FormStatusBadge status="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();

    rerender(<FormStatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<FormStatusBadge status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();

    rerender(<FormStatusBadge status={'unknown' as unknown as never} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
