import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Link, type LinkProps } from 'react-router-dom';

export type MobileCardProps = {
  children: ReactNode;
  className?: string;
};

export function MobileCard({ children, className }: MobileCardProps) {
  return (
    <article
      className={`relative rounded-2xl border border-border/40 bg-surface shadow-sm ${
        className ?? ''
      }`.trim()}
    >
      {children}
    </article>
  );
}

export type MobileCardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function MobileCardHeader({ children, className }: MobileCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className ?? ''}`.trim()}>
      {children}
    </div>
  );
}

export type MobileCardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function MobileCardBody({ children, className }: MobileCardBodyProps) {
  return <div className={`space-y-3 p-4 pb-3 ${className ?? ''}`.trim()}>{children}</div>;
}

export type MobileCardDividerProps = {
  className?: string;
};

export function MobileCardDivider({ className }: MobileCardDividerProps) {
  return <div className={`border-t border-slate-100 ${className ?? ''}`.trim()} />;
}

export type MobileCardContentProps = {
  children: ReactNode;
  className?: string;
};

export function MobileCardContent({ children, className }: MobileCardContentProps) {
  return (
    <dl className={`grid grid-cols-2 gap-x-4 gap-y-4 py-1 ${className ?? ''}`.trim()}>
      {children}
    </dl>
  );
}

export type MobileCardContentItemProps = {
  label: ReactNode;
  value?: ReactNode;
  children?: ReactNode;
  fallbackText?: string;
  colSpan?: 1 | 2;
  isMono?: boolean;
  isBreakAll?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export function MobileCardContentItem({
  label,
  value,
  children,
  fallbackText = 'Not provided',
  colSpan = 1,
  isMono = false,
  isBreakAll = false,
  className,
  labelClassName,
  valueClassName,
}: MobileCardContentItemProps) {
  const spanClass = colSpan === 2 ? 'col-span-2' : 'pr-0 sm:pr-2';
  const defaultLabelClass =
    colSpan === 2
      ? 'text-xs font-medium uppercase tracking-wider text-slate-500'
      : 'text-xs font-semibold uppercase tracking-wider text-slate-500';

  const defaultDdClass = `mt-1 text-[15px] font-medium text-slate-700 ${
    isBreakAll ? 'break-all' : 'truncate'
  } ${isMono ? 'font-mono' : ''}`;

  const renderValue = () => {
    if (children !== undefined) {
      return children;
    }
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
    return <span className="italic font-normal text-slate-400">{fallbackText}</span>;
  };

  return (
    <div className={`${spanClass} ${className ?? ''}`.trim()}>
      <dt className={labelClassName ?? defaultLabelClass}>{label}</dt>
      <dd className={valueClassName ?? defaultDdClass.trim()}>{renderValue()}</dd>
    </div>
  );
}

export type MobileCardActionsProps = {
  children: ReactNode;
  className?: string;
};

export function MobileCardActions({ children, className }: MobileCardActionsProps) {
  return <div className={`flex gap-3 p-4 pt-0 ${className ?? ''}`.trim()}>{children}</div>;
}

export type MobileCardActionVariant = 'primary' | 'destructive' | 'secondary' | 'muted';

const mobileActionBaseClassName =
  'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors no-underline focus:outline-none focus:ring-2 focus:ring-inset';

const mobileActionVariantClasses: Record<MobileCardActionVariant, string> = {
  primary: 'bg-primary text-white shadow-sm hover:bg-primary/90 focus:ring-primary/30',
  destructive:
    'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500/30',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:ring-primary/30',
  muted: 'border border-border bg-surface text-muted cursor-default focus:ring-0',
};

export type MobileCardActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: MobileCardActionVariant;
  children: ReactNode;
  className?: string;
};

export function MobileCardActionButton({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}: MobileCardActionButtonProps) {
  return (
    <button
      type={type}
      className={`${mobileActionBaseClassName} ${mobileActionVariantClasses[variant]} ${
        className ?? ''
      }`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export type MobileCardActionLinkProps = LinkProps & {
  variant?: MobileCardActionVariant;
  children: ReactNode;
  className?: string;
};

export function MobileCardActionLink({
  variant = 'primary',
  className,
  children,
  ...props
}: MobileCardActionLinkProps) {
  return (
    <Link
      className={`${mobileActionBaseClassName} ${mobileActionVariantClasses[variant]} ${
        className ?? ''
      }`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}

export type MobileCardActionPillProps = {
  children: ReactNode;
  className?: string;
};

export function MobileCardActionPill({ children, className }: MobileCardActionPillProps) {
  return (
    <div
      className={`${mobileActionBaseClassName} ${mobileActionVariantClasses.muted} ${
        className ?? ''
      }`.trim()}
    >
      {children}
    </div>
  );
}
