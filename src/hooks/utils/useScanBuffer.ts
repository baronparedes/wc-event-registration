import { useEffect, type RefObject } from 'react'

/**
 * Global RFID scan buffer for kiosk mode.
 *
 * Accumulates keystrokes into a buffer and fires callback on scan completion.
 * Scans complete when:
 * - User presses Enter (most common for RFID readers)
 * - Or buffer reaches a reasonable length with no input for a short time
 *
 * Ignores input when user is actively typing in textarea, contenteditable, or excluded inputs.
 * Prevents keystroke interference with form inputs by consuming events.
 */
export function useScanBuffer(
  onScanComplete: (scanValue: string) => void,
  isActive: boolean = true,
  excludeInputRef?: RefObject<HTMLInputElement | null>,
) {
  useEffect(() => {
    if (!isActive) return

    let buffer = ''
    let scanTimeoutId: ReturnType<typeof setTimeout> | null = null

    const completeScan = (value: string) => {
      if (value.trim()) {
        onScanComplete(value.trim())
      }
      buffer = ''
      if (scanTimeoutId) {
        clearTimeout(scanTimeoutId)
        scanTimeoutId = null
      }
    }

    const handleKeydown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLElement | null
      const activeTag = activeElement?.tagName

      const isEditableTarget =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        Boolean(activeElement?.isContentEditable)

      // Never treat normal typing in editable controls as scan input
      if (isEditableTarget) {
        return
      }

      // Ignore if user is typing in the excluded input (e.g., Member ID)
      if (excludeInputRef?.current && activeElement === excludeInputRef.current) {
        return
      }

      // Enter typically terminates a scan from RFID reader
      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          e.preventDefault()
          completeScan(buffer)
        }
        return
      }

      // Handle backspace/delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (buffer.length > 0) {
          e.preventDefault()
          buffer = buffer.slice(0, -1)

          // Reset timeout
          if (scanTimeoutId) {
            clearTimeout(scanTimeoutId)
          }
          scanTimeoutId = setTimeout(() => {
            // Auto-complete if we have a reasonable scan length and no input for a bit
            if (buffer.length > 3) {
              completeScan(buffer)
            }
            scanTimeoutId = null
          }, 800)
        }
        return
      }

      // Capture printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        buffer += e.key

        // Reset auto-complete timeout on each keystroke
        if (scanTimeoutId) {
          clearTimeout(scanTimeoutId)
        }

        // Auto-complete if buffer looks complete (length > 5 and quiet for 300ms)
        // This handles readers that don't send Enter
        scanTimeoutId = setTimeout(() => {
          if (buffer.length > 5) {
            completeScan(buffer)
          }
          scanTimeoutId = null
        }, 300)
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      if (scanTimeoutId) {
        clearTimeout(scanTimeoutId)
      }
    }
  }, [onScanComplete, isActive, excludeInputRef])
}
