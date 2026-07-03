import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Link, type LinkProps } from 'react-router-dom';

type ActionVariant = 'default' | 'destructive';

type ActionLinkProps = LinkProps & {
  children: ReactNode;
  variant?: ActionVariant;
  className?: string;
};

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ActionVariant;
};

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

const variantClassName: Record<ActionVariant, string> = {
  default: 'text-primary',
  destructive: 'text-red-600',
};

const baseClassName = 'underline-offset-2 hover:underline';

/** Shared inline action link style for table/list actions. */
export function ActionLink({
  children,
  variant = 'default',
  className,
  ...props
}: ActionLinkProps) {
  return (
    <Link className={cx(baseClassName, variantClassName[variant], className)} {...props}>
      {children}
    </Link>
  );
}

/** Shared inline action button style for table/list actions. */
export function ActionButton({
  children,
  variant = 'default',
  className,
  ...props
}: ActionButtonProps) {
  return (
    <button className={cx(baseClassName, variantClassName[variant], className)} {...props}>
      {children}
    </button>
  );
}
