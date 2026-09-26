import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublishFormRequirementsChecker } from '../PublishFormRequirementsChecker';

describe('PublishFormRequirementsChecker', () => {
  it('renders requirements progress and items correctly when unmet', () => {
    render(
      <PublishFormRequirementsChecker
        formValues={{
          title: 'My Form',
          slug: 'my-form',
          fieldsCount: 0,
        }}
      />,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Publish Requirements (2/3)',
    );
    expect(screen.getByText('Form Title')).toBeInTheDocument();
    expect(screen.getByText('Form Slug')).toBeInTheDocument();
    expect(screen.getByText('At least 1 Dynamic Field')).toBeInTheDocument();
    expect(screen.queryByText('✓ Form is ready to publish')).not.toBeInTheDocument();
  });

  it('renders success banner when all requirements are met', () => {
    render(
      <PublishFormRequirementsChecker
        formValues={{
          title: 'My Form',
          slug: 'my-form',
          fieldsCount: 1,
        }}
      />,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Publish Requirements (3/3)',
    );
    expect(screen.getByText('✓ Form is ready to publish')).toBeInTheDocument();
  });
});
