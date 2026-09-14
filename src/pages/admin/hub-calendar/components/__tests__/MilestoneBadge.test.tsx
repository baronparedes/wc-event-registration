import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MilestoneBadge } from '../MilestoneBadge';
import {
  getMilestoneTypeBadgeClass,
  getMilestoneTypeIcon,
  getMilestoneTypeLabel,
} from '../milestoneBadgeUtils';

describe('MilestoneBadge', () => {
  it('renders default birthday badge with label and icon', () => {
    render(<MilestoneBadge type="birthday" />);

    expect(screen.getByText('Birthday')).toBeInTheDocument();
  });

  it('renders default wedding anniversary badge with label and icon', () => {
    render(<MilestoneBadge type="wedding_anniversary" />);

    expect(screen.getByText('Wedding Anniversary')).toBeInTheDocument();
  });

  it('renders small badge with custom children and title', () => {
    render(
      <MilestoneBadge type="birthday" size="sm" title="2 birthdays">
        2
      </MilestoneBadge>,
    );

    const badge = screen.getByTitle('2 birthdays');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2');
    expect(badge.className).toContain('text-[10px]');
  });

  it('renders small wedding anniversary badge with custom member nickname', () => {
    render(
      <MilestoneBadge type="wedding_anniversary" size="sm">
        Alex & Sam
      </MilestoneBadge>,
    );

    expect(screen.getByText('Alex & Sam')).toBeInTheDocument();
  });

  it('provides helper functions for label, badge class, and icon', () => {
    expect(getMilestoneTypeLabel('birthday')).toBe('Birthday');
    expect(getMilestoneTypeLabel('wedding_anniversary')).toBe('Wedding Anniversary');

    expect(getMilestoneTypeBadgeClass('birthday')).toContain('bg-primary/10');
    expect(getMilestoneTypeBadgeClass('wedding_anniversary')).toContain('bg-red-50');

    const BirthdayIcon = getMilestoneTypeIcon('birthday');
    const AnniversaryIcon = getMilestoneTypeIcon('wedding_anniversary');
    expect(BirthdayIcon).toBeDefined();
    expect(AnniversaryIcon).toBeDefined();
  });
});
