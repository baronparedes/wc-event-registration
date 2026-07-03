import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Col, Grid } from '@/components/ui/Grid';

describe('Grid', () => {
  it('renders default grid classes when only base is provided', () => {
    render(
      <Grid data-testid="grid-default">
        <div>Child</div>
      </Grid>,
    );

    const grid = screen.getByTestId('grid-default');
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('gap-2');
  });

  it('renders responsive grid classes and custom gap/className', () => {
    render(
      <Grid
        data-testid="grid-responsive"
        base={2}
        sm={3}
        md={4}
        lg={5}
        xl={6}
        gapClassName="gap-x-3 gap-y-4"
        className="custom-grid"
      >
        <div>Child</div>
      </Grid>,
    );

    const grid = screen.getByTestId('grid-responsive');
    expect(grid).toHaveClass('grid-cols-2');
    expect(grid).toHaveClass('sm:grid-cols-3');
    expect(grid).toHaveClass('md:grid-cols-4');
    expect(grid).toHaveClass('lg:grid-cols-5');
    expect(grid).toHaveClass('xl:grid-cols-6');
    expect(grid).toHaveClass('gap-x-3');
    expect(grid).toHaveClass('gap-y-4');
    expect(grid).toHaveClass('custom-grid');
  });
});

describe('Col', () => {
  it('renders default column wrapper without span classes', () => {
    render(
      <Col data-testid="col-default">
        <span>Item</span>
      </Col>,
    );

    const col = screen.getByTestId('col-default');
    expect(col).toHaveClass('min-w-0');
    expect(col.className).not.toContain('col-span-');
  });

  it('renders responsive span classes and custom className', () => {
    render(
      <Col data-testid="col-responsive" base={2} sm={3} md={4} lg={5} xl={6} className="custom-col">
        <span>Item</span>
      </Col>,
    );

    const col = screen.getByTestId('col-responsive');
    expect(col).toHaveClass('col-span-2');
    expect(col).toHaveClass('sm:col-span-3');
    expect(col).toHaveClass('md:col-span-4');
    expect(col).toHaveClass('lg:col-span-5');
    expect(col).toHaveClass('xl:col-span-6');
    expect(col).toHaveClass('custom-col');
  });
});
