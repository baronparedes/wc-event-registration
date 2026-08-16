import { useMemo, useState } from 'react';

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
  canUpdate?: boolean;
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
  canUpdate = true,
  canDelete = true,
}: SavedViewsModalProps) {
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteViewId, setDeleteViewId] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [viewFilter, setViewFilter] = useState('');

  const { data: savedViews = [] } = useAttendanceSavedViewsQuery(eventId);
  const upsertMutation = useUpsertAttendanceSavedViewMutation();
  const deleteMutation = useDeleteAttendanceSavedViewMutation();
  const sortedSavedViews = useMemo(
    () =>
      [...savedViews].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
      ),
    [savedViews],
  );
  const filteredSavedViews = useMemo(() => {
    const query = viewFilter.trim().toLowerCase();
    if (!query) return sortedSavedViews;

    return sortedSavedViews.filter((view) => view.name.toLowerCase().includes(query));
  }, [sortedSavedViews, viewFilter]);
  const groupedSavedViews = useMemo(() => {
    const groups = new Map<string, Array<{ id: string; name: string; created_at: string }>>();

    filteredSavedViews.forEach((view) => {
      const segments = view.name
        .split(' - ')
        .map((segment) => segment.trim())
        .filter(Boolean);

      const hasIdentifierSegments = segments.length > 1;
      const groupName = hasIdentifierSegments ? segments[0] : 'Views';
      const segmentedLeafName = hasIdentifierSegments ? segments.slice(1).join(' - ') : view.name;
      const leafName = segmentedLeafName || view.name;
      const currentGroup = groups.get(groupName) ?? [];

      currentGroup.push({
        id: view.id,
        name: leafName,
        created_at: view.created_at,
      });

      groups.set(groupName, currentGroup);
    });

    return Array.from(groups.entries())
      .sort(([leftGroupName], [rightGroupName]) =>
        leftGroupName.localeCompare(rightGroupName, undefined, { sensitivity: 'base' }),
      )
      .map(([groupName, views]) => ({
        groupName,
        views,
      }));
  }, [filteredSavedViews]);
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
      <Dialog
        isOpen={isOpen}
        onClose={() => onOpenChange(false)}
        maxWidthClass="max-w-3xl"
        title="Saved Views"
        description="Load a saved view or save the current configuration."
        showCloseIcon
      >
        <div className="flex max-h-[85vh] min-h-0 flex-col gap-4">
          {sortedSavedViews.length === 0 ? (
            <div className="rounded-md border border-border bg-surface p-4 text-center text-sm text-muted">
              <p>No saved views yet.</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <FormInputField
                id="saved-view-filter"
                label="Filter Views"
                placeholder="Type to filter saved views"
                value={viewFilter}
                onChange={(event) => setViewFilter(event.target.value)}
              />

              <div className="min-h-0 max-h-[52vh] flex-1 overflow-y-auto pr-1 sm:max-h-[60vh]">
                {filteredSavedViews.length === 0 ? (
                  <div className="rounded-md border border-border bg-surface p-4 text-center text-sm text-muted">
                    <p>No saved views match your filter.</p>
                  </div>
                ) : (
                  <div className="space-y-3" role="tree" aria-label="Saved views tree">
                    {groupedSavedViews.map((group) => (
                      <div
                        key={group.groupName}
                        className="rounded-md border border-border bg-surface"
                        role="treeitem"
                        aria-expanded="true"
                      >
                        <div className="border-b border-border px-3 py-2 text-sm font-semibold">
                          {group.groupName}
                        </div>
                        <div role="group">
                          {group.views.map((view) => (
                            <div
                              key={view.id}
                              className="flex flex-col gap-2 border-b border-border px-3 py-2 text-sm last:border-b-0 sm:flex-row sm:items-center sm:justify-between lg:pl-6"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium" title={view.name}>
                                  {view.name}
                                </p>
                                <p className="text-xs text-muted">
                                  {new Date(view.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                                <Button
                                  size="sm"
                                  variant="primaryOutline"
                                  onClick={() => handleApplyView(view.id)}
                                  className="text-xs px-2"
                                >
                                  Apply
                                </Button>
                                {canDelete && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteView(view.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primaryOutline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:flex-1"
            >
              Close
            </Button>
            {canUpdate && currentViewId && (
              <Button
                variant="primaryOutline"
                onClick={handleUpdateCurrentView}
                disabled={!currentSavedView || upsertMutation.isPending}
                className="w-full sm:flex-1"
              >
                {upsertMutation.isPending ? 'Updating...' : 'Update Current'}
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="default"
                onClick={() => setShowSaveDialog(true)}
                className="w-full sm:flex-1"
              >
                Save Current
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        maxWidthClass="max-w-sm"
        title="Save Current View"
        description="Give your view a name to save the current filters, grouping, and displayed fields."
        showCloseIcon
      >
        <div className="space-y-4">
          <FormInputField
            id="view-name"
            label="View Name"
            placeholder="e.g., Active Members by Role"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
          />

          <div className="flex gap-2">
            <Button
              variant="primaryOutline"
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
