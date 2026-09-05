import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CollapsibleSectionCard } from '../CollapsibleSectionCard';

describe('CollapsibleSectionCard', () => {
  it('renders title, subtitle, and toggles expanded content', () => {
    render(
      <CollapsibleSectionCard title="My Title" subtitle="My Subtitle" defaultExpanded={true}>
        <div>Content Inside</div>
      </CollapsibleSectionCard>,
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Content Inside')).toBeInTheDocument();

    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
    fireEvent.click(collapseBtn);
  });

  it('renders without title (subtitle only) and without header content at all', () => {
    const { rerender } = render(
      <CollapsibleSectionCard subtitle="Subtitle Only" defaultExpanded={true}>
        <div>Content Subtitle</div>
      </CollapsibleSectionCard>,
    );

    expect(screen.getByText('Subtitle Only')).toBeInTheDocument();

    rerender(
      <CollapsibleSectionCard defaultExpanded={true} animateContent={false}>
        <div>Headerless Content</div>
      </CollapsibleSectionCard>,
    );

    expect(screen.getByText('Headerless Content')).toBeInTheDocument();
  });
});
