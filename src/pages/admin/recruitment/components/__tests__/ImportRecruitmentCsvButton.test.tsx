import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/unit-test-utils';

import { ImportRecruitmentCsvButton } from '../ImportRecruitmentCsvButton';

function renderButton(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ImportRecruitmentCsvButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with correct label', () => {
    renderButton(<ImportRecruitmentCsvButton />);
    expect(screen.getByRole('button', { name: /Import Legacy CSV/i })).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    renderButton(<ImportRecruitmentCsvButton disabled />);
    expect(screen.getByRole('button', { name: /Import Legacy CSV/i })).toBeDisabled();
  });

  it('opens import dialog on click', () => {
    renderButton(<ImportRecruitmentCsvButton />);
    fireEvent.click(screen.getByRole('button', { name: /Import Legacy CSV/i }));

    expect(
      screen.getByRole('heading', { name: /Import Recruitment Applications/i }),
    ).toBeInTheDocument();
  });
});
