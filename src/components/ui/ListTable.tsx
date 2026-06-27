import { createContext, useContext } from 'react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type ListTableDensity = 'default' | 'dense'
type ListTableHeaderVariant = 'default' | 'muted' | 'plain'
type ListTableBodyDivider = 'default' | 'none'
type ListTableRowHover = 'default' | 'muted' | 'none'

type ListTableProps = ComponentPropsWithoutRef<'table'> & {
  density?: ListTableDensity
}
type ListTableSectionProps = {
  children: ReactNode
  className?: string
}
type ListTableBodyProps = ListTableSectionProps & {
  divider?: ListTableBodyDivider
}
type ListTableRowProps = ComponentPropsWithoutRef<'tr'> & {
  hover?: ListTableRowHover
}
type ListTableCellProps = ComponentPropsWithoutRef<'td'> & {
  density?: ListTableDensity
}
type ListTableHeaderRowProps = ComponentPropsWithoutRef<'tr'> & {
  variant?: ListTableHeaderVariant
}
type ListTableHeaderCellProps = ComponentPropsWithoutRef<'th'> & {
  density?: ListTableDensity
}

const tableDensityContext = createContext<ListTableDensity>('default')

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Shared list table primitives for admin list pages.
 *
 * Theme table look and feel here, then reuse these primitives in list screens.
 */
export function ListTable({ className, density = 'default', ...props }: ListTableProps) {
  return (
    <tableDensityContext.Provider value={density}>
      <div className="overflow-x-auto">
        <table className={joinClasses('w-full text-sm', className)} {...props} />
      </div>
    </tableDensityContext.Provider>
  )
}

export function ListTableHead({ children, className }: ListTableSectionProps) {
  return <thead className={joinClasses(className)}>{children}</thead>
}

export function ListTableHeaderRow({
  className,
  variant = 'default',
  ...props
}: ListTableHeaderRowProps) {
  const headerStyles: Record<ListTableHeaderVariant, string> = {
    default:
      'border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted',
    muted:
      'border-b border-border bg-muted/30 text-left text-sm font-medium normal-case tracking-normal text-muted',
    plain:
      'border-b border-gray-200 text-left text-sm font-semibold normal-case tracking-normal text-gray-900',
  }

  return <tr className={joinClasses(headerStyles[variant], className)} {...props} />
}

export function ListTableBody({ children, className, divider = 'default' }: ListTableBodyProps) {
  const dividerStyles: Record<ListTableBodyDivider, string> = {
    default: 'divide-y divide-border',
    none: '',
  }

  return <tbody className={joinClasses(dividerStyles[divider], className)}>{children}</tbody>
}

export function ListTableRow({ className, hover = 'default', ...props }: ListTableRowProps) {
  const hoverStyles: Record<ListTableRowHover, string> = {
    default: 'transition-all hover:bg-slate-50 hover:shadow-xs',
    muted: 'transition hover:bg-muted/10',
    none: '',
  }

  return <tr className={joinClasses(hoverStyles[hover], className)} {...props} />
}

export function ListTableHeaderCell({ className, density, ...props }: ListTableHeaderCellProps) {
  const tableDensity = useContext(tableDensityContext)
  const resolvedDensity = density ?? tableDensity
  const densityStyles: Record<ListTableDensity, string> = {
    default: 'px-4 py-3',
    dense: 'px-4 py-2.5',
  }

  return <th className={joinClasses(densityStyles[resolvedDensity], className)} {...props} />
}

export function ListTableCell({ className, density, ...props }: ListTableCellProps) {
  const tableDensity = useContext(tableDensityContext)
  const resolvedDensity = density ?? tableDensity
  const densityStyles: Record<ListTableDensity, string> = {
    default: 'px-4 py-4',
    dense: 'px-4 py-3',
  }

  return <td className={joinClasses(densityStyles[resolvedDensity], className)} {...props} />
}
