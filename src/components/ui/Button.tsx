import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'

type ButtonVariant = 'default' | 'outline' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  asChild?: boolean
  children: ReactNode
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const variantClassName: Record<ButtonVariant, string> = {
  default:
    'bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60',
  outline: 'border border-border bg-background text-text hover:bg-background disabled:opacity-60',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
}

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3.5 py-2 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
}

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
  } = props

  const classes = cx(
    'rounded-md font-medium leading-snug transition focus:outline-none focus:ring-2 focus:ring-primary/30',
    variantClassName[variant],
    sizeClassName[size],
    fullWidth && 'w-full',
    className,
  )

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<HTMLAttributes<HTMLElement>>
    return cloneElement(child, {
      className: cx(child.props.className, classes),
    })
  }

  return (
    <button className={classes} type={type} {...buttonProps}>
      {children}
    </button>
  )
}
