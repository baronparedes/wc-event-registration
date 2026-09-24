import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  MobileCard,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui';

describe('MobileCard Components', () => {
  it('renders MobileCard with children and custom className', () => {
    render(
      <MobileCard className="custom-card">
        <div>Card Content</div>
      </MobileCard>,
    );

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();
    expect(article).toHaveClass('custom-card');
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders MobileCardHeader', () => {
    render(
      <MobileCardHeader className="custom-header">
        <span>Header Title</span>
      </MobileCardHeader>,
    );

    expect(screen.getByText('Header Title')).toBeInTheDocument();
    expect(screen.getByText('Header Title').parentElement).toHaveClass('custom-header');
  });

  it('renders MobileCardBody', () => {
    render(
      <MobileCardBody className="custom-body">
        <span>Body Content</span>
      </MobileCardBody>,
    );

    expect(screen.getByText('Body Content')).toBeInTheDocument();
    expect(screen.getByText('Body Content').parentElement).toHaveClass('custom-body');
  });

  it('renders MobileCardDivider', () => {
    const { container } = render(<MobileCardDivider className="custom-divider" />);
    const divider = container.firstChild as HTMLElement;
    expect(divider).toHaveClass('border-t');
    expect(divider).toHaveClass('custom-divider');
  });

  it('renders MobileCardContent inside dl', () => {
    render(
      <MobileCardContent className="custom-content">
        <div>Content Row</div>
      </MobileCardContent>,
    );

    expect(screen.getByText('Content Row')).toBeInTheDocument();
    expect(screen.getByText('Content Row').parentElement?.tagName.toLowerCase()).toBe('dl');
  });

  describe('MobileCardContentItem', () => {
    it('renders with value and default colSpan 1', () => {
      render(<MobileCardContentItem label="Phone" value="+1234567890" />);

      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toHaveClass('truncate');
    });

    it('renders with colSpan 2 and isBreakAll and isMono', () => {
      render(
        <MobileCardContentItem
          label="Email"
          value="john@example.com"
          colSpan={2}
          isBreakAll
          isMono
        />,
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      const valueEl = screen.getByText('john@example.com');
      expect(valueEl).toBeInTheDocument();
      expect(valueEl).toHaveClass('break-all');
      expect(valueEl).toHaveClass('font-mono');
      expect(valueEl.parentElement).toHaveClass('col-span-2');
    });

    it('renders fallback when value is empty or null', () => {
      render(<MobileCardContentItem label="Notes" value="" />);

      expect(screen.getByText('Not provided')).toBeInTheDocument();
    });

    it('renders custom fallback text', () => {
      render(<MobileCardContentItem label="Notes" value={null} fallbackText="None" />);

      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('renders custom children instead of value or fallback', () => {
      render(
        <MobileCardContentItem label="Custom Element">
          <span data-testid="custom-child">Special Value</span>
        </MobileCardContentItem>,
      );

      expect(screen.getByTestId('custom-child')).toBeInTheDocument();
      expect(screen.getByText('Special Value')).toBeInTheDocument();
    });
  });

  it('renders MobileCardActions', () => {
    render(
      <MobileCardActions className="custom-actions">
        <button>Action Button</button>
      </MobileCardActions>,
    );

    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });
});
