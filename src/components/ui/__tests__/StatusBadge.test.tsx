import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LifecycleStatusBadge, MemberStatusBadge, RegistrationStatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  describe('LifecycleStatusBadge', () => {
    it('renders draft status correctly', () => {
      render(<LifecycleStatusBadge status="draft" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
      // Should have outline class
      const badge = screen.getByText('Draft');
      expect(badge).toHaveClass('border-primary/60');
    });

    it('renders published status correctly', () => {
      render(<LifecycleStatusBadge status="published" />);
      expect(screen.getByText('Published')).toBeInTheDocument();
      const badge = screen.getByText('Published');
      expect(badge).toHaveClass('bg-primary');
    });

    it('renders archived status correctly', () => {
      render(<LifecycleStatusBadge status="archived" />);
      expect(screen.getByText('Archived')).toBeInTheDocument();
      const badge = screen.getByText('Archived');
      expect(badge).toHaveClass('bg-red-600/50');
    });

    it('falls back to draft for unknown status', () => {
      render(<LifecycleStatusBadge status="unknown-status" />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('RegistrationStatusBadge', () => {
    it('renders submitted status correctly', () => {
      render(<RegistrationStatusBadge status="submitted" />);
      expect(screen.getByText('Submitted')).toBeInTheDocument();
      const badge = screen.getByText('Submitted');
      expect(badge).toHaveClass('bg-primary');
    });

    it('renders updated status correctly', () => {
      render(<RegistrationStatusBadge status="updated" />);
      expect(screen.getByText('Updated')).toBeInTheDocument();
      const badge = screen.getByText('Updated');
      expect(badge).toHaveClass('border-primary');
    });

    it('renders cancelled status correctly', () => {
      render(<RegistrationStatusBadge status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
      const badge = screen.getByText('Cancelled');
      expect(badge).toHaveClass('bg-red-600/50');
    });

    it('renders unknown status with default styling and original text', () => {
      render(<RegistrationStatusBadge status="Pending Review" />);
      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      const badge = screen.getByText('Pending Review');
      expect(badge).toHaveClass('border-primary/60'); // outline variant
    });

    it('handles mixed case status strings', () => {
      render(<RegistrationStatusBadge status="SubMitted" />);
      expect(screen.getByText('Submitted')).toBeInTheDocument();
    });
  });

  describe('MemberStatusBadge', () => {
    it('renders active status correctly', () => {
      render(<MemberStatusBadge isActive={true} />);
      expect(screen.getByText('Active')).toBeInTheDocument();
      const badge = screen.getByText('Active');
      expect(badge).toHaveClass('bg-primary');
    });

    it('renders inactive status correctly', () => {
      render(<MemberStatusBadge isActive={false} />);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
      const badge = screen.getByText('Inactive');
      expect(badge).toHaveClass('bg-red-600/50');
    });
  });
});
