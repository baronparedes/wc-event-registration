import { useState } from 'react';

import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button, ConfirmDialog, Dialog, FormInputField } from '@/components/ui';
import {
  useAttendanceSavedViewsQuery,
  useDeleteAttendanceSavedViewMutation,
  useUpsertAttendanceSavedViewMutation,
} from '@/hooks/domain/attendance';
import type { AttendeeViewConfig } from '@/lib/domain/attendance-views';

interface SavedViewsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  currentViewConfig: AttendeeViewConfig;
  currentViewId: string | null;
  onApplyView: (config: AttendeeViewConfig) => void;
  onViewDeleted: () => void;
  canDelete?: boolean;
}

export function SavedViewsModal({
  isOpen,
  onOpenChange,
  eventId,
  currentViewConfig,
  currentViewId,
  onApplyView,
  onViewDeleted,
  canDelete = true,
}: SavedViewsModalProps) {
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');

  const { data: savedViews = [] } = useAttendanceSavedViewsQuery(eventId);
  const upsertMutation = useUpsertAttendanceSavedViewMutation();
  const deleteMutation = useDeleteAttendanceSavedViewMutation();
  const currentSavedView = currentViewId
    ? savedViews.find((view) => view.id === currentViewId)
    : null;

  function handleSaveNewView() {
    if (!newViewName.trim()) return;

    upsertMutation.mutate(
      {
        event_id: eventId,
        name: newViewName.trim(),
        view_config: currentViewConfig,
      },
      {
        onSuccess: (result) => {
          setNewViewName('');
          setShowSaveDialog(false);
          onOpenChange(false);
          // Add viewId query param and apply the saved view
          onApplyView(currentViewConfig);
          const params = new URLSearchParams(window.location.search);
          params.set('viewId', result.id);
          navigate(`?${params.toString()}`, { replace: true });
        },
      },
    );
  }

  function handleApplyView(viewId: string) {
    const view = savedViews.find((v) => v.id === viewId);
    if (view) {
      onApplyView(view.view_config);
      onOpenChange(false);
      // Add viewId query param
      const params = new URLSearchParams(window.location.search);
      params.set('viewId', viewId);
      navigate(`?${params.toString()}`, { replace: true });
    }
  }

  function handleUpdateCurrentView() {
    if (!currentViewId || !currentSavedView) return;

    upsertMutation.mutate(
      {
        id: currentViewId,
        event_id: eventId,
        name: currentSavedView.name,
        view_config: currentViewConfig,
      },
      {
        onSuccess: (result) => {
          onApplyView(currentViewConfig);
          onOpenChange(false);
          const params = new URLSearchParams(window.location.search);
          params.set('viewId', result.id);
          navigate(`?${params.toString()}`, { replace: true });
        },
      },
    );
  }

  function handleDeleteView(viewId: string) {
    setDeleteViewId(viewId);
    setShowDeleteConfirm(true);
  }

  function handleConfirmDelete() {
    if (!deleteViewId) return;
    const isCurrentView = deleteViewId === currentViewId;
    deleteMutation.mutate(
      { id: deleteViewId, eventId },
      {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          setDeleteViewId(null);
          onOpenChange(false); // Close the modal after successful delete
          // If deleting the current view, clear the view controls and remove viewId param
          if (isCurrentView) {
            onViewDeleted();
            const params = new URLSearchParams(window.location.search);
            params.delete('viewId');
            navigate(params.toString() ? `?${params.toString()}` : '.', { replace: true });
          }
        },
      },
    );
  }

  if (!isOpen) return null;

  return (
    <>
      <Dialog isOpen={isOpen} onClose={() => onOpenChange(false)} maxWidthClass="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Saved Views</h2>
            <p className="mt-1 text-sm text-muted">
              Load a saved view or save the current configuration.
            </p>
          </div>

          {savedViews.length === 0 ? (
            <div className="rounded-md border border-border bg-surface p-4 text-center text-sm text-muted">
              <p>No saved views yet.</p>
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{view.name}</p>
                    <p className="text-xs text-muted">
                      {new Date(view.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-2 flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyView(view.id)}
                      className="text-xs px-2"
                    >
                      Apply
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteView(view.id)}
                        className="text-xs px-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Close
            </Button>
            {currentViewId && (
              <Button
                variant="outline"
                onClick={handleUpdateCurrentView}
                disabled={!currentSavedView || upsertMutation.isPending}
                className="flex-1"
              >
                {upsertMutation.isPending ? 'Updating...' : 'Update Current'}
              </Button>
            )}
            <Button variant="default" onClick={() => setShowSaveDialog(true)} className="flex-1">
              Save Current
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        maxWidthClass="max-w-sm"
      >
        <div className="space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Save Current View</h2>
            <p className="mt-1 text-sm text-muted">
              Give your view a name to save the current filters, grouping, and displayed fields.
            </p>
          </div>

          <FormInputField
            id="view-name"
            label="View Name"
            placeholder="e.g., Active Members by Role"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setNewViewName('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNewView}
              disabled={!newViewName.trim() || upsertMutation.isPending}
              className="flex-1"
            >
              {upsertMutation.isPending ? 'Saving...' : 'Save View'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {canDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Saved View"
          description="Are you sure you want to delete this saved view? This action cannot be undone."
          confirmLabel="Delete"
          confirmLoadingLabel="Deleting..."
          confirmVariant="destructive"
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeleteViewId(null);
          }}
        />
      )}
    </>
  );
}
