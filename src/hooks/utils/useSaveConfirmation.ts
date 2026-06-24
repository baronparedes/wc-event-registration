import { useState, useCallback } from 'react'
import type { CreateEventInput } from '@/lib/domain/events'

export type SaveConfirmationState = {
  showDialog: boolean
  pendingFormData: CreateEventInput | null
}

/**
 * Encapsulates confirmation dialog state for published event saves.
 *
 * When editing a published event, shows a confirmation dialog before allowing saves.
 * Handles the lifecycle of showing the dialog, canceling, and confirming saves.
 *
 * @returns {
 *   showDialog: boolean - Whether confirmation dialog is visible
 *   pendingFormData: CreateEventInput | null - Form data awaiting confirmation
 *   requestConfirmation: (data: CreateEventInput) => void - Request confirmation for pending save
 *   confirmSave: () => void - User confirmed the save
 *   cancelSave: () => void - User canceled the save
 * }
 */
export function useSaveConfirmation() {
  const [showDialog, setShowDialog] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<CreateEventInput | null>(null)

  const requestConfirmation = useCallback((data: CreateEventInput) => {
    setPendingFormData(data)
    setShowDialog(true)
  }, [])

  const confirmSave = useCallback(() => {
    setShowDialog(false)
    // Caller will use pendingFormData directly via the returned ref
  }, [])

  const cancelSave = useCallback(() => {
    setShowDialog(false)
    setPendingFormData(null)
  }, [])

  return {
    showDialog,
    pendingFormData,
    requestConfirmation,
    confirmSave,
    cancelSave,
  }
}
