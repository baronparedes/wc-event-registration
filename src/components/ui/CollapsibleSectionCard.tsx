import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
  const shouldReduceMotion = useReducedMotion()
  const actionLabel = isExpanded ? collapseLabel : expandLabel
  const wrapperClassName = sectionCardProps.wrapperClassName
    ? `${sectionCardProps.wrapperClassName} relative`
    : 'relative rounded-2xl border border-border bg-surface p-6 shadow-sm'
  const titleClassName = sectionCardProps.titleClassName
    ? `${sectionCardProps.titleClassName} pr-16`
    : 'font-heading text-xl font-semibold text-text pr-16'
  const subtitleClassName = sectionCardProps.subtitleClassName
    ? `${sectionCardProps.subtitleClassName} pr-16`
    : 'mt-2 text-sm text-muted pr-16'

  return (
    <SectionCard
      {...sectionCardProps}
      wrapperClassName={wrapperClassName}
      titleClassName={titleClassName}
      subtitleClassName={subtitleClassName}
    >
      <button
        aria-controls={contentId}
        aria-expanded={isExpanded}
        aria-label={actionLabel}
        className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        onClick={() => {
          setIsExpanded((current) => !current)
        }}
        title={actionLabel}
        type="button"
      >
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
        />
        <span className="sr-only">{actionLabel}</span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={contentId}
            key={contentId}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.24,
                    ease: [0.22, 0.61, 0.36, 1],
                  }
            }
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  )
}
