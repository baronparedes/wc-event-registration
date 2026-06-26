import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'

type AdminPaginationControlsProps = {
  currentPage: number
  totalPages: number
  isLoading?: boolean
  canGoPrevious: boolean
  canGoNext: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  onPageSizeChange?: (pageSize: number) => void
  onFirstPage: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onLastPage: () => void
  onGoToPage: (page: number) => void
}

export function AdminPaginationControls(props: AdminPaginationControlsProps) {
  const {
    currentPage,
    totalPages,
    isLoading = false,
    canGoPrevious,
    canGoNext,
    pageSize,
    pageSizeOptions,
    onPageSizeChange,
    onFirstPage,
    onPreviousPage,
    onNextPage,
    onLastPage,
    onGoToPage,
  } = props

  const [pageInput, setPageInput] = useState(String(currentPage))
  const [isEditingPage, setIsEditingPage] = useState(false)

  const displayedPageInput = isEditingPage ? pageInput : String(currentPage)

  function commitPage(nextValue: string, finishEditing = true) {
    const parsedPage = Number.parseInt(nextValue, 10)
    if (!Number.isFinite(parsedPage)) {
      setPageInput(String(currentPage))
      if (finishEditing) {
        setIsEditingPage(false)
      }
      return
    }

    const nextPage = Math.min(totalPages, Math.max(1, parsedPage))
    setPageInput(String(nextPage))
    if (finishEditing) {
      setIsEditingPage(false)
    }

    if (nextPage !== currentPage) {
      onGoToPage(nextPage)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    commitPage(displayedPageInput)
  }

  function handlePageInputChange(nextValue: string) {
    setIsEditingPage(true)
    setPageInput(nextValue)

    const parsedPage = Number.parseInt(nextValue, 10)
    if (!Number.isFinite(parsedPage)) {
      return
    }

    const nextPage = Math.min(totalPages, Math.max(1, parsedPage))
    if (Math.abs(nextPage - currentPage) === 1) {
      commitPage(nextValue, false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {pageSizeOptions && pageSizeOptions.length > 0 && pageSize && onPageSizeChange ? (
        <div className="flex w-full items-center justify-center gap-2 text-sm text-muted sm:w-auto sm:justify-start">
          <span className="shrink-0 whitespace-nowrap">Rows per page</span>
          <label className="sr-only" htmlFor="admin-pagination-page-size">
            Rows per page
          </label>
          <select
            id="admin-pagination-page-size"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={isLoading}
            className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex w-full flex-nowrap items-center justify-center gap-1.5 sm:w-auto sm:justify-end sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFirstPage}
          disabled={!canGoPrevious || isLoading}
          className="px-2.5 sm:px-3"
          aria-label="Go to first page"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!canGoPrevious || isLoading}
          className="px-2.5 sm:px-3"
          aria-label="Go to previous page"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        <form
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2"
          onSubmit={handleSubmit}
        >
          <label className="sr-only" htmlFor="admin-pagination-page-input">
            Go to page
          </label>
          <input
            id="admin-pagination-page-input"
            type="number"
            min={1}
            max={totalPages}
            inputMode="numeric"
            value={displayedPageInput}
            onChange={(event) => handlePageInputChange(event.target.value)}
            onBlur={() => commitPage(displayedPageInput)}
            disabled={isLoading || totalPages <= 1}
            className="w-10 border-0 bg-transparent px-0 py-0 text-center text-sm text-text focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-600"
            aria-label="Go to page"
          />
          <span className="text-xs text-muted">/ {totalPages}</span>
        </form>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!canGoNext || isLoading}
          className="px-2.5 sm:px-3"
          aria-label="Go to next page"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLastPage}
          disabled={!canGoNext || isLoading}
          className="px-2.5 sm:px-3"
          aria-label="Go to last page"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
