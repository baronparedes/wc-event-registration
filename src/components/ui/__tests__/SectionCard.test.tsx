import { render, screen } from '@testing-library/react';

import { SectionCard } from '../SectionCard';

describe('SectionCard', () => {
  it('renders children correctly without optional props', () => {
    render(<SectionCard>Test Content</SectionCard>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders title, subtitle, and headerAction when provided', () => {
    render(
      <SectionCard
        title="My Custom Title"
        subtitle="Some helpful subtitle"
        headerAction={<button type="button">Edit</button>}
      >
        Card Content
      </SectionCard>,
    );

    const titleElement = screen.getByRole('heading', { name: 'My Custom Title' });
    expect(titleElement).toBeInTheDocument();
    expect(screen.getByText('Some helpful subtitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies custom classNames over defaults when provided', () => {
    render(
      <SectionCard
        title="Classy Title"
        subtitle={<span data-testid="subtitle-custom">Classy Subtitle</span>}
        wrapperClassName="custom-wrapper"
        titleClassName="custom-title"
        subtitleClassName="custom-subtitle"
        contentClassName="custom-content"
      >
        <div data-testid="content-inner">Content</div>
      </SectionCard>,
    );

    const titleElement = screen.getByRole('heading', { name: 'Classy Title' });
    expect(titleElement).toHaveClass('custom-title');

    const subtitleElement = screen.getByTestId('subtitle-custom').closest('.custom-subtitle');
    expect(subtitleElement).toBeInTheDocument();

    const contentElement = screen.getByTestId('content-inner').closest('.custom-content');
    expect(contentElement).toBeInTheDocument();

    const wrapperElement = titleElement.closest('.custom-wrapper');
    expect(wrapperElement).toBeInTheDocument();
  });

  it('omits header section if title, subtitle, and action are omitted', () => {
    render(
      <SectionCard>
        <div data-testid="content">Content</div>
      </SectionCard>,
    );

    // There should be no heading or flex containers from the header block
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
