type PanelHeaderProps = {
  isEditing: boolean
  onClose: () => void
}

/** Panel header with title and close button. */
export function PanelHeader({ isEditing, onClose }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-4">
      <h2 className="font-heading text-lg font-semibold text-text">
        {isEditing ? 'Edit Field' : 'Add New Field'}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close panel"
        className="rounded p-1 text-muted hover:bg-muted/10 hover:text-text"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  )
}
