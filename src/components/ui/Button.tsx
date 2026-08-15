import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  cloneElement,
  isValidElement,
} from 'react';

type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'primaryOutline'
  | 'ghost'
  | 'link'
  | 'destructive';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  asChild?: boolean;
  children: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const variantClassName: Record<ButtonVariant, string> = {
  default:
    'bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
  secondary:
    'bg-secondary text-white hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60',
  accent: 'bg-accent text-text hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60',
  outline: 'border border-border bg-background text-text hover:bg-background disabled:opacity-60',
  primaryOutline:
    'border border-primary bg-background text-primary shadow-xs hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60',
  ghost:
    'bg-transparent text-text shadow-none hover:bg-primary/10 hover:shadow-none hover:scale-100 disabled:cursor-not-allowed disabled:opacity-60',
  link: 'bg-transparent p-0 text-primary shadow-none hover:text-primary/80 hover:underline hover:shadow-none hover:scale-100 disabled:cursor-not-allowed disabled:opacity-60',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
};

const sizeClassName: Record<ButtonSize, string> = {
  xs: 'min-h-8 px-3.5 py-2 text-xs',
  sm: 'min-h-10 px-3.5 py-2 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
};

/** Shared button primitive for consistent variants, sizes, and disabled behavior. */
export function Button(props: ButtonProps) {
  const {
    variant = 'default',
    size = 'md',
    fullWidth = false,
    asChild = false,
    className,
    type = 'button',
    children,
    ...buttonProps
  } = props;

  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium leading-snug transition-all hover:shadow-md hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30',
    variantClassName[variant],
    sizeClassName[size],
    fullWidth && 'w-full',
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<HTMLAttributes<HTMLElement>>;
    return cloneElement(child, {
      className: cx(child.props.className, classes),
    });
  }

  return (
    <button className={classes} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
