import type { HTMLAttributes, ReactNode } from 'react';

type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;

type GridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  base?: GridColumns;
  sm?: GridColumns;
  md?: GridColumns;
  lg?: GridColumns;
  xl?: GridColumns;
  gapClassName?: string;
};

type ColSpan = 1 | 2 | 3 | 4 | 5 | 6;

type ColProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  base?: ColSpan;
  sm?: ColSpan;
  md?: ColSpan;
  lg?: ColSpan;
  xl?: ColSpan;
};

const BASE_COL_CLASS: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const SM_COL_CLASS: Record<GridColumns, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
};

const MD_COL_CLASS: Record<GridColumns, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const LG_COL_CLASS: Record<GridColumns, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
};

const XL_COL_CLASS: Record<GridColumns, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-6',
};

const BASE_SPAN_CLASS: Record<ColSpan, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
};

const SM_SPAN_CLASS: Record<ColSpan, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  5: 'sm:col-span-5',
  6: 'sm:col-span-6',
};

const MD_SPAN_CLASS: Record<ColSpan, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
};

const LG_SPAN_CLASS: Record<ColSpan, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
};

const XL_SPAN_CLASS: Record<ColSpan, string> = {
  1: 'xl:col-span-1',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  6: 'xl:col-span-6',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Reusable responsive grid primitive. Controls column count per viewport breakpoint.
 */
export function Grid({
  children,
  base = 1,
  sm,
  md,
  lg,
  xl,
  gapClassName = 'gap-2',
  className,
  ...props
}: GridProps) {
  return (
    <div
      className={cx(
        'grid',
        BASE_COL_CLASS[base],
        sm && SM_COL_CLASS[sm],
        md && MD_COL_CLASS[md],
        lg && LG_COL_CLASS[lg],
        xl && XL_COL_CLASS[xl],
        gapClassName,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Grid column item primitive.
 * Keep content-specific rendering concerns out of Grid while still allowing per-breakpoint spans.
 */
export function Col({ children, base, sm, md, lg, xl, className, ...props }: ColProps) {
  return (
    <div
      className={cx(
        'min-w-0',
        base && BASE_SPAN_CLASS[base],
        sm && SM_SPAN_CLASS[sm],
        md && MD_SPAN_CLASS[md],
        lg && LG_SPAN_CLASS[lg],
        xl && XL_SPAN_CLASS[xl],
        className,
      )}
      {...(props as HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
}
