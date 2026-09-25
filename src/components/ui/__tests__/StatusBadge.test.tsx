import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LifecycleStatusBadge, MemberStatusBadge, RegistrationStatusBadge } from '../StatusBadge';

describe('LifecycleStatusBadge', () => {
  it('renders published status correctly', () => {
    render(<LifecycleStatusBadge status="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders draft status correctly', () => {
    render(<LifecycleStatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders archived status correctly', () => {
    render(<LifecycleStatusBadge status="archived" />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('falls back to draft for unknown status', () => {
    render(<LifecycleStatusBadge status="unknown" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});

describe('RegistrationStatusBadge', () => {
  it('renders submitted status correctly', () => {
    render(<RegistrationStatusBadge status="submitted" />);
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });

  it('renders updated status correctly', () => {
    render(<RegistrationStatusBadge status="updated" />);
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('renders cancelled status correctly', () => {
    render(<RegistrationStatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders custom/fallback status', () => {
    render(<RegistrationStatusBadge status="waitlisted" />);
    expect(screen.getByText('waitlisted')).toBeInTheDocument();
  });
});

describe('MemberStatusBadge', () => {
  it('renders active status', () => {
    render(<MemberStatusBadge isActive={true} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders inactive status', () => {
    render(<MemberStatusBadge isActive={false} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
