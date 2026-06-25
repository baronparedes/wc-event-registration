import type { HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement>

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

/** Shared loading placeholder primitive for slow-network states. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cx('skeleton-shimmer rounded-md', className)} role="presentation" {...props} />
  )
}
