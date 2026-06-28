import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { SectionCard, type SectionCardProps } from './SectionCard'

export type CollapsibleSectionCardProps = SectionCardProps & {
  children: ReactNode
  defaultExpanded?: boolean
  collapseLabel?: string
  expandLabel?: string
}

/**
 * Composed section card that adds optional collapse/expand behavior while
 * preserving the base SectionCard layout and styling.
 */
export function CollapsibleSectionCard(props: CollapsibleSectionCardProps) {
  const {
    children,
    defaultExpanded = true,
    collapseLabel = 'Collapse section',
    expandLabel = 'Expand section',
    ...sectionCardProps
  } = props

  const contentId = useId()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const actionLabel = isExpanded ? collapseLabel : expandLabel
  const wrapperClassName = sectionCardProps.wrapperClassName
    ? `${sectionCardProps.wrapperClassName} relative pr-16`
    : 'relative rounded-2xl border border-border bg-surface p-6 pr-16 shadow-sm'

  return (
    <SectionCard {...sectionCardProps} wrapperClassName={wrapperClassName}>
      <button
        aria-controls={contentId}
        aria-expanded={isExpanded}
        aria-label={actionLabel}
        className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted transition-all hover:bg-background/80 hover:text-text hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        onClick={() => {
          setIsExpanded((current) => !current)
        }}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <span className="sr-only">{actionLabel}</span>
      </button>

      {isExpanded ? <div id={contentId}>{children}</div> : null}
    </SectionCard>
  )
}
