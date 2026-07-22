import type { ReactNode } from 'react';

import { cx } from 'class-variance-authority';
import { ChevronRight } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

type AdminPageShellProps = {
  children: ReactNode;
};

export function AdminPageShell({ children }: AdminPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 print:px-8 print:py-8">
      <div className="space-y-5">{children}</div>
    </div>
  );
}

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{
    label: string;
    to?: string;
  }>;
  navLinks?: ReactNode;
};

function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  navLinks,
}: AdminPageHeaderProps) {
  return (
    <div className="space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted print:hidden">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
              {crumb.to ? (
                <Link to={crumb.to} className="truncate hover:text-text hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-3xl font-bold text-text">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        </div>
        {actions && (
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            {actions}
          </div>
        )}
      </div>

      {navLinks && (
        <div className="border-b border-border print:hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <nav className="-mb-px flex gap-6">{navLinks}</nav>
          </div>
        </div>
      )}
    </div>
  );
}

type AdminPageFiltersProps = {
  children: ReactNode;
  className?: string;
};

function AdminPageFilters({ children, className }: AdminPageFiltersProps) {
  return (
    <div className={cx('rounded-2xl border border-border bg-surface p-4', className)}>
      {children}
    </div>
  );
}

type AdminPageContentProps = {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
  loadingMessage?: string;
};

function AdminPageContent({
  children,
  className,
  isLoading,
  loadingMessage,
}: AdminPageContentProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <p className="text-sm text-muted">{loadingMessage || 'Loading...'}</p>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

type AdminPageSubNavProps = {
  children: ReactNode;
};

function AdminPageSubNav({ children }: AdminPageSubNavProps) {
  return (
    <div className="border-b border-border">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <nav className="-mb-px flex gap-6">{children}</nav>
      </div>
    </div>
  );
}

AdminPageShell.Header = AdminPageHeader;
AdminPageShell.Filters = AdminPageFilters;
AdminPageShell.Content = AdminPageContent;
AdminPageShell.SubNav = AdminPageSubNav;

type AdminSubNavLinkProps = {
  to: string;
  children: ReactNode;
};

export function AdminSubNavLink({ to, children }: AdminSubNavLinkProps) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cx(
          'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
          isActive
            ? 'border-primary text-primary'
            : 'border-transparent text-muted hover:border-border hover:text-text',
        )
      }
    >
      {children}
    </NavLink>
  );
}
